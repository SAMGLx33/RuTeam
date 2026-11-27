import type { Prisma } from '../../../../generated/prisma/client.js';

export function requeueRecommendation(
  tx: Prisma.TransactionClient,
  tripId: string,
) {
  return tx.recommendationJob.upsert({
    where: { tripId },
    create: { tripId },
    update: {
      state: 'PENDING',
      availableAt: new Date(),
      cursor: null,
      leaseUntil: null,
      attempts: 0,
    },
  });
}
