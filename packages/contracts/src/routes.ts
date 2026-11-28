import type { TripEconomicTerms } from './expenses.js';
import type { ReputationSummary } from './ratings.js';
import type { TripPoint, TripRule, VehicleType } from './index.js';

export type CampusPointKind =
  | 'CAMPUS'
  | 'ENTRANCE'
  | 'PLAZA'
  | 'PARKING'
  | 'BASEMENT'
  | 'BUILDING'
  | 'COMMON_AREA'
  | 'OTHER';
export interface CampusMeetingPoint {
  id: string;
  name: string;
  campus: string;
  kind: CampusPointKind;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  accessReference: string | null;
  level: string | null;
  demo: boolean;
  campusSiteId?: string | null;
  sourceUrl?: string | null;
}
export interface GeocodedPlace extends TripPoint {
  context: string;
}
export interface PlaceSearchResponse {
  items: GeocodedPlace[];
  attribution: string;
}
export type TripDirection = 'DESDE_USC' | 'HACIA_USC';
export type StopAccess = 'PICKUP' | 'DROPOFF' | 'BOTH' | 'WAYPOINT';
export type MeetingPointInput = (
  { campusPointId: string; label?: string } | TripPoint
) & { instructions?: string };
export interface RouteGeometry {
  type: 'LineString';
  coordinates: [longitude: number, latitude: number][];
}
export interface RouteManeuver {
  order: number;
  leg: number;
  kind:
    | 'DEPART'
    | 'ARRIVE'
    | 'TURN'
    | 'NEW_NAME'
    | 'MERGE'
    | 'RAMP'
    | 'ON_RAMP'
    | 'OFF_RAMP'
    | 'FORK'
    | 'END_OF_ROAD'
    | 'CONTINUE'
    | 'ROUNDABOUT'
    | 'ROTARY'
    | 'ROUNDABOUT_TURN'
    | 'EXIT_ROUNDABOUT'
    | 'EXIT_ROTARY'
    | 'OTHER';
  modifier:
    | 'UTURN'
    | 'SHARP_RIGHT'
    | 'RIGHT'
    | 'SLIGHT_RIGHT'
    | 'STRAIGHT'
    | 'SLIGHT_LEFT'
    | 'LEFT'
    | 'SHARP_LEFT'
    | null;
  street: string | null;
  longitude: number;
  latitude: number;
  distanceMeters: number;
  durationSeconds: number;
  geometry: RouteGeometry;
  /** Orden del punto enviado al motor vial antes de publicar. */
  stopPosition: number | null;
}
export interface ItineraryInput {
  direction?: TripDirection;
  origin: MeetingPointInput;
  destination: MeetingPointInput;
  stops: (MeetingPointInput & { access: StopAccess })[];
  description: string;
  geometry?: RouteGeometry;
  routingSelection?: string;
  maneuvers?: RouteManeuver[];
  /** @deprecated Campo de compatibilidad con clientes anteriores. */
  publicMeetingPoints?: true;
}
export interface RouteStop extends TripPoint {
  id: string;
  position: number;
  access: StopAccess;
  campusPointId: string | null;
  campus: string | null;
  campusSiteId?: string | null;
  estimatedOffsetSeconds?: number | null;
  reachedAt?: string | null;
  instructions: string | null;
}
export interface TripItinerary {
  direction: TripDirection | null;
  stops: RouteStop[];
  description: string;
  geometry: RouteGeometry | null;
  distanceMeters: number | null;
}
export interface StopMatch {
  pickupId: string;
  dropoffId: string;
  distanceKm: number;
}
export interface AvailableTrip {
  id: string;
  driverName: string | null;
  driverReputation: ReputationSummary;
  vehicle: { type: VehicleType; brand: string; color: string };
  departureAt: string;
  estimatedDurationMinutes: number;
  availableSeats: number;
  providesHelmet: boolean | null;
  economics: TripEconomicTerms | null;
  itinerary: TripItinerary;
  rules: TripRule[];
  match: StopMatch;
}
export interface TripSearchPage {
  items: AvailableTrip[];
  nextCursor: string | null;
}

export type ReservationStatus =
  'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED';
export type TripAction = 'START' | 'FINISH' | 'CANCEL' | 'INTERRUPT';
export type CancellationReason =
  | 'DRIVER_UNAVAILABLE'
  | 'VEHICLE_ISSUE'
  | 'SAFETY'
  | 'CHANGE_OF_PLANS'
  | 'ACCOUNT_CLOSED'
  | 'OTHER';
export interface ConfirmParticipationInput {
  pickupId: string;
  dropoffId: string;
}
type ReservedMeetingPoint = TripPoint & {
  id: string;
  instructions: string | null;
};
export type ParticipationStage =
  | 'AWAITING_PICKUP'
  | 'ABOARD'
  | 'DROPPED_OFF'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ABSENT'
  | 'INTERRUPTED'
  | 'UNCONFIRMED';
export interface ReservationView {
  id: string;
  tripId: string;
  requesterName: string | null;
  passengerReputation?: ReputationSummary;
  driverName: string | null;
  vehicle: { type: VehicleType; brand: string; color: string };
  isRequester: boolean;
  quantity: number;
  status: ReservationStatus;
  economics: TripEconomicTerms | null;
  tripStatus: import('./index.js').TripSummary['status'];
  pickup: ReservedMeetingPoint;
  dropoff: ReservedMeetingPoint;
  departureAt: string;
  estimatedDepartureAt?: string | null;
  expiredAt?: string | null;
  createdAt: string;
  confirmedAt: string | null;
  boardedAt: string | null;
  droppedOffAt: string | null;
  stage: ParticipationStage;
  noShowAt?: string | null;
  withdrawalReason?: CancellationReason | null;
  canCancel: boolean;
}

export type RouteOptionsInput = Pick<
  ItineraryInput,
  'origin' | 'destination' | 'stops' | 'publicMeetingPoints' | 'direction'
>;
export interface RouteOption {
  geometry: RouteGeometry;
  distanceMeters: number;
  durationMinutes: number;
  routingSelection?: string;
  maneuvers?: RouteManeuver[];
  legDurationsSeconds?: number[];
}

export interface PickupProposalInput extends TripPoint {
  instructions?: string;
}

export interface PickupProposalView extends PickupProposalInput {
  id: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  requesterName: string | null;
  acceptedStopId: string | null;
}
