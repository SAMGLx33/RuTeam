import type { Prisma } from '../../../generated/prisma/client.js';

// Account closure and operations that assign a schedule across trips take the
// exclusive lock. Other participation changes acquire a shared lock before rows.
export async function lockParticipationChanges(
  tx: Prisma.TransactionClient,
  exclusive = false,
) {
  if (exclusive) await tx.$executeRaw`SELECT pg_advisory_xact_lock(61020, 1)`;
  else await tx.$executeRaw`SELECT pg_advisory_xact_lock_shared(61020, 1)`;
}
