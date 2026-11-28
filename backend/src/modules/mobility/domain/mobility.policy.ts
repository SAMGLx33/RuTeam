import {
  locallyEligible,
  usesDeclaredDomain,
  type AccessActor,
  type AccessConfiguration,
} from '../../institutional-membership/domain/access-policy.js';
import type {
  RouteGeometry,
  RouteStop,
  TripDirection,
  VehicleType,
} from '@ruteam/contracts';
import {
  matchStops,
  tripDirection,
} from '../../trips/domain/models/driver-route.js';
export interface MobilityProfile {
  userId: string;
  active: boolean;
  direction: TripDirection;
  campusSiteId: string;
  days: number[];
  startMinute: number;
  endMinute: number;
  latitude: number | null;
  longitude: number | null;
  radiusKm: number;
  vehicleTypes: VehicleType[];
  maxContributionCop?: number | null;
}
export interface MobilityTrip {
  id: string;
  driverId: string;
  departureAt: Date;
  vehicleType: VehicleType;
  suggestedContributionCop?: number | null;
  stops: RouteStop[];
  geometry: RouteGeometry | null;
}
export interface MobilityMatch {
  type: 'DIRECT' | 'POTENTIAL';
  reasons: string[];
  pickupId: string | null;
  dropoffId: string | null;
  distanceKm: number | null;
  pickupEstimatedAt: string | null;
}
export function localSchedule(instant: Date): { day: number; minute: number } {
  const local = new Date(instant.getTime() - 5 * 3600000);
  return {
    day: local.getUTCDay() || 7,
    minute: local.getUTCHours() * 60 + local.getUTCMinutes(),
  };
}
export function pickupInstant(
  departureAt: Date,
  stop: Pick<RouteStop, 'position' | 'estimatedOffsetSeconds'>,
): Date | null {
  if (stop.position === 0) return departureAt;
  return stop.estimatedOffsetSeconds == null
    ? null
    : new Date(departureAt.getTime() + stop.estimatedOffsetSeconds * 1000);
}

function withinSchedule(instant: Date, profile: MobilityProfile) {
  const { day, minute } = localSchedule(instant);
  return (
    profile.days.includes(day) &&
    minute >= profile.startMinute &&
    minute <= profile.endMinute
  );
}
export function matchMobility(
  trip: MobilityTrip,
  profile: MobilityProfile,
): MobilityMatch | null {
  const direction = tripDirection(trip.stops);
  if (
    !profile.active ||
    profile.userId === trip.driverId ||
    !direction ||
    direction !== profile.direction ||
    !profile.vehicleTypes.includes(trip.vehicleType) ||
    (profile.maxContributionCop != null &&
      (trip.suggestedContributionCop ?? 0) > profile.maxContributionCop) ||
    profile.latitude === null ||
    profile.longitude === null
  )
    return null;
  const campusStop =
    direction === 'HACIA_USC' ? trip.stops.at(-1)! : trip.stops[0];
  if (campusStop.campusSiteId !== profile.campusSiteId) return null;
  const place = { latitude: profile.latitude, longitude: profile.longitude };
  const match = matchStops(trip.stops, {
    from:
      direction === 'HACIA_USC'
        ? place
        : { campusPointId: campusStop.campusPointId! },
    to:
      direction === 'DESDE_USC'
        ? place
        : { campusPointId: campusStop.campusPointId! },
    radiusKm: profile.radiusKm,
    pickupAllowed: (pickup) => {
      const instant = pickupInstant(trip.departureAt, pickup);
      return instant !== null && withinSchedule(instant, profile);
    },
  });
  if (match) {
    const pickup = trip.stops.find(({ id }) => id === match.pickupId)!;
    return {
      type: 'DIRECT',
      reasons: [
        'AUTHORIZED_STOPS',
        pickup.position === 0 ? 'DEPARTURE_WINDOW' : 'ESTIMATED_PICKUP_WINDOW',
        'GEOGRAPHIC_PROXIMITY',
      ],
      pickupId: match.pickupId,
      dropoffId: match.dropoffId,
      distanceKm: Math.round(match.distanceKm * 1000) / 1000,
      pickupEstimatedAt:
        pickupInstant(trip.departureAt, pickup)?.toISOString() ?? null,
    };
  }
  return null;
}

export type RecommendationAccess = AccessConfiguration;
export function recommendationActorEligible(
  actor: AccessActor,
  access: RecommendationAccess,
  now: Date,
): boolean {
  // A database row alone does not vouch for an authorized provider's current answer.
  return (
    usesDeclaredDomain(actor, access) ||
    (actor.demoIdentity !== null && locallyEligible(actor, access, now))
  );
}
