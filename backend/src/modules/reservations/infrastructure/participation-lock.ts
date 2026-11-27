import type { Prisma } from '../../../generated/prisma/client.js';

// A closure can affect trips with different drivers. Ordinary trip operations
// take the shared lock before any user or trip rows.
export async function lockParticipationChanges(
  tx: Prisma.TransactionClient,
  exclusive = false,
) {
  if (exclusive) await tx.$executeRaw`SELECT pg_advisory_xact_lock(61020, 1)`;
  else await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(61020, 1)`;
}
