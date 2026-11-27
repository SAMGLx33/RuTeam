import type { TripSummary } from './index.js';

export interface AgendaEntry {
  id: string;
  day: string;
  at: string;
  label: string;
  kind:
    | 'PUBLISHED'
    | 'PARTICIPATION'
    | 'PROJECTED'
    | 'PENDING'
    | 'FAILED'
    | 'PAUSED';
  status: TripSummary['status'] | 'WITHDRAWN' | 'EXPIRED' | null;
  tripId: string | null;
  scheduleId: string | null;
  failure: string | null;
  estimatedDepartureAt?: string;
  pickupAt?: string | null;
  dropoffAt?: string | null;
  conflictWithTripIds?: string[];
}
export interface MobilityAgenda {
  start: string;
  days: number;
  entries: AgendaEntry[];
}

export interface PendingActivity {
  id: string;
  title: string;
  detail: string;
  category:
    | 'TRIP'
    | 'PICKUP'
    | 'PICKUP_RESOLVED'
    | 'CHAT'
    | 'GROUP'
    | 'RATING'
    | 'COMPENSATION'
    | 'DISPUTE'
    | 'SCHEDULE'
    | 'DOCUMENT'
    | 'ACCOUNT';
  optional: boolean;
  tripId?: string;
  participationId?: string;
  scheduleId?: string;
}

export type SavedTripAvailability =
  | 'AVAILABLE'
  | 'FULL'
  | 'EXPIRED'
  | 'CANCELLED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'INTERRUPTED'
  | 'UNAVAILABLE';

export interface SavedTripView {
  tripId: string;
  direction: import('./routes.js').TripDirection | null;
  departureAt: string;
  availability: SavedTripAvailability;
  availableSeats: number;
  alertRequested: boolean;
  canRequestAlert: boolean;
  createdAt: string;
}

export type FrequentPlaceKind =
  'HOME_AREA' | 'PICKUP' | 'DROPOFF' | 'PUBLIC_REFERENCE' | 'FAVORITE';
export interface FrequentPlaceInput {
  name: string;
  kind: FrequentPlaceKind;
  placeLabel: string;
  latitude: number;
  longitude: number;
}
export interface FrequentPlaceView extends FrequentPlaceInput {
  id: string;
}
