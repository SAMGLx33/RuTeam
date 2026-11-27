type TrackedStop = { id: string; reachedAt: Date | null };

/** The caller supplies the published stop order. */
export function currentReachedStop<T extends TrackedStop>(
  stops: readonly T[],
): T | undefined {
  for (let index = stops.length - 1; index >= 0; index--) {
    const stop = stops[index];
    if (stop.reachedAt) return stop;
  }
  return undefined;
}

export function isNextStop(
  stops: readonly TrackedStop[],
  stopId: string,
): boolean {
  return stops.find((stop) => stop.reachedAt === null)?.id === stopId;
}

export function originBoardingWindow(
  departure: Date,
  estimateEnd: Date,
  now: Date,
): boolean {
  return now.getTime() >= departure.getTime() - 30 * 60000 && now < estimateEnd;
}
