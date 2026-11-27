import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationsController } from './controllers/reservations.controller.js';
import { ReservationsService } from './application/reservations.service.js';
import { ReservationsRepository } from './infrastructure/repositories/reservations.repository.js';
import { TripTransitionGuard } from './controllers/trip-transition.guard.js';
import { TripExpirationWorker } from './application/trip-expiration.worker.js';

@Module({
  imports: [AuthModule],
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    ReservationsRepository,
    TripTransitionGuard,
    TripExpirationWorker,
  ],
  exports: [ReservationsRepository],
})
export class ReservationsModule {}
