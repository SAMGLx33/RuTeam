import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripSafetyService } from './application/trip-safety.service.js';
import { TripSafetyController } from './controllers/trip-safety.controller.js';
import { TripSafetyRepository } from './infrastructure/repositories/trip-safety.repository.js';

import { TripTrackingRetention } from './application/trip-tracking-retention.js';
import { TripTrackingService } from './application/trip-tracking.service.js';
import { TripTrackingController } from './controllers/trip-tracking.controller.js';
import { TripTrackingRepository } from './infrastructure/repositories/trip-tracking.repository.js';

@Module({
  imports: [AuthModule],
  controllers: [TripSafetyController, TripTrackingController],
  providers: [
    TripSafetyService,
    TripSafetyRepository,
    TripTrackingService,
    TripTrackingRepository,
    TripTrackingRetention,
  ],
})
export class SafetyModule {}
