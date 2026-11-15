export function isActiveMembership(
  membership: { status: string; validUntil: Date } | null,
  now: Date,
): boolean {
  return (
    membership?.status === 'ACTIVE' &&
    membership.validUntil.getTime() > now.getTime()
  );
}
