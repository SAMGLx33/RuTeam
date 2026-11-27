import { SavedMobilityController } from './controllers/saved-mobility.controller.js';
import { SavedMobilityRepository } from './infrastructure/repositories/saved-mobility.repository.js';
import { SavedMobilityService } from './application/saved-mobility.service.js';
import { DailyMobilityWorker } from './application/daily-mobility.worker.js';
import { MobilityReminderRepository } from './infrastructure/repositories/mobility-reminder.repository.js';
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
    SavedMobilityController,
    NotificationSettingsController,
  ],
  providers: [
    MobilityService,
    NotificationSettingsService,
    ExpoPushDelivery,
    NotificationSettingsRepository,
    DailyMobilityService,
    DailyMobilityWorker,
    MobilityReminderRepository,
    SavedMobilityRepository,
    SavedMobilityService,
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
