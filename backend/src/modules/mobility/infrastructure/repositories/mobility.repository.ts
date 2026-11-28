import { participationCandidates } from '../../../institutional-membership/infrastructure/participation-candidates.js';
import { suppressedNotices } from '../../notifications/notification-preferences.js';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  ENVIRONMENT,
  type Environment,
} from '../../../../config/environment.js';
import type { RecommendationAccess } from '../../domain/mobility.policy.js';
import type { MobilityPreferenceDto } from '../../dto/mobility.dto.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import {
  searchableInclude,
  type TripCursor,
  type SearchableTrip,
} from '../../../trips/infrastructure/repositories/trips.repository.js';
import { localSchedule, pickupInstant } from '../../domain/mobility.policy.js';
import { tripDirection } from '../../../trips/domain/models/driver-route.js';
import { presentStops } from '../../../trips/infrastructure/repositories/trips.repository.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

const profileInclude = { campusPoint: true } as const;
function notificationTrip(actorId: string) {
  return {
    ...searchableInclude,
    reservations: {
      where: {
        status: 'CONFIRMED' as const,
        noShowAt: null,
        members: { some: { userId: actorId } },
      },
      select: { boardedAt: true },
    },
  };
}
export type StoredPreference = Prisma.MobilityPreferenceGetPayload<{
  include: typeof profileInclude;
}>;
export type ClaimedJob = {
  tripId: string;
  leaseUntil: Date;
  cursor: string | null;
  attempts: number;
};

function preferenceData(input: MobilityPreferenceDto) {
  return {
    ...input,
    label: input.label.trim(),
    placeLabel: input.placeLabel.trim(),
    campusPointId: input.campusPointId.toLowerCase(),
    maxContributionCop: input.maxContributionCop ?? null,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  };
}
function jobUnit(
  tx: Prisma.TransactionClient,
  job: ClaimedJob,
  access: RecommendationAccess,
) {
  return {
    trip: () =>
      tx.trip.findUnique({
        where: { id: job.tripId },
        include: searchableInclude,
      }),
    profiles: async (trip: SearchableTrip, now: Date) => {
      if (
        access.NODE_ENV === 'production' ||
        !access.demo ||
        access.VERIFICATION_PROVIDER !== 'demo'
      )
        return [];
      const stops = presentStops(trip);
      const direction = tripDirection(stops);
      const site = (direction === 'HACIA_USC' ? stops.at(-1) : stops[0])
        ?.campusSiteId;
      if (!direction || !site) return [];
      const instants = [trip.departureAt];
      if (direction === 'HACIA_USC') {
        for (const stop of stops.slice(1)) {
          if (stop.access !== 'PICKUP' && stop.access !== 'BOTH') continue;
          const instant = pickupInstant(trip.departureAt, stop);
          if (instant) instants.push(instant);
        }
      }
      const schedule = instants.map(localSchedule);
      return tx.mobilityPreference.findMany({
        where: {
          active: true,
          notificationsEnabled: true,
          direction,
          campusPointId: site,
          campusPoint: { active: true, kind: 'CAMPUS' },
          userId: { not: trip.driverId },
          OR: schedule.map(({ day, minute }) => ({
            days: { has: day },
            startMinute: { lte: minute },
            endMinute: { gte: minute },
          })),
          latitude: { not: null },
          longitude: { not: null },
          vehicleTypes: { has: trip.vehicle.type },
          user: participationCandidates(access, now),
          ...(job.cursor && { id: { gt: job.cursor } }),
        },
        include: profileInclude,
        orderBy: { id: 'asc' },
        take: 50,
      });
    },
    confirmedUsers: (ids: string[]) =>
      tx.reservationMember.findMany({
        where: {
          userId: { in: ids },
          reservation: { tripId: job.tripId, status: 'CONFIRMED' },
        },
        select: { userId: true },
      }),
    notify: async (recipientId: string, matchType: 'DIRECT' | 'POTENTIAL') => {
      await tx.tripNotification.createMany({
        data: [
          { recipientId, tripId: job.tripId, kind: 'TRIP_MATCH', matchType },
        ],
        skipDuplicates: true,
      });
      if (matchType === 'DIRECT')
        await tx.tripNotification.updateMany({
          where: {
            recipientId,
            tripId: job.tripId,
            kind: 'TRIP_MATCH',
            matchType: 'POTENTIAL',
          },
          data: { matchType: 'DIRECT' },
        });
    },
    finish: async (cursor: string | null, completed: boolean) => {
      const changed = await tx.recommendationJob.updateMany({
        where: {
          tripId: job.tripId,
          state: 'PROCESSING',
          leaseUntil: job.leaseUntil,
        },
        data: {
          cursor,
          state: completed ? 'COMPLETED' : 'PENDING',
          availableAt: new Date(),
          leaseUntil: null,
        },
      });
      if (!changed.count) throw new Error('RECOMMENDATION_LEASE_LOST');
    },
  };
}
export type JobUnit = ReturnType<typeof jobUnit>;

@Injectable()
export class MobilityRepository {
  constructor(
    private readonly db: PrismaService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  campus(id: string) {
    return this.db.campusDestination.findFirst({
      where: { id, active: true, kind: 'CAMPUS', campus: 'USC' },
    });
  }
  profiles(userId: string, activeOnly = false) {
    return this.db.mobilityPreference.findMany({
      where: {
        userId,
        ...(activeOnly && { active: true, campusPoint: { active: true } }),
      },
      include: profileInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    });
  }
  create(userId: string, input: MobilityPreferenceDto) {
    return this.db.mobilityPreference.create({
      data: { ...preferenceData(input), userId },
      include: profileInclude,
    });
  }
  update(userId: string, id: string, input: MobilityPreferenceDto) {
    return this.db.$transaction(async (tx) => {
      const changed = await tx.mobilityPreference.updateMany({
        where: { id, userId },
        data: preferenceData(input),
      });
      if (!changed.count)
        throw new NotFoundException('Preferencia inexistente');
      return tx.mobilityPreference.findUniqueOrThrow({
        where: { id },
        include: profileInclude,
      });
    });
  }
  async remove(userId: string, id: string) {
    const removed = await this.db.mobilityPreference.deleteMany({
      where: { id, userId },
    });
    if (!removed.count) throw new NotFoundException('Preferencia inexistente');
  }
  confirmedTrips(userId: string, tripIds: string[]) {
    return this.db.reservation.findMany({
      where: {
        tripId: { in: tripIds },
        status: 'CONFIRMED',
        members: { some: { userId } },
      },
      select: { tripId: true },
    });
  }
  async mayReadHistory(userId: string, tripId: string) {
    const [member, notification, saved] = await Promise.all([
      this.db.reservationMember.findFirst({
        where: { userId, reservation: { tripId } },
        select: { userId: true },
      }),
      this.db.tripNotification.findFirst({
        where: { recipientId: userId, tripId },
        select: { id: true },
      }),
      this.db.savedTrip.findUnique({
        where: { userId_tripId: { userId, tripId } },
        select: { userId: true },
      }),
    ]);
    return !!member || !!notification || !!saved;
  }
  async notifications(recipientId: string, cursor?: TripCursor) {
    const user = await this.db.user.findUnique({
      where: { id: recipientId },
      select: { notificationPreferences: true },
    });
    return this.db.tripNotification.findMany({
      where: {
        recipientId,
        kind: { notIn: suppressedNotices(user?.notificationPreferences) },
        ...(cursor && {
          OR: [
            { createdAt: { lt: cursor.departureAt } },
            { createdAt: cursor.departureAt, id: { lt: cursor.id } },
          ],
        }),
      },
      include: { trip: { include: notificationTrip(recipientId) } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 21,
    });
  }
  async markRead(recipientId: string, id: string) {
    const row = await this.db.tripNotification.findFirst({
      where: { id, recipientId },
      select: { id: true },
    });
    if (!row) throw new NotFoundException('Notificación inexistente');
    await this.db.tripNotification.updateMany({
      where: { id, recipientId, readAt: null },
      data: { readAt: new Date() },
    });
    return this.db.tripNotification.findUniqueOrThrow({
      where: { id },
      include: { trip: { include: notificationTrip(recipientId) } },
    });
  }
  async backfillJobs() {
    const trips = await this.db.trip.findMany({
      where: {
        status: 'PROGRAMADO',
        departureAt: { gt: new Date() },
        routeDescription: { not: null },
        recommendationJob: null,
      },
      select: { id: true },
      orderBy: [{ departureAt: 'asc' }, { id: 'asc' }],
      take: 50,
    });
    if (trips.length)
      await this.db.recommendationJob.createMany({
        data: trips.map(({ id }) => ({ tripId: id })),
        skipDuplicates: true,
      });
    return trips.length < 50;
  }
  claim(): Promise<ClaimedJob | null> {
    return this.db.$transaction(async (tx) => {
      const now = new Date();
      const rows = await tx.$queryRaw<
        { tripId: string }[]
      >`SELECT "tripId" FROM "RecommendationJob" WHERE ("state"='PENDING' AND "availableAt"<=${now}) OR ("state"='PROCESSING' AND "leaseUntil"<=${now}) ORDER BY "availableAt","tripId" FOR UPDATE SKIP LOCKED LIMIT 1`;
      if (!rows[0]) return null;
      return tx.recommendationJob.update({
        where: { tripId: rows[0].tripId },
        data: {
          state: 'PROCESSING',
          leaseUntil: new Date(now.getTime() + 30000),
        },
        select: {
          tripId: true,
          leaseUntil: true,
          cursor: true,
          attempts: true,
        },
      }) as Promise<ClaimedJob>;
    });
  }
  withJob<T>(
    job: ClaimedJob,
    operation: (unit: JobUnit) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: job.tripId },
        select: { driverId: true },
      });
      if (!trip) throw new NotFoundException('Viaje inexistente');
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${trip.driverId}::uuid FOR NO KEY UPDATE`;
      await tx.$queryRaw`SELECT id FROM "Trip" WHERE id=${job.tripId}::uuid FOR UPDATE`;
      return operation(jobUnit(tx, job, this.env));
    });
  }
  async retry(job: ClaimedJob) {
    await this.db.recommendationJob.updateMany({
      where: {
        tripId: job.tripId,
        state: 'PROCESSING',
        leaseUntil: job.leaseUntil,
      },
      data: {
        state: 'PENDING',
        leaseUntil: null,
        attempts: { increment: 1 },
        availableAt: new Date(
          Date.now() + Math.min(60000, 1000 * 2 ** Math.min(job.attempts, 6)),
        ),
      },
    });
  }
}
