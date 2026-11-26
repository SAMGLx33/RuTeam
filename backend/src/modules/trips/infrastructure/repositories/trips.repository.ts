import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
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
export function presentItinerary(trip: StoredTrip): TripItinerary | null {
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
    startedAt: trip.startedAt?.toISOString() ?? null,
    finishedAt: trip.finishedAt?.toISOString() ?? null,
    estimatedDurationMinutes: trip.estimatedDurationMinutes,
    offeredSeats: trip.offeredSeats,
    occupiedSeats: trip.occupiedSeats,
    availableSeats: trip.offeredSeats - trip.occupiedSeats,
    status: trip.status,
    occupancy: Viaje.ocupacion(trip.offeredSeats, trip.occupiedSeats),
    locationMode: trip.locationMode,
    providesHelmet: trip.providesHelmet,
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
    overlaps: async (start: Date, end: Date) =>
      (await tx.trip.count({
        where: {
          driverId,
          status: { in: ['PROGRAMADO', 'EN_CURSO'] },
          departureAt: { lt: end },
          expectedEndAt: { gt: start },
        },
      })) > 0,
    save: async (
      data: PublishTripDto,
      end: Date,
      ruleIds: string[],
      itinerary: PlannedItinerary,
    ) => {
      const origin = itinerary.stops[0];
      return present(
        await tx.trip.create({
          data: {
            driverId,
            vehicleId: data.vehicleId,
            destinationId: itinerary.stops.at(-1)?.campusPointId,
            routeDescription: itinerary.description,
            routeGeometry: itinerary.geometry && {
              type: itinerary.geometry.type,
              coordinates: itinerary.geometry.coordinates,
            },
            routeDistanceMeters: itinerary.distanceMeters,
            originLabel: origin.label,
            originLatitude: origin.latitude,
            originLongitude: origin.longitude,
            departureAt: new Date(data.departureAt),
            expectedEndAt: end,
            estimatedDurationMinutes: data.estimatedDurationMinutes,
            offeredSeats: data.offeredSeats,
            providesHelmet: data.providesHelmet ?? null,
            stops: { create: itinerary.stops },
            rules: { create: ruleIds.map((ruleId) => ({ ruleId })) },
            events: { create: { actorId: driverId, type: 'PUBLISHED' } },
            recommendationJob: { create: {} },
          },
          include,
        }),
      );
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
    operation: (unit: PublicationUnit) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      // Serializa todas las publicaciones de un conductor; SQL parametrizado exclusivamente para locking.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${driverId}::uuid FOR UPDATE`;
      return operation(publicationUnit(tx, driverId));
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
