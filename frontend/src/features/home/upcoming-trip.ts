import type { ReservationView, TripSummary } from '@ruteam/contracts';

type MobilityWindow =
  | Pick<
      TripSummary,
      'status' | 'departureAt' | 'estimatedDepartureAt' | 'expiredAt'
    >
  | Pick<
      ReservationView,
      'tripStatus' | 'departureAt' | 'estimatedDepartureAt' | 'expiredAt'
    >;

const statusOf = (window: MobilityWindow) =>
  'tripStatus' in window ? window.tripStatus : window.status;
const effectiveTime = (window: MobilityWindow) =>
  Date.parse(window.estimatedDepartureAt ?? window.departureAt);

export function upcomingTrip<T extends MobilityWindow>(
  windows: readonly T[],
  now: number,
): T | undefined {
  return windows
    .filter((window) => {
      const status = statusOf(window);
      return (
        status === 'EN_CURSO' ||
        (status === 'PROGRAMADO' &&
          !window.expiredAt &&
          effectiveTime(window) > now)
      );
    })
    .sort(
      (a, b) =>
        Number(statusOf(b) === 'EN_CURSO') -
          Number(statusOf(a) === 'EN_CURSO') ||
        effectiveTime(a) - effectiveTime(b),
    )[0];
}
