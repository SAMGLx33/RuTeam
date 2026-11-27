import type { TripDirection } from './routes.js';

export interface TripSafetyContext {
  status: 'EN_CURSO';
  direction: TripDirection | null;
  departureAt: string;
  startedAt: string | null;
  reachedStop: { label: string; reachedAt: string } | null;
  nextStop: { label: string; estimatedAt: string | null } | null;
}

export interface EmergencyContactInput {
  name: string;
  phone: string;
  relationship?: string | null;
  available: boolean;
}

export interface EmergencyContact extends EmergencyContactInput {
  id: string;
  relationship: string | null;
}

export type TripIncidentKind =
  | 'ROAD_SAFETY'
  | 'TRIP_PROBLEM'
  | 'CONDUCT'
  | 'TERMS'
  | 'VEHICLE'
  | 'ECONOMIC'
  | 'TECHNICAL'
  | 'OTHER';

export interface TripIncidentInput {
  kind: TripIncidentKind;
  description: string;
}

export interface TripIncident extends TripIncidentInput {
  id: string;
  createdAt: string;
  status: 'PRIVATE_RECORD';
}

export interface TripIncidentHistory {
  canCreate: boolean;
  records: TripIncident[];
}

export interface IncidentTripContext {
  id: string;
  departureAt: string;
  originLabel: string;
  status: import('./index.js').TripSummary['status'];
}

export interface PersonalIncident extends TripIncident {
  trip: IncidentTripContext;
}

export interface PersonalIncidentsPage {
  records: PersonalIncident[];
  nextOffset: number | null;
}

export interface IncidentExport {
  record: PersonalIncident;
}
