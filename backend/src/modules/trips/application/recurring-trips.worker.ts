import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { RecurringTripsService } from './recurring-trips.service.js';

@Injectable()
export class RecurringTripsWorker implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(RecurringTripsWorker.name);
  constructor(
    private readonly schedules: RecurringTripsService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  onModuleInit() {
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.tick(), 15_000);
    this.timer.unref();
    void this.tick();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    const now = new Date();
    try {
      for (const { driverId, id } of await this.schedules.due(now)) {
        try {
          await this.schedules.generate(driverId, id, now);
        } catch {
          this.logger.warn('Se reintentará la generación de una recurrencia');
        }
      }
    } catch {
      this.logger.warn(
        'El trabajador de recurrencias volverá a consultar PostgreSQL',
      );
    } finally {
      this.running = false;
    }
  }
}
