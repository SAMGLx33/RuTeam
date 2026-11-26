import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TripExpenseEstimate, TripExpenseInput } from '@ruteam/contracts';
import { expenseTotal } from '../domain/expense-policy.js';
import { ExpensesRepository } from '../infrastructure/expenses.repository.js';

function present(
  row: TripExpenseInput & { updatedAt: Date },
): TripExpenseEstimate {
  return {
    fuelCop: row.fuelCop,
    tollsCop: row.tollsCop,
    parkingCop: row.parkingCop,
    updatedAt: row.updatedAt.toISOString(),
    totalCop: expenseTotal(row),
  };
}

@Injectable()
export class ExpensesService {
  constructor(private readonly repository: ExpensesRepository) {}

  async detail(tripId: string, actorId: string) {
    const trip = await this.repository.ownedTrip(tripId, actorId);
    if (!trip) throw new NotFoundException('Estimación de viaje no disponible');
    return {
      estimate: trip.expenseEstimate ? present(trip.expenseEstimate) : null,
      editable: trip.status === 'PROGRAMADO',
    };
  }

  save(tripId: string, actorId: string, input: TripExpenseInput) {
    return this.repository.withTrip(tripId, async (trip, write) => {
      if (trip.driverId !== actorId)
        throw new NotFoundException('Estimación de viaje no disponible');
      if (trip.status !== 'PROGRAMADO')
        throw new ConflictException('Sólo se edita antes de iniciar el viaje');
      return present(await write(input));
    });
  }
}
