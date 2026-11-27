import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { CompensationsService } from './application/compensations.service.js';
import { ExpensesService } from './application/expenses.service.js';
import { ExpensesController } from './controllers/expenses.controller.js';
import { ExpensesRepository } from './infrastructure/expenses.repository.js';

import { EconomicHistoryController } from './controllers/economic-history.controller.js';
import { EconomicHistoryService } from './application/economic-history.service.js';
import { EconomicHistoryRepository } from './infrastructure/economic-history.repository.js';
@Module({
  imports: [AuthModule, ReservationsModule],
  providers: [
    ExpensesService,
    ExpensesRepository,
    CompensationsService,
    EconomicHistoryService,
    EconomicHistoryRepository,
  ],
  controllers: [ExpensesController, EconomicHistoryController],
})
export class ExpensesModule {}
