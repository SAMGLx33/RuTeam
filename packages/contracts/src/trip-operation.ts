import type { TripSummary } from './index.js';
import type {
  ParticipationStage,
  ReservationStatus,
  RouteManeuver,
  RouteStop,
  TripItinerary,
} from './routes.js';

export interface TripOperation {
  id: string;
  role: 'DRIVER' | 'PASSENGER';
  status: TripSummary['status'];
  departureAt: string;
  estimatedDepartureAt: string | null;
  expiredAt: string | null;
  departureState: DepartureState;
  trackingEnabled: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  driver: string | null;
  vehicle: { brand: string; color: string; plate: string };
  progress: {
    current: RouteStop | null;
    next: RouteStop | null;
    reached: number;
    total: number;
  };
  itinerary: TripItinerary | null;
  maneuvers?: RouteManeuver[];
  participation: {
    id: string;
    status: ReservationStatus;
    pickup: RouteStop | null;
    dropoff: RouteStop | null;
    pickupEstimatedAt: string | null;
    boardedAt: string | null;
    droppedOffAt: string | null;
    dropoffEstimatedAt: string | null;
    stage: ParticipationStage;
    noShowAt: string | null;
    canIssuePass: boolean;
  } | null;
  manifest: {
    awaitingHere: number;
    boarded: number;
    droppedOff: number;
    aboard: number;
    awaitingDropoffHere: number;
    noShows: number;
    awaitingLater: number;
    pendingProposals: number;
  } | null;
}

export type DepartureState =
  'SCHEDULED' | 'SOON' | 'DELAYED' | 'STARTED' | 'EXPIRED' | 'CLOSED';
