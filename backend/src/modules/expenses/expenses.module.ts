import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { ExpensesService } from './application/expenses.service.js';
import { ExpensesController } from './controllers/expenses.controller.js';
import { ExpensesRepository } from './infrastructure/expenses.repository.js';

@Module({
  imports: [AuthModule, ReservationsModule],
  providers: [ExpensesService, ExpensesRepository],
  controllers: [ExpensesController],
})
export class ExpensesModule {}
