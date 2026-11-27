import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { RatingsService } from './application/ratings.service.js';
import { RatingsController } from './controllers/ratings.controller.js';
import { RatingsRepository } from './infrastructure/ratings.repository.js';

@Module({
  imports: [AuthModule, ReservationsModule],
  controllers: [RatingsController],
  providers: [RatingsService, RatingsRepository],
})
export class RatingsModule {}
