import type { RatingCapacity, ReputationSummary } from '@ruteam/contracts';
import type { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

export function emptyReputation(capacity: RatingCapacity): ReputationSummary {
  return { capacity, average: null, count: 0 };
}

export async function reputationsByRole(
  db: Pick<PrismaService, 'tripRating'>,
  ids: readonly string[],
  capacity: RatingCapacity,
): Promise<Map<string, ReputationSummary>> {
  if (!ids.length) return new Map();
  const summaries = await db.tripRating.groupBy({
    by: ['rateeId'],
    where: { rateeId: { in: [...new Set(ids)] }, capacity },
    _avg: { stars: true },
    _count: { stars: true },
  });
  return new Map(
    summaries.map(({ rateeId, _avg, _count }) => [
      rateeId,
      { capacity, average: _avg.stars, count: _count.stars },
    ]),
  );
}
