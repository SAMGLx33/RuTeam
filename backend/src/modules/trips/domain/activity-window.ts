export interface ActivityWindow {
  start: Date;
  end: Date;
}

interface TimedTrip {
  departureAt: Date;
  estimatedDepartureAt?: Date | null;
  startedAt?: Date | null;
  expectedEndAt: Date;
  estimatedDurationMinutes: number;
  status: string;
}

export function tripWindow(trip: TimedTrip): ActivityWindow {
  const start = trip.startedAt ?? trip.estimatedDepartureAt ?? trip.departureAt;
  return {
    start,
    end:
      +start === +trip.departureAt
        ? trip.expectedEndAt
        : new Date(+start + trip.estimatedDurationMinutes * 60000),
  };
}

export function segmentWindow(
  trip: TimedTrip,
  pickup: { estimatedOffsetSeconds?: number | null },
  dropoff: { estimatedOffsetSeconds?: number | null },
): ActivityWindow {
  const window = tripWindow(trip);
  const first = pickup.estimatedOffsetSeconds;
  const last = dropoff.estimatedOffsetSeconds;
  if (first == null || last == null || first >= last) return window;
  return {
    start: new Date(+window.start + first * 1000),
    end: new Date(+window.start + last * 1000),
  };
}

export function overlap(a: ActivityWindow, b: ActivityWindow): boolean {
  return a.start < b.end && b.start < a.end;
}
