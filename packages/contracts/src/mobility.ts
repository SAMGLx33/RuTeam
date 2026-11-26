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
  estimatedDurationMinutes: number;
  availableSeats: number;
  providesHelmet: boolean | null;
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
  expectedEndAt: string;
  offeredSeats: number;
  occupiedSeats: number;
  isDriver: boolean;
  acceptsParticipation: boolean;
  acceptsPickupProposal: boolean;
  recommendation: TripRecommendation | null;
}
export interface TripNotificationView {
  id: string;
  tripId: string;
  kind: 'TRIP_MATCH' | 'CHAT_MESSAGE' | 'RATING_AVAILABLE' | 'GROUP_CONFIRMED';
  matchType: RecommendationType | null;
  createdAt: string;
  readAt: string | null;
  available: boolean;
}
export interface NotificationPage {
  items: TripNotificationView[];
  nextCursor: string | null;
}
