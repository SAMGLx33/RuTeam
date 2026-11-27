import { Injectable } from '@nestjs/common';
import type { RatingCapacity, SubmittedRating } from '@ruteam/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { ReservationsRepository } from '../../reservations/infrastructure/repositories/reservations.repository.js';
import { emptyReputation, reputationsByRole } from './reputation.read.js';

const boarded = {
  status: 'CONFIRMED',
  quantity: 1,
  boardedAt: { not: null },
  noShowAt: null,
} as const satisfies Prisma.ReservationWhereInput;

function tripSelection(actorId: string) {
  return {
    id: true,
    status: true,
    driverId: true,
    driver: { select: { profile: { select: { displayName: true } } } },
    originLabel: true,
    finishedAt: true,
    events: {
      where: { type: 'COMPLETADO' },
      select: { createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 1,
    },
    stops: { select: { label: true }, orderBy: { position: 'desc' }, take: 1 },
    reservations: {
      where: boarded,
      select: {
        requesterId: true,
        requester: { select: { profile: { select: { displayName: true } } } },
      },
    },
    ratings: {
      where: { raterId: actorId },
      select: { rateeId: true, stars: true, comment: true, createdAt: true },
    },
  } as const satisfies Prisma.TripSelect;
}

function selectTrip(
  db: Pick<PrismaService, 'trip'>,
  id: string,
  actorId: string,
) {
  return db.trip.findUnique({ where: { id }, select: tripSelection(actorId) });
}

export type RatedTrip = NonNullable<Awaited<ReturnType<typeof selectTrip>>>;

export function presentSubmitted(row: {
  stars: number;
  comment: string | null;
  createdAt: Date;
}): SubmittedRating {
  return {
    stars: row.stars,
    comment: row.comment,
    createdAt: row.createdAt.toISOString(),
  };
}

@Injectable()
export class RatingsRepository {
  constructor(
    private readonly db: PrismaService,
    private readonly reservations: ReservationsRepository,
  ) {}

  findTrip(id: string, actorId: string) {
    return selectTrip(this.db, id, actorId);
  }

  completedTrips(actorId: string, cursor?: string) {
    return this.db.trip.findMany({
      where: {
        status: 'COMPLETADO',
        OR: [
          { driverId: actorId, reservations: { some: boarded } },
          { reservations: { some: { ...boarded, requesterId: actorId } } },
        ],
      },
      select: tripSelection(actorId),
      orderBy: [{ departureAt: 'desc' }, { id: 'desc' }],
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
      take: 21,
    });
  }

  summaries(actorId: string) {
    const roles = ['DRIVER', 'PASSENGER'] as const;
    return Promise.all(
      roles.map(
        async (capacity) =>
          (await reputationsByRole(this.db, [actorId], capacity)).get(
            actorId,
          ) ?? emptyReputation(capacity),
      ),
    );
  }

  withTrip<T>(
    tripId: string,
    actorId: string,
    action: (
      trip: RatedTrip,
      unit: {
        membership: () => ReturnType<
          import('../../reservations/infrastructure/repositories/reservations.repository.js').ReservationUnit['memberships']
        >;
        submit: (
          rateeId: string,
          capacity: RatingCapacity,
          stars: number,
          comment: string | null,
        ) => Promise<SubmittedRating | null>;
      },
    ) => Promise<T>,
  ) {
    return this.reservations.withTripLock(tripId, async (reservations, tx) => {
      const trip = await selectTrip(tx, tripId, actorId);
      if (!trip) throw new Error('Viaje no disponible dentro del bloqueo');
      return action(trip, {
        membership: () => reservations.memberships([actorId]),
        submit: async (rateeId, capacity, stars, comment) => {
          const createdAt = new Date();
          const saved = await tx.tripRating.createMany({
            data: [
              {
                tripId,
                raterId: actorId,
                rateeId,
                capacity,
                stars,
                comment,
                createdAt,
              },
            ],
            skipDuplicates: true,
          });
          return saved.count
            ? presentSubmitted({ stars, comment, createdAt })
            : null;
        },
      });
    });
  }
}
