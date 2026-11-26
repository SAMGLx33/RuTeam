import type { TripSafetyContext } from '@ruteam/contracts';
import { tripDirection } from '../../trips/domain/models/driver-route.js';

interface SafetyStop {
  label: string;
  campus: string | null;
  campusPointId: string | null;
  reachedAt: Date | null;
  estimatedOffsetSeconds: number | null;
}

interface ActiveTrip {
  departureAt: Date;
  startedAt: Date | null;
  stops: readonly SafetyStop[];
}

export function activeTripSafetyContext(trip: ActiveTrip): TripSafetyContext {
  const reached = trip.stops.findLast(({ reachedAt }) => reachedAt !== null);
  const next = trip.stops.find(({ reachedAt }) => reachedAt === null);

  return {
    status: 'EN_CURSO',
    direction: tripDirection(trip.stops),
    departureAt: trip.departureAt.toISOString(),
    startedAt: trip.startedAt?.toISOString() ?? null,
    reachedStop: reached?.reachedAt
      ? { label: reached.label, reachedAt: reached.reachedAt.toISOString() }
      : null,
    nextStop: next
      ? {
          label: next.label,
          estimatedAt:
            next.estimatedOffsetSeconds === null
              ? null
              : new Date(
                  trip.departureAt.getTime() +
                    next.estimatedOffsetSeconds * 1000,
                ).toISOString(),
        }
      : null,
  };
}
