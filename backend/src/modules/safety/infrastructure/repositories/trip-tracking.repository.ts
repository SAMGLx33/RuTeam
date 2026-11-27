import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { activeTripVisibleTo } from './trip-safety.repository.js';

interface DriverFix {
  latitude: number;
  longitude: number;
  capturedAt: Date;
  sharedAt: Date;
}

interface PositionUnit {
  last(): Promise<{ sharedAt: Date; capturedAt: Date } | null>;
  save(data: DriverFix): Promise<void>;
  clear(): Promise<void>;
}

@Injectable()
export class TripTrackingRepository {
  constructor(private readonly db: PrismaService) {}

  forActiveParticipant(tripId: string, actorId: string) {
    return this.db.trip.findFirst({
      where: activeTripVisibleTo(tripId, actorId),
      select: {
        driverId: true,
        trackingSharedAt: true,
        driverPosition: {
          select: {
            latitude: true,
            longitude: true,
            capturedAt: true,
            sharedAt: true,
          },
        },
        routeGeometry: true,
        stops: {
          orderBy: { position: 'asc' },
          select: { latitude: true, longitude: true },
        },
      },
    });
  }

  endedForParticipant(tripId: string, actorId: string) {
    return this.db.trip.findFirst({
      where: {
        id: tripId,
        status: { in: ['COMPLETADO', 'INTERRUMPIDO'] },
        OR: [
          { driverId: actorId },
          {
            reservations: {
              some: {
                status: 'CONFIRMED',
                boardedAt: { not: null },
                members: { some: { userId: actorId } },
              },
            },
          },
        ],
      },
      select: { id: true },
    });
  }

  withActiveDriverLock<T>(
    tripId: string,
    actorId: string,
    operation: (unit: PositionUnit) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      const driverTrip = await tx.trip.findFirst({
        where: { id: tripId, driverId: actorId, status: 'EN_CURSO' },
        select: { id: true },
      });
      if (!driverTrip)
        throw new NotFoundException(
          'No tienes un viaje en curso con ese identificador',
        );
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${actorId}::uuid FOR NO KEY UPDATE`;
      const active = await tx.$queryRaw<{ id: string }[]>`
        SELECT id FROM "Trip"
        WHERE id = ${tripId}::uuid AND "driverId" = ${actorId}::uuid AND "status" = 'EN_CURSO'
        FOR UPDATE`;
      if (!active.length)
        throw new NotFoundException(
          'No tienes un viaje en curso con ese identificador',
        );
      return operation({
        last: () =>
          tx.tripDriverPosition.findUnique({
            where: { tripId },
            select: { sharedAt: true, capturedAt: true },
          }),
        save: async (data) => {
          await tx.tripDriverPosition.upsert({
            where: { tripId },
            create: { tripId, ...data },
            update: data,
          });
          await tx.trip.update({
            where: { id: tripId },
            data: { trackingSharedAt: data.sharedAt },
          });
        },
        clear: async () => {
          await tx.tripDriverPosition.deleteMany({ where: { tripId } });
          await tx.trip.update({
            where: { id: tripId },
            data: { trackingSharedAt: null },
          });
        },
      });
    });
  }

  purgeExpired(cutoff: Date) {
    return this.db.tripDriverPosition.deleteMany({
      where: {
        OR: [{ sharedAt: { lte: cutoff } }, { capturedAt: { lte: cutoff } }],
      },
    });
  }
}
