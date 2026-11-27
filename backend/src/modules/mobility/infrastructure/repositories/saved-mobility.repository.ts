import { Injectable, NotFoundException } from '@nestjs/common';
import type { FrequentPlaceInput } from '@ruteam/contracts';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { lockParticipationChanges } from '../../../reservations/infrastructure/participation-lock.js';
import { searchableInclude } from '../../../trips/infrastructure/repositories/trips.repository.js';

const savedInclude = { trip: { include: searchableInclude } } as const;
const frequentPlaceSelect = {
  id: true,
  kind: true,
  name: true,
  placeLabel: true,
  latitude: true,
  longitude: true,
} as const;
export type SavedTripRow = Prisma.SavedTripGetPayload<{
  include: typeof savedInclude;
}>;

@Injectable()
export class SavedMobilityRepository {
  constructor(private readonly db: PrismaService) {}

  async saved(userId: string) {
    const rows = await this.db.savedTrip.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { tripId: 'desc' }],
      include: savedInclude,
    });
    const confirmed = await this.db.reservationMember.findMany({
      where: {
        userId,
        reservation: {
          status: 'CONFIRMED',
          tripId: { in: rows.map(({ tripId }) => tripId) },
        },
      },
      select: { reservation: { select: { tripId: true } } },
    });
    return {
      rows,
      confirmed: new Set(
        confirmed.map(({ reservation }) => reservation.tripId),
      ),
    };
  }

  async withTrip<T>(
    tripId: string,
    run: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      await lockParticipationChanges(tx);
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: { driverId: true },
      });
      if (!trip) throw new NotFoundException('Viaje inexistente');
      await tx.$queryRaw`SELECT id FROM "User" WHERE id=${trip.driverId}::uuid FOR NO KEY UPDATE`;
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Trip" WHERE id=${tripId}::uuid FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Viaje inexistente');
      return run(tx);
    });
  }

  findSaved(tx: Prisma.TransactionClient, userId: string, tripId: string) {
    return tx.savedTrip.findUnique({
      where: { userId_tripId: { userId, tripId } },
      include: savedInclude,
    });
  }

  remove(userId: string, tripId: string) {
    return this.db.savedTrip.deleteMany({ where: { userId, tripId } });
  }

  cancelAlert(userId: string, tripId: string) {
    return this.db.savedTrip.updateMany({
      where: { userId, tripId },
      data: { alertRequestedAt: null },
    });
  }

  places(userId: string) {
    return this.db.frequentPlace.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: frequentPlaceSelect,
    });
  }

  createPlace(userId: string, input: FrequentPlaceInput) {
    return this.db.frequentPlace.create({
      data: { ...input, userId },
      select: frequentPlaceSelect,
    });
  }

  updatePlace(userId: string, id: string, input: FrequentPlaceInput) {
    return this.db.frequentPlace.updateManyAndReturn({
      where: { id, userId },
      data: input,
      select: frequentPlaceSelect,
    });
  }

  removePlace(userId: string, id: string) {
    return this.db.frequentPlace.deleteMany({ where: { id, userId } });
  }

  alertCandidates(now: Date) {
    return this.db.$queryRaw<{ userId: string; tripId: string }[]>`
      SELECT s."userId", s."tripId" FROM "SavedTrip" s JOIN "Trip" t ON t.id=s."tripId"
      WHERE s."alertRequestedAt" IS NOT NULL AND t.status='PROGRAMADO'
        AND t."departureAt">${now} AND t."expiredAt" IS NULL AND t."offeredSeats">t."occupiedSeats"
      ORDER BY s."alertRequestedAt", s."tripId", s."userId" LIMIT 50
    `;
  }
}
