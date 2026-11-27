import { Injectable } from '@nestjs/common';
import { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { MobilityAlternative } from '../../domain/emissions.js';

const select = (userId: string) =>
  ({
    id: true,
    driverId: true,
    environmentSnapshot: true,
    finishedAt: true,
    departureAt: true,
    routeDistanceMeters: true,
    reservations: {
      where: traveler(userId),
      select: {
        id: true,
        requesterId: true,
        quantity: true,
        mobilityAlternative: true,
      },
      take: 1,
    },
  }) as const;

const traveler = (userId: string) =>
  ({
    status: 'CONFIRMED',
    boardedAt: { not: null },
    noShowAt: null,
    members: { some: { userId } },
  }) as const;

export type EnvironmentRow = Prisma.TripGetPayload<{
  select: ReturnType<typeof select>;
}>;

@Injectable()
export class EnvironmentRepository {
  constructor(private readonly db: PrismaService) {}

  summary(userId: string, from: Date) {
    return this.db.trip.findMany({
      where: {
        status: 'COMPLETADO',
        AND: [
          {
            OR: [
              { finishedAt: { gte: from } },
              { finishedAt: null, departureAt: { gte: from } },
            ],
          },
          {
            OR: [
              { driverId: userId },
              { reservations: { some: traveler(userId) } },
            ],
          },
        ],
      },
      select: select(userId),
    });
  }

  trip(userId: string, id: string) {
    return this.db.trip.findFirst({
      where: {
        id,
        status: 'COMPLETADO',
        OR: [
          { driverId: userId },
          { reservations: { some: traveler(userId) } },
        ],
      },
      select: select(userId),
    });
  }

  async recordAlternative(
    userId: string,
    tripId: string,
    alternative: MobilityAlternative,
  ) {
    const updated = await this.db.reservation.updateMany({
      where: {
        ...traveler(userId),
        tripId,
        requesterId: userId,
        quantity: 1,
        trip: { status: 'COMPLETADO' },
      },
      data: {
        mobilityAlternative:
          alternative.mode === 'UNSPECIFIED'
            ? Prisma.DbNull
            : (alternative as unknown as Prisma.InputJsonObject),
      },
    });
    return updated.count > 0;
  }
}
