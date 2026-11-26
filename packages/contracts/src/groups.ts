import type { TripRule } from './index.js';

export interface CreateTripGroupInput {
  pickupId: string;
  dropoffId: string;
  expectedMembers: number;
}

export interface TripGroupPreview {
  tripId: string;
  pickupLabel: string;
  dropoffLabel: string;
  expectedMembers: number;
  expiresAt: string;
  departureAt: string;
  driverName: string | null;
  rules: TripRule[];
  providesHelmet: boolean | null;
}

export type TripGroupStatus =
  'OPEN' | 'EXPIRED' | 'REVOKED' | 'CONFIRMED' | 'CLOSED';

export interface TripGroupView extends TripGroupPreview {
  id: string;
  status: TripGroupStatus;
  isOrganizer: boolean;
  consentedMembers: number;
  members: { name: string | null; isSelf: boolean; isOrganizer: boolean }[];
  confirmedAt: string | null;
}

export interface CreatedTripGroup {
  group: TripGroupView;
  invitationCode: string;
}
