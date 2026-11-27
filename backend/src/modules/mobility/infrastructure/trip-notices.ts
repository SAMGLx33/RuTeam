import type { AccountNoticeKind, TripNoticeKind } from '@ruteam/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';

export async function recordTripNotice(
  tx: Prisma.TransactionClient,
  tripId: string,
  kind: TripNoticeKind,
  recipients: string[],
  eventKey = '',
) {
  if (recipients.length)
    await tx.tripNotification.createMany({
      data: recipients.map((recipientId) => ({
        recipientId,
        tripId,
        kind,
        eventKey,
      })),
      skipDuplicates: true,
    });
}

export async function recordInboxNotice(
  tx: Prisma.TransactionClient,
  recipientId: string,
  kind: AccountNoticeKind,
  eventKey: string,
) {
  await tx.tripNotification.createMany({
    data: [{ recipientId, kind, eventKey }],
    skipDuplicates: true,
  });
}
