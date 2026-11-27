import type { TripSummary } from './index.js';
import type { ReservationStatus, RouteStop, TripItinerary } from './routes.js';

export interface TripOperation {
  id: string;
  role: 'DRIVER' | 'PASSENGER';
  status: TripSummary['status'];
  departureAt: string;
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
  participation: {
    id: string;
    status: ReservationStatus;
    pickup: RouteStop | null;
    dropoff: RouteStop | null;
    pickupEstimatedAt: string | null;
    boardedAt: string | null;
    noShowAt: string | null;
    canIssuePass: boolean;
  } | null;
  manifest: {
    awaitingHere: number;
    boarded: number;
    noShows: number;
    awaitingLater: number;
    pendingProposals: number;
  } | null;
}
