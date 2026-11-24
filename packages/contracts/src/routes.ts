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
}
export type StopAccess = 'PICKUP' | 'DROPOFF' | 'BOTH' | 'WAYPOINT';
export type MeetingPointInput = (
  { campusPointId: string } | (TripPoint & { campusReference?: 'USC' })
) & { instructions?: string };
export interface RouteGeometry {
  type: 'LineString';
  coordinates: [longitude: number, latitude: number][];
}
export interface ItineraryInput {
  origin: MeetingPointInput;
  destination: MeetingPointInput;
  stops: (MeetingPointInput & { access: StopAccess })[];
  description: string;
  geometry?: RouteGeometry;
  /** Confirma que paradas, geometría e instrucciones son apropiadas para compartir. */
  publicMeetingPoints: true;
}
export interface RouteStop extends TripPoint {
  id: string;
  position: number;
  access: StopAccess;
  campusPointId: string | null;
  campus: string | null;
  instructions: string | null;
}
export interface TripItinerary {
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
  vehicle: { type: VehicleType; brand: string; color: string };
  departureAt: string;
  estimatedDurationMinutes: number;
  availableSeats: number;
  providesHelmet: boolean | null;
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
export type ReservationDecision = 'ACCEPT' | 'REJECT';
export type TripAction = 'START' | 'FINISH' | 'CANCEL';
export interface RequestReservationInput {
  memberIds: string[];
  pickupId: string;
  dropoffId: string;
}
type ReservedMeetingPoint = TripPoint & {
  id: string;
  instructions: string | null;
};
export interface ReservationView {
  id: string;
  tripId: string;
  requesterName: string | null;
  isRequester: boolean;
  quantity: number;
  status: ReservationStatus;
  tripStatus: 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  pickup: ReservedMeetingPoint;
  dropoff: ReservedMeetingPoint;
  departureAt: string;
  createdAt: string;
  confirmedAt: string | null;
}

export type RouteOptionsInput = Pick<
  ItineraryInput,
  'origin' | 'destination' | 'stops' | 'publicMeetingPoints'
>;
export interface RouteOption {
  geometry: RouteGeometry;
  distanceMeters: number;
  durationMinutes: number;
}
