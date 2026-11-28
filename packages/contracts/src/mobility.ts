import type { TripEconomicTerms } from './expenses.js';
import type { ReputationSummary } from './ratings.js';
import type { AvailableTrip, TripDirection } from './routes.js';
import type { TripRule, TripSummary, VehicleType } from './index.js';

export interface MobilityPreferenceInput {
  label: string;
  campusPointId: string;
  direction: TripDirection;
  days: number[];
  startMinute: number;
  endMinute: number;
  placeLabel: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm: number;
  vehicleTypes: VehicleType[];
  maxContributionCop?: number | null;
  notificationsEnabled: boolean;
  active: boolean;
}
export interface MobilityPreferenceView extends MobilityPreferenceInput {
  id: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  updatedAt: string;
}
export type FeedTab = 'FOR_YOU' | 'ALL' | TripDirection;
export type RecommendationType = 'DIRECT' | 'POTENTIAL';
export interface TripRecommendation {
  type: RecommendationType;
  reasons: string[];
  pickupId: string | null;
  dropoffId: string | null;
  distanceKm: number | null;
  pickupEstimatedAt: string | null;
}
export interface TripFeedCard {
  id: string;
  driverName: string | null;
  driverReputation: ReputationSummary;
  vehicle: { type: VehicleType; brand: string; color: string };
  direction: TripDirection;
  originLabel: string;
  destinationLabel: string;
  meetingLabel: string;
  departureAt: string;
  estimatedDepartureAt?: string | null;
  estimatedDurationMinutes: number;
  availableSeats: number;
  providesHelmet: boolean | null;
  economics: TripEconomicTerms | null;
  rules: TripRule[];
  recommendation: TripRecommendation | null;
}
export interface TripFeedPage {
  items: TripFeedCard[];
  nextCursor: string | null;
  hasActivePreferences: boolean;
}
export interface TripDetail extends Omit<AvailableTrip, 'match'> {
  match: AvailableTrip['match'] | null;
  status: TripSummary['status'];
  terminationReason?: TripSummary['terminationReason'];
  expectedEndAt: string;
  estimatedDepartureAt?: string | null;
  expiredAt?: string | null;
  offeredSeats: number;
  occupiedSeats: number;
  isDriver: boolean;
  acceptsParticipation: boolean;
  canSaveInterest?: boolean;
  acceptsPickupProposal: boolean;
  recommendation: TripRecommendation | null;
}
export type TripNoticeKind =
  | 'TRIP_MATCH'
  | 'CHAT_MESSAGE'
  | 'RATING_AVAILABLE'
  | 'GROUP_CONFIRMED'
  | 'PARTICIPATION_CONFIRMED'
  | 'PASSENGER_JOINED'
  | 'PASSENGER_WITHDREW'
  | 'PICKUP_PROPOSED'
  | 'PICKUP_ACCEPTED'
  | 'PICKUP_REJECTED'
  | 'TRIP_CANCELLED'
  | 'TRIP_STARTED'
  | 'PICKUP_NEXT'
  | 'TRIP_FINISHED'
  | 'COMPENSATION_DECLARED'
  | 'COMPENSATION_ACKNOWLEDGED'
  | 'COMPENSATION_DISPUTED'
  | 'OCCURRENCE_PUBLISHED'
  | 'TRIP_INTERRUPTED'
  | 'INCIDENT_RECORDED'
  | 'DESTINATION_REACHED'
  | 'TRIP_DELAYED'
  | 'TRIP_EXPIRED'
  | 'TRIP_EDITED'
  | 'SEAT_AVAILABLE'
  | 'TRIP_DEPARTURE_REMINDER'
  | 'TRIP_PICKUP_REMINDER'
  | 'PICKUP_CONFIRMATION_REMINDER';

export type AccountNoticeKind =
  | 'RECURRENCE_PAUSED'
  | 'OCCURRENCE_FAILED'
  | 'ACCOUNT_REACTIVATED'
  | 'ELIGIBILITY_CHANGED'
  | 'DRIVING_DOCUMENT_REMINDER';

export type TripNotificationView = (
  | {
      tripId: string;
      kind: TripNoticeKind;
    }
  | {
      tripId: null;
      kind: AccountNoticeKind;
    }
) & {
  id: string;
  matchType: RecommendationType | null;
  createdAt: string;
  readAt: string | null;
  available: boolean;
};
export interface NotificationPage {
  items: TripNotificationView[];
  nextCursor: string | null;
}
