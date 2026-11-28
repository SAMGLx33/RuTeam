import { Prisma } from '../../../../generated/prisma/client.js';
import { recordTripNotice } from '../../../mobility/infrastructure/trip-notices.js';
import { requeueRecommendation } from '../../../mobility/infrastructure/repositories/requeue-recommendation.js';
import { hasActivityConflict } from '../student-schedule.js';
import { lockParticipationChanges } from '../../../reservations/infrastructure/participation-lock.js';
import type { EmissionInput } from '../../../mobility/domain/emissions.js';
import type { TripEconomicsPreview } from '@ruteam/contracts';
import { publicEconomicTerms } from '../../../expenses/domain/expense-policy.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { PublishTripDto } from '../../dto/publish-trip.dto.js';
import type {
  AvailableTrip,
  RouteGeometry,
  RouteStop,
  TripItinerary,
  TripSummary,
} from '@ruteam/contracts';
import type { PlannedItinerary } from '../../application/plan-itinerary.js';
import { tripDirection } from '../../domain/models/driver-route.js';
import { Viaje } from '../../domain/models/viaje.js';
import {
  emptyReputation,
  reputationsByRole,
} from '../../../ratings/infrastructure/reputation.read.js';
const include = {
  stops: { orderBy: { position: 'asc' as const } },
  rules: { include: { rule: true } },
  destination: true,
  _count: {
    select: {
      reservations: true,
      pickupProposals: true,
      participationGroups: true,
    },
  },
  vehicle: { select: { plate: true, type: true } },
} as const;
type StoredTrip = Prisma.TripGetPayload<{ include: typeof include }>;
export function presentStops(trip: Pick<StoredTrip, 'stops'>): RouteStop[] {
  return trip.stops.map((stop) => ({
    id: stop.id,
    position: stop.position,
    label: stop.label,
    latitude: Number(stop.latitude),
    longitude: Number(stop.longitude),
    access: stop.access,
    campusPointId: stop.campusPointId,
    campusSiteId: stop.campusSiteId,
    estimatedOffsetSeconds: stop.estimatedOffsetSeconds,
    reachedAt: stop.reachedAt?.toISOString() ?? null,
    campus: stop.campus,
    instructions: stop.instructions,
  }));
}
export function presentItinerary(
  trip: Pick<
    StoredTrip,
    'stops' | 'routeGeometry' | 'routeDescription' | 'routeDistanceMeters'
  >,
): TripItinerary | null {
  if (!trip.routeDescription) return null;
  const stops = presentStops(trip);
  return {
    direction: tripDirection(stops),
    stops,
    description: trip.routeDescription,
    geometry: trip.routeGeometry as RouteGeometry | null,
    distanceMeters: trip.routeDistanceMeters,
  };
}
function present(trip: StoredTrip): TripSummary {
  const itinerary = presentItinerary(trip);
  const destination = itinerary?.stops.at(-1);
  return {
    id: trip.id,
    driverId: trip.driverId,
    vehicleId: trip.vehicleId,
    vehicle: trip.vehicle,
    destination: {
      id: trip.destinationId,
      name:
        destination?.label ?? trip.destination?.name ?? 'Destino sin nombre',
      demo: trip.destination?.demo ?? true,
    },
    itinerary,
    origin: {
      label: trip.originLabel,
      latitude: Number(trip.originLatitude),
      longitude: Number(trip.originLongitude),
    },
    departureAt: trip.departureAt.toISOString(),
    expectedEndAt: trip.expectedEndAt.toISOString(),
    estimatedDepartureAt: trip.estimatedDepartureAt?.toISOString() ?? null,
    expiredAt: trip.expiredAt?.toISOString() ?? null,
    version: trip.version,
    canEdit:
      trip.status === 'PROGRAMADO' &&
      !trip.expiredAt &&
      trip.departureAt > new Date(),
    descriptiveEditsOnly: Object.values(trip._count).some((count) => count > 0),
    startedAt: trip.startedAt?.toISOString() ?? null,
    finishedAt: trip.finishedAt?.toISOString() ?? null,
    estimatedDurationMinutes: trip.estimatedDurationMinutes,
    offeredSeats: trip.offeredSeats,
    occupiedSeats: trip.occupiedSeats,
    availableSeats: trip.offeredSeats - trip.occupiedSeats,
    status: trip.status,
    terminationReason: trip.terminationReason,
    occupancy: Viaje.ocupacion(trip.offeredSeats, trip.occupiedSeats),
    locationMode: trip.locationMode,
    providesHelmet: trip.providesHelmet,
    economics: publicEconomicTerms(trip),
    stops: trip.stops
      .filter(
        (stop) =>
          !itinerary || (stop.position > 0 && stop.id !== destination?.id),
      )
      .map((stop) => ({
        position: stop.position,
        label: stop.label,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
      })),
    rules: trip.rules.map((selection) => ({
      id: selection.rule.id,
      code: selection.rule.code,
      description: selection.rule.description,
    })),
  };
}
function publicationUnit(tx: Prisma.TransactionClient, driverId: string) {
  return {
    actor: () =>
      tx.user.findUnique({
        where: { id: driverId },
        include: { membership: true, driverEligibility: true },
      }),
    vehicle: (id: string) =>
      tx.vehicle.findUnique({ where: { id }, include: { document: true } }),
    destination: (id: string) =>
      tx.campusDestination.findUnique({ where: { id } }),
    rules: (ids: string[]) =>
      tx.tripRuleDefinition.findMany({
        where: ids.length
          ? { id: { in: ids }, active: true }
          : { code: 'DEFAULT', active: true },
      }),
    overlaps: (start: Date, end: Date, excludedTripId?: string) =>
      hasActivityConflict(tx, driverId, { start, end }, excludedTripId),
    editable: async (id: string) => {
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Trip" WHERE id = ${id}::uuid AND "driverId" = ${driverId}::uuid FOR UPDATE
      `;
      if (!locked.length) return null;
      return tx.trip.findUnique({
        where: { id },
        include,
      });
    },
    describe: async (id: string, description: string) => {
      const trip = await tx.trip.update({
        where: { id },
        data: {
          routeDescription: description,
          version: { increment: 1 },
          events: { create: { actorId: driverId, type: 'TRIP_EDITED' } },
        },
        include,
      });
      const members = await tx.reservationMember.findMany({
        where: { reservation: { tripId: id, status: 'CONFIRMED' } },
        select: { userId: true },
      });
      await recordTripNotice(
        tx,
        id,
        'TRIP_EDITED',
        members.map(({ userId }) => userId),
        String(trip.version),
      );
      await requeueRecommendation(tx, id);
      return present(trip);
    },
    save: async (
      data: PublishTripDto,
      end: Date,
      ruleIds: string[],
      itinerary: PlannedItinerary,
      economics: TripEconomicsPreview,
      energy: EmissionInput | null,
      existingId?: string,
    ) => {
      const origin = itinerary.stops[0];
      const fields = {
        driverId,
        environmentInput: energy
          ? (energy as unknown as Prisma.InputJsonObject)
          : Prisma.DbNull,
        vehicleId: data.vehicleId,
        destinationId: itinerary.stops.at(-1)?.campusPointId,
        routeDescription: itinerary.description,
        routeGeometry: itinerary.geometry
          ? {
              type: itinerary.geometry.type,
              coordinates: itinerary.geometry.coordinates,
            }
          : Prisma.DbNull,
        routeManeuvers: itinerary.maneuvers
          ? (itinerary.maneuvers as unknown as Prisma.InputJsonArray)
          : Prisma.DbNull,
        routeDistanceMeters: itinerary.distanceMeters ?? null,
        originLabel: origin.label,
        originLatitude: origin.latitude,
        originLongitude: origin.longitude,
        departureAt: new Date(data.departureAt),
        expectedEndAt: end,
        estimatedDurationMinutes: data.estimatedDurationMinutes,
        offeredSeats: data.offeredSeats,
        suggestedContributionCop: economics.suggestedContributionCop,
        compensationMethods: economics.compensationMethods,
        providesHelmet: data.providesHelmet ?? null,
      };
      const stops = { create: itinerary.stops };
      const rules = { create: ruleIds.map((ruleId) => ({ ruleId })) };
      if (!existingId)
        return present(
          await tx.trip.create({
            data: {
              ...fields,
              stops,
              rules,
              expenseEstimate: economics.estimate
                ? { create: economics.estimate }
                : undefined,
              events: { create: { actorId: driverId, type: 'PUBLISHED' } },
              recommendationJob: { create: {} },
            },
            include,
          }),
        );
      await tx.tripStop.deleteMany({ where: { tripId: existingId } });
      await tx.tripRuleSelection.deleteMany({ where: { tripId: existingId } });
      await tx.tripExpenseEstimate.deleteMany({
        where: { tripId: existingId },
      });
      const trip = await tx.trip.update({
        where: { id: existingId },
        data: {
          ...fields,
          stops,
          rules,
          estimatedDepartureAt: null,
          version: { increment: 1 },
          expenseEstimate: economics.estimate
            ? { create: economics.estimate }
            : undefined,
          events: { create: { actorId: driverId, type: 'TRIP_EDITED' } },
        },
        include,
      });
      await requeueRecommendation(tx, existingId);
      return present(trip);
    },
  };
}
export const searchableInclude = {
  ...include,
  driver: {
    include: { membership: true, driverEligibility: true, profile: true },
  },
  vehicle: { include: { document: true } },
} as const;
export type SearchableTrip = Prisma.TripGetPayload<{
  include: typeof searchableInclude;
}>;
export type TripCursor = { departureAt: Date; id: string };

export function presentAvailable(
  trip: SearchableTrip,
  match: AvailableTrip['match'],
): AvailableTrip {
  return {
    id: trip.id,
    driverName: trip.driver.profile?.displayName ?? null,
    driverReputation: emptyReputation('DRIVER'),
    vehicle: {
      type: trip.vehicle.type,
      brand: trip.vehicle.brand,
      color: trip.vehicle.color,
    },
    departureAt: trip.departureAt.toISOString(),
    estimatedDurationMinutes: trip.estimatedDurationMinutes,
    availableSeats: trip.offeredSeats - trip.occupiedSeats,
    providesHelmet: trip.providesHelmet,
    economics: publicEconomicTerms(trip),
    itinerary: presentItinerary(trip)!,
    rules: trip.rules.map(({ rule }) => ({
      id: rule.id,
      code: rule.code,
      description: rule.description,
    })),
    match,
  };
}

export type PublicationUnit = ReturnType<typeof publicationUnit>;
@Injectable()
export class ViajeRepository {
  constructor(private readonly db: PrismaService) {}
  async withDriverLock<T>(
    driverId: string,
    operation: (
      unit: PublicationUnit,
      tx: Prisma.TransactionClient,
    ) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      await lockParticipationChanges(tx, true);
      // Serializa todas las publicaciones de un conductor; SQL parametrizado exclusivamente para locking.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${driverId}::uuid FOR NO KEY UPDATE`;
      return operation(publicationUnit(tx, driverId), tx);
    });
  }
  async attachDriverReputations<T>(
    rows: readonly { driverId: string; card: T }[],
  ) {
    const reputation = await reputationsByRole(
      this.db,
      rows.map(({ driverId }) => driverId),
      'DRIVER',
    );
    return rows.map(({ driverId, card }) => ({
      ...card,
      driverReputation: reputation.get(driverId) ?? emptyReputation('DRIVER'),
    }));
  }
  async listarPropios(driverId: string) {
    return (
      await this.db.trip.findMany({
        where: { driverId },
        include,
        orderBy: { departureAt: 'asc' },
      })
    ).map(present);
  }
  recommendationTrip(id: string) {
    return this.db.trip.findUnique({
      where: { id },
      include: searchableInclude,
    });
  }
  searchCandidates({
    now,
    after,
    before,
    seats,
    actorId,
    cursor,
  }: {
    now: Date;
    after?: Date;
    before?: Date;
    seats: number;
    actorId: string;
    cursor?: TripCursor;
  }) {
    return this.db.trip.findMany({
      where: {
        status: 'PROGRAMADO',
        driverId: { not: actorId },
        routeDescription: { not: null },
        departureAt: { gt: now, gte: after, lt: before },
        offeredSeats: { gte: seats },
        ...(cursor && {
          OR: [
            { departureAt: { gt: cursor.departureAt } },
            { departureAt: cursor.departureAt, id: { gt: cursor.id } },
          ],
        }),
      },
      include: searchableInclude,
      orderBy: [{ departureAt: 'asc' }, { id: 'asc' }],
      take: 50,
    });
  }
  reglas() {
    return this.db.tripRuleDefinition.findMany({
      where: { active: true },
      select: { id: true, code: true, description: true },
      orderBy: { code: 'asc' },
    });
  }
}
