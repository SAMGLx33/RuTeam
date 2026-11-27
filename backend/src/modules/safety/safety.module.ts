import { TripOperationService } from './application/trip-operation.service.js';
import { TripOperationRepository } from './infrastructure/repositories/trip-operation.repository.js';
import { TripOperationController } from './controllers/trip-operation.controller.js';
import { Module } from '@nestjs/common';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { PrivateSafetyService } from './application/private-safety.service.js';
import { PrivateSafetyController } from './controllers/private-safety.controller.js';
import { PrivateSafetyRepository } from './infrastructure/repositories/private-safety.repository.js';
import { AuthModule } from '../auth/auth.module.js';
import { TripSafetyService } from './application/trip-safety.service.js';
import { TripSafetyController } from './controllers/trip-safety.controller.js';
import { TripSafetyRepository } from './infrastructure/repositories/trip-safety.repository.js';

import { TripTrackingRetention } from './application/trip-tracking-retention.js';
import { TripTrackingService } from './application/trip-tracking.service.js';
import { TripTrackingController } from './controllers/trip-tracking.controller.js';
import { TripTrackingRepository } from './infrastructure/repositories/trip-tracking.repository.js';

@Module({
  imports: [AuthModule, ReservationsModule],
  controllers: [
    TripOperationController,
    TripSafetyController,
    TripTrackingController,
    PrivateSafetyController,
  ],
  providers: [
    TripOperationService,
    TripOperationRepository,
    PrivateSafetyService,
    PrivateSafetyRepository,
    TripSafetyService,
    TripSafetyRepository,
    TripTrackingService,
    TripTrackingRepository,
    TripTrackingRetention,
  ],
})
export class SafetyModule {}
