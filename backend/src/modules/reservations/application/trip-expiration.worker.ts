import {
  Inject,
  Injectable,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { ReservationsService } from './reservations.service.js';

@Injectable()
export class TripExpirationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TripExpirationWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;

  constructor(
    private readonly reservations: ReservationsService,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  onModuleInit() {
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.scan(), 60_000);
    this.timer.unref();
    void this.scan();
  }

  onModuleDestroy() {
    clearInterval(this.timer);
  }

  private async scan() {
    if (this.running) return;
    this.running = true;
    try {
      await this.reservations.expireDue();
    } catch {
      this.logger.warn('No se pudo verificar el vencimiento de viajes');
    } finally {
      this.running = false;
    }
  }
}
