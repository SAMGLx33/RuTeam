import { Injectable } from '@nestjs/common';
import type { TripExpenseInput } from '@ruteam/contracts';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { ReservationsRepository } from '../../reservations/infrastructure/repositories/reservations.repository.js';

@Injectable()
export class ExpensesRepository {
  constructor(
    private readonly db: PrismaService,
    private readonly reservations: ReservationsRepository,
  ) {}

  ownedTrip(tripId: string, actorId: string) {
    return this.db.trip.findFirst({
      where: { id: tripId, driverId: actorId },
      select: { expenseEstimate: true, status: true },
    });
  }

  withTrip<T>(
    tripId: string,
    action: (
      trip: { driverId: string; status: string },
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
