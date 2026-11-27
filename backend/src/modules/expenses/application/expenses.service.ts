import {
  ConflictException,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import type { TripExpenseEstimate, TripExpenseInput } from '@ruteam/contracts';
import { AuthService } from '../../auth/application/auth.service.js';
import type { TripEconomicsPreviewDto } from '../dto/expense.dto.js';
import { calculateEconomics, expenseTotal } from '../domain/expense-policy.js';
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
  constructor(
    private readonly repository: ExpensesRepository,
    private readonly auth: AuthService,
  ) {}

  async preview(actorId: string, input: TripEconomicsPreviewDto) {
    const user = await this.auth.currentUser(actorId);
    if (!user.capabilities.driver)
      throw new ForbiddenException('Conducción no habilitada');
    return calculateEconomics(input.offeredSeats, input.economics);
  }

  async detail(tripId: string, actorId: string) {
    const trip = await this.repository.ownedTrip(tripId, actorId);
    if (!trip) throw new NotFoundException('Estimación de viaje no disponible');
    return {
      estimate: trip.expenseEstimate ? present(trip.expenseEstimate) : null,
      editable: trip.status === 'PROGRAMADO' && !trip.suggestedContributionCop,
    };
  }

  save(tripId: string, actorId: string, input: TripExpenseInput) {
    return this.repository.withTrip(tripId, async (trip, write) => {
      if (trip.driverId !== actorId)
        throw new NotFoundException('Estimación de viaje no disponible');
      if (trip.status !== 'PROGRAMADO' || trip.suggestedContributionCop)
        throw new ConflictException(
          'La estimación sólo se edita antes de iniciar y cuando el aporte es cero o no fue publicado',
        );
      return present(await write(input));
    });
  }
}
