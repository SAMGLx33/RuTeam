import { EnvironmentService } from './environment.service.js';
import { Injectable } from '@nestjs/common';
import type { MobilityStatistics } from '@ruteam/contracts';
import { MobilityStatisticsRepository } from '../infrastructure/repositories/mobility-statistics.repository.js';

@Injectable()
export class MobilityStatisticsService {
  constructor(
    private readonly repository: MobilityStatisticsRepository,
    private readonly environment: EnvironmentService,
  ) {}

  async summary(actorId: string, months: number): Promise<MobilityStatistics> {
    const [[total, ...minutes], environmental] = await Promise.all([
      this.repository.summary(actorId, months),
      this.environment.summary(actorId, months),
    ]);
    const { period, ...totals } = total;
    void period;
    return {
      months,
      totals,
      monthly: minutes.flatMap((row) =>
        row.period ? [{ ...row, period: row.period }] : [],
      ),
      environmental,
    };
  }
}
