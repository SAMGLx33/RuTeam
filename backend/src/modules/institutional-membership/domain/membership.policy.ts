export function isActiveMembership(
  membership: { status: string; group?: string; validUntil: Date } | null,
  now: Date,
): boolean {
  return (
    membership?.status === 'ACTIVE' &&
    membership.group === 'STUDENT' &&
    membership.validUntil.getTime() > now.getTime()
  );
}
