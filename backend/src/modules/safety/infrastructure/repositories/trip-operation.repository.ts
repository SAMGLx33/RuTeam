import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class TripOperationRepository {
  constructor(private readonly db: PrismaService) {}
  context(tripId: string, actorId: string) {
    return this.db.trip.findFirst({
      where: {
        id: tripId,
        OR: [
          { driverId: actorId },
          {
            reservations: { some: { members: { some: { userId: actorId } } } },
          },
        ],
      },
      include: {
        driver: { select: { profile: { select: { displayName: true } } } },
        vehicle: { select: { brand: true, color: true, plate: true } },
        stops: { orderBy: { position: 'asc' } },
        // Passenger ownership remains in the predicate of this separate relation projection.
        reservations: {
          where: {
            OR: [
              { trip: { driverId: actorId } },
              { members: { some: { userId: actorId } } },
            ],
          },
          orderBy: [
            { confirmedAt: { sort: 'desc', nulls: 'last' } },
            { createdAt: 'desc' },
          ],
          select: {
            id: true,
            requesterId: true,
            pickupId: true,
            dropoffId: true,
            status: true,
            boardedAt: true,
            noShowAt: true,
            quantity: true,
          },
        },
        _count: {
          select: { pickupProposals: { where: { status: 'PENDING' } } },
        },
      },
    });
  }
}
