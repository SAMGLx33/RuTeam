import type { TripGroupStatus, TripSummary } from '@ruteam/contracts';

const invitationLifetimeMs = 2 * 60 * 60 * 1000;

export function invitationExpiresAt(createdAt: Date, departureAt: Date): Date {
  return new Date(
    Math.min(createdAt.getTime() + invitationLifetimeMs, departureAt.getTime()),
  );
}

export function groupStatus(
  group: {
    confirmedAt: Date | null;
    revokedAt: Date | null;
    expiresAt: Date;
    trip: { status: TripSummary['status']; departureAt: Date };
  },
  now: Date,
): TripGroupStatus {
  if (group.confirmedAt) return 'CONFIRMED';
  if (group.revokedAt) return 'REVOKED';
  if (group.trip.status !== 'PROGRAMADO' || group.trip.departureAt <= now)
    return 'CLOSED';
  if (group.expiresAt <= now) return 'EXPIRED';
  return 'OPEN';
}
