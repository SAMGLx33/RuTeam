import type { DepartureState } from '@ruteam/contracts';
import { tripWindow } from './activity-window.js';

export const departureGraceMinutes = 30;
type Departure = Parameters<typeof tripWindow>[0] & { expiredAt: Date | null };

export function departureDeadline(
  trip: Departure,
  grace = departureGraceMinutes,
) {
  return new Date(+tripWindow(trip).end + grace * 60_000);
}

export function departureState(
  trip: Departure,
  now: Date,
  grace = departureGraceMinutes,
): DepartureState {
  if (trip.status === 'EN_CURSO') return 'STARTED';
  if (trip.status !== 'PROGRAMADO') return 'CLOSED';
  if (trip.expiredAt || departureDeadline(trip, grace) <= now) return 'EXPIRED';
  if (trip.departureAt <= now || trip.estimatedDepartureAt) return 'DELAYED';
  if (+trip.departureAt - +now <= 30 * 60_000) return 'SOON';
  return 'SCHEDULED';
}
