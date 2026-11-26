import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
import type {
  RouteGeometry,
  RouteStop,
  TripDirection,
  VehicleType,
} from '@ruteam/contracts';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';
import {
  matchStops,
  pickupInsertionPosition,
  passesNear,
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
}
export interface MobilityTrip {
  id: string;
  driverId: string;
  departureAt: Date;
  vehicleType: VehicleType;
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
  if (
    direction !== 'HACIA_USC' ||
    !withinSchedule(trip.departureAt, profile) ||
    !trip.geometry ||
    !passesNear(trip.geometry, place, profile.radiusKm)
  )
    return null;
  try {
    // Una cercanía visual no garantiza una recogida incorporable. Usa la misma regla de propuestas.
    pickupInsertionPosition(trip.geometry, trip.stops, place);
  } catch (error) {
    if (!(error instanceof DomainPolicyError)) throw error;
    return null;
  }
  return {
    type: 'POTENTIAL',
    reasons: [
      'ROUTE_NEARBY',
      'PICKUP_REQUIRES_DRIVER_DECISION',
      'DEPARTURE_WINDOW',
    ],
    pickupId: null,
    dropoffId: campusStop.id,
    distanceKm: null,
    pickupEstimatedAt: null,
  };
}

export interface RecommendationAccess {
  demo: boolean;
  NODE_ENV: string;
  VERIFICATION_PROVIDER: string;
}
export interface RecommendationActor {
  demoIdentity: string | null;
  disabledAt: Date | null;
  emailVerifiedAt: Date | null;
  membership: {
    status: string;
    group?: string;
    validUntil: Date;
    verifiedBy: string;
  } | null;
}
export function recommendationActorEligible(
  actor: RecommendationActor,
  access: RecommendationAccess,
  now: Date,
): boolean {
  // La fuente oficial del monolito aún falla cerrada; una fila de matrícula no acredita su procedencia.
  return (
    access.NODE_ENV !== 'production' &&
    access.demo &&
    access.VERIFICATION_PROVIDER === 'demo' &&
    actor.demoIdentity !== null &&
    !actor.disabledAt &&
    !!actor.emailVerifiedAt &&
    actor.membership?.verifiedBy === 'DEMO' &&
    isActiveMembership(actor.membership, now)
  );
}
