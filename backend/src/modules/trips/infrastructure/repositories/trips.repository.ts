import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import type { PublishTripDto } from '../../dto/publish-trip.dto.js';
import { Viaje } from '../../domain/models/viaje.js';
const include = {
  stops: { orderBy: { position: 'asc' as const } },
  rules: { include: { rule: true } },
  destination: true,
  vehicle: { select: { plate: true, type: true } },
} as const;
type StoredTrip = Prisma.TripGetPayload<{ include: typeof include }>;
function present(trip: StoredTrip) {
  return {
    id: trip.id,
    driverId: trip.driverId,
    vehicleId: trip.vehicleId,
    vehicle: trip.vehicle,
    destination: {
      id: trip.destination.id,
      name: trip.destination.name,
      demo: trip.destination.demo,
    },
    origin: {
      label: trip.originLabel,
      latitude: Number(trip.originLatitude),
      longitude: Number(trip.originLongitude),
    },
    departureAt: trip.departureAt.toISOString(),
    expectedEndAt: trip.expectedEndAt.toISOString(),
    estimatedDurationMinutes: trip.estimatedDurationMinutes,
    offeredSeats: trip.offeredSeats,
    occupiedSeats: trip.occupiedSeats,
    availableSeats: trip.offeredSeats - trip.occupiedSeats,
    status: trip.status,
    occupancy: Viaje.ocupacion(trip.offeredSeats, trip.occupiedSeats),
    locationMode: trip.locationMode,
    providesHelmet: trip.providesHelmet,
    stops: trip.stops.map((stop) => ({
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
    save: async (data: PublishTripDto, end: Date, ruleIds: string[]) =>
      present(
        await tx.trip.create({
          data: {
            driverId,
            vehicleId: data.vehicleId,
            destinationId: data.destinationId,
            originLabel: data.origin.label,
            originLatitude: data.origin.latitude,
            originLongitude: data.origin.longitude,
            departureAt: new Date(data.departureAt),
            expectedEndAt: end,
            estimatedDurationMinutes: data.estimatedDurationMinutes,
            offeredSeats: data.offeredSeats,
            providesHelmet: data.providesHelmet ?? null,
            stops: { create: data.stops },
            rules: { create: ruleIds.map((ruleId) => ({ ruleId })) },
            events: { create: { actorId: driverId, type: 'PUBLISHED' } },
          },
          include,
        }),
      ),
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
  async listarPropios(driverId: string) {
    return (
      await this.db.trip.findMany({
        where: { driverId },
        include,
        orderBy: { departureAt: 'asc' },
      })
    ).map(present);
  }
  reglas() {
    return this.db.tripRuleDefinition.findMany({
      where: { active: true },
      select: { id: true, code: true, description: true },
      orderBy: { code: 'asc' },
    });
  }
}
