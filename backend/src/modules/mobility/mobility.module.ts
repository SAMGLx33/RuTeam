import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { MobilityController } from './controllers/mobility.controller.js';
import { MobilityService } from './application/mobility.service.js';
import { RecommendationWorker } from './application/recommendation.worker.js';
import { MobilityRepository } from './infrastructure/repositories/mobility.repository.js';
@Module({
  imports: [AuthModule, TripsModule],
  controllers: [MobilityController],
  providers: [MobilityService, MobilityRepository, RecommendationWorker],
  exports: [MobilityService, RecommendationWorker],
})
export class MobilityModule {}
