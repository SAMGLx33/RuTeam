import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { MobilityReminderRepository } from '../infrastructure/repositories/mobility-reminder.repository.js';
import { SavedMobilityService } from './saved-mobility.service.js';

@Injectable()
export class DailyMobilityWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DailyMobilityWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly saved: SavedMobilityService,
    private readonly reminders: MobilityReminderRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  onModuleInit() {
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), 15_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  async tick(now = new Date()) {
    if (
      this.running ||
      this.env.NODE_ENV === 'production' ||
      !this.env.demo ||
      this.env.VERIFICATION_PROVIDER !== 'demo'
    )
      return;
    this.running = true;
    try {
      const results = await Promise.allSettled([
        this.saved.deliverAlerts(now),
        this.reminders.deliverDue(now),
      ]);
      if (results.some(({ status }) => status === 'rejected'))
        this.logger.warn('DAILY_MOBILITY_NOTICE_RETRY');
    } finally {
      this.running = false;
    }
  }
}
