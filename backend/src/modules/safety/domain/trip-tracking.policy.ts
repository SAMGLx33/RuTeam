export const positionLifetimeMs = 2 * 60000;
export const positionMinimumIntervalMs = 15000;
export const positionClockAheadMs = 15000;

export function canShareCapturedPosition(now: Date, capturedAt: Date) {
  const age = now.getTime() - capturedAt.getTime();
  return age >= -positionClockAheadMs && age < positionLifetimeMs;
}

export function positionIsVisible(
  now: Date,
  sample: { capturedAt: Date; sharedAt: Date },
) {
  return (
    now.getTime() - sample.sharedAt.getTime() < positionLifetimeMs &&
    canShareCapturedPosition(now, sample.capturedAt)
  );
}
