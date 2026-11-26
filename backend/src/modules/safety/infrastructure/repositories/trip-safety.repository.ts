import { Injectable } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';

export function activeTripVisibleTo(
  tripId: string,
  actorId: string,
): Prisma.TripWhereInput {
  return {
    id: tripId,
    status: 'EN_CURSO',
    OR: [
      { driverId: actorId },
      {
        reservations: {
          some: {
            status: 'CONFIRMED',
            noShowAt: null,
            members: { some: { userId: actorId } },
          },
        },
      },
    ],
  };
}

@Injectable()
export class TripSafetyRepository {
  constructor(private readonly db: PrismaService) {}

  activeTripVisibleTo(tripId: string, actorId: string) {
    return this.db.trip.findFirst({
      where: activeTripVisibleTo(tripId, actorId),
      select: {
        departureAt: true,
        startedAt: true,
        stops: {
          orderBy: { position: 'asc' },
          select: {
            label: true,
            campus: true,
            campusPointId: true,
            reachedAt: true,
            estimatedOffsetSeconds: true,
          },
        },
      },
    });
  }
}
