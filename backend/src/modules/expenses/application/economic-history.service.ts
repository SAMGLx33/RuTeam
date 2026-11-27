import { Injectable } from '@nestjs/common';
import type { EconomicHistoryDto } from '../dto/economic-history.dto.js';
import { EconomicHistoryRepository } from '../infrastructure/economic-history.repository.js';

@Injectable()
export class EconomicHistoryService {
  constructor(private readonly repository: EconomicHistoryRepository) {}

  list(actorId: string, query: EconomicHistoryDto) {
    return this.repository.list(actorId, query);
  }
}
