import {
  Injectable,
  Inject,
  Logger,
  type OnModuleDestroy,
  type OnModuleInit,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { MobilityRepository } from '../infrastructure/repositories/mobility.repository.js';
import { bestMobilityMatch, candidateAvailable } from './mobility.service.js';

@Injectable()
export class RecommendationWorker implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecommendationWorker.name);
  private timer?: ReturnType<typeof setInterval>;
  private running = false;
  private backfillComplete = false;
  constructor(
    private readonly repository: MobilityRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  onModuleInit() {
    // PostgreSQL conserva los trabajos; el temporizador sólo despierta al lector.
    if (this.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => {
      void this.tick();
    }, 1000);
    this.timer.unref();
    void this.tick();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async tick(): Promise<boolean> {
    if (this.running) return false;
    this.running = true;
    try {
      if (!this.backfillComplete)
        this.backfillComplete = await this.repository.backfillJobs();
      const job = await this.repository.claim();
      if (!job) return false;
      try {
        await this.repository.withJob(job, async (unit) => {
          const trip = await unit.trip();
          const now = new Date();
          if (!trip || !candidateAvailable(trip, now, this.env)) {
            await unit.finish(null, true);
            return;
          }
          const profiles = await unit.profiles(trip, now);
          const confirmed = new Set(
            (
              await unit.confirmedUsers(profiles.map(({ userId }) => userId))
            ).map(({ userId }) => userId),
          );
          const recipients = new Map<string, typeof profiles>();
          for (const profile of profiles) {
            if (confirmed.has(profile.userId)) continue;
            const own = recipients.get(profile.userId) ?? [];
            own.push(profile);
            recipients.set(profile.userId, own);
          }
          for (const [recipientId, own] of recipients) {
            const match = bestMobilityMatch(trip, own);
            if (match) await unit.notify(recipientId, match.type);
          }
          await unit.finish(
            profiles.at(-1)?.id ?? job.cursor,
            profiles.length < 50,
          );
        });
      } catch {
        await this.repository.retry(job);
        this.logger.warn('RECOMMENDATION_BATCH_RETRY');
      }
      return true;
    } catch {
      this.logger.warn('RECOMMENDATION_WORKER_UNAVAILABLE');
      return false;
    } finally {
      this.running = false;
    }
  }
}
