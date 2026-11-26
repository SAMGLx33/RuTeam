import {
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { positionLifetimeMs } from '../domain/trip-tracking.policy.js';
import { TripTrackingRepository } from '../infrastructure/repositories/trip-tracking.repository.js';

@Injectable()
export class TripTrackingRetention implements OnModuleDestroy, OnModuleInit {
  private readonly logger = new Logger(TripTrackingRetention.name);
  private timer?: ReturnType<typeof setInterval>;

  constructor(private readonly repository: TripTrackingRepository) {}

  onModuleInit() {
    if (process.env.NODE_ENV === 'test') return;
    const purge = () => {
      void this.repository
        .purgeExpired(new Date(Date.now() - positionLifetimeMs))
        .catch(() => this.logger.warn('TRIP_TRACKING_RETENTION_RETRY'));
    };
    purge();
    this.timer = setInterval(purge, 60000);
    this.timer.unref();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
}
