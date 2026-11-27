import { ExpoPushDelivery } from './notifications/expo-push-delivery.js';
import { NotificationSettingsController } from './notifications/notification-settings.controller.js';
import { NotificationSettingsService } from './notifications/notification-settings.service.js';
import { NotificationSettingsRepository } from './notifications/notification-settings.repository.js';
import { DailyMobilityService } from './application/daily-mobility.service.js';
import { DailyMobilityRepository } from './infrastructure/repositories/daily-mobility.repository.js';
import { DailyMobilityController } from './controllers/daily-mobility.controller.js';
import { EnvironmentService } from './application/environment.service.js';
import { EnvironmentRepository } from './infrastructure/repositories/environment.repository.js';
import { EnvironmentController } from './controllers/environment.controller.js';
import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { TripsModule } from '../trips/trips.module.js';
import { MobilityController } from './controllers/mobility.controller.js';
import { MobilityService } from './application/mobility.service.js';
import { RecommendationWorker } from './application/recommendation.worker.js';
import { MobilityRepository } from './infrastructure/repositories/mobility.repository.js';
import { MobilityStatisticsService } from './application/mobility-statistics.service.js';
import { MobilityStatisticsRepository } from './infrastructure/repositories/mobility-statistics.repository.js';
import { MobilityStatisticsController } from './controllers/mobility-statistics.controller.js';
@Module({
  imports: [AuthModule, TripsModule],
  controllers: [
    MobilityController,
    MobilityStatisticsController,
    EnvironmentController,
    DailyMobilityController,
    NotificationSettingsController,
  ],
  providers: [
    MobilityService,
    NotificationSettingsService,
    ExpoPushDelivery,
    NotificationSettingsRepository,
    DailyMobilityService,
    DailyMobilityRepository,
    EnvironmentService,
    EnvironmentRepository,
    MobilityStatisticsService,
    MobilityStatisticsRepository,
    MobilityRepository,
    RecommendationWorker,
  ],
  exports: [MobilityService, RecommendationWorker],
})
export class MobilityModule {}
