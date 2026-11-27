import { Injectable, NotFoundException } from '@nestjs/common';
import type { CompensationMethod, TripExpenseInput } from '@ruteam/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { ReservationsRepository } from '../../reservations/infrastructure/repositories/reservations.repository.js';

import type { Prisma } from '../../../generated/prisma/client.js';
import { recordTripNotice } from '../../mobility/infrastructure/trip-notices.js';

@Injectable()
export class ExpensesRepository {
  constructor(
    private readonly db: PrismaService,
    private readonly reservations: ReservationsRepository,
  ) {}

  ownedTrip(tripId: string, actorId: string) {
    return this.db.trip.findFirst({
      where: { id: tripId, driverId: actorId },
      select: {
        expenseEstimate: true,
        status: true,
        suggestedContributionCop: true,
      },
    });
  }

  async compensation(id: string, actorId: string) {
    const row = await this.db.reservation.findFirst({
      where: {
        id,
        OR: [{ requesterId: actorId }, { trip: { driverId: actorId } }],
      },
      include: { trip: true, compensation: true },
    });
    if (!row) throw new NotFoundException('Compensación no disponible');
    return row;
  }

  async withCompensation<T>(
    id: string,
    actorId: string,
    action: (unit: CompensationUnit) => Promise<T> | T,
  ) {
    const { tripId } = await this.compensation(id, actorId);
    return this.reservations.withTripLock(tripId, async (_unit, tx) => {
      const row = await tx.reservation.findFirst({
        where: { id, tripId },
        include: { trip: true, compensation: true },
      });
      if (!row) throw new NotFoundException('Compensación no disponible');
      return action(compensationUnit(tx, row));
    });
  }

  withTrip<T>(
    tripId: string,
    action: (
      trip: {
        driverId: string;
        status: string;
        suggestedContributionCop: number | null;
      },
      save: (
        input: TripExpenseInput,
      ) => Promise<TripExpenseInput & { updatedAt: Date }>,
    ) => Promise<T>,
  ) {
    return this.reservations.withTripLock(tripId, async (unit, tx) => {
      const trip = await unit.trip();
      return action(trip, (input) =>
        tx.tripExpenseEstimate.upsert({
          where: { tripId },
          create: { tripId, ...input },
          update: input,
        }),
      );
    });
  }
}

type CompensationRow = Prisma.ReservationGetPayload<{
  include: { trip: true; compensation: true };
}>;

function compensationUnit(tx: Prisma.TransactionClient, row: CompensationRow) {
  return {
    row,
    declare: async (method: CompensationMethod, amountCop: number) => {
      row.compensation = await tx.tripCompensation.create({
        data: { reservationId: row.id, method, amountCop },
      });
      await recordTripNotice(
        tx,
        row.tripId,
        'COMPENSATION_DECLARED',
        [row.trip.driverId],
        row.id,
      );
    },
    resolve: async (status: 'ACKNOWLEDGED' | 'DISPUTED' | 'CANCELLED') => {
      row.compensation = await tx.tripCompensation.update({
        where: { reservationId: row.id },
        data: { status, resolvedAt: new Date() },
      });
      if (status === 'ACKNOWLEDGED' || status === 'DISPUTED')
        await recordTripNotice(
          tx,
          row.tripId,
          status === 'ACKNOWLEDGED'
            ? 'COMPENSATION_ACKNOWLEDGED'
            : 'COMPENSATION_DISPUTED',
          [row.requesterId],
          row.id,
        );
    },
  };
}

export type CompensationUnit = ReturnType<typeof compensationUnit>;
