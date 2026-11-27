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
  status: TripSummary['status'] | 'WITHDRAWN' | null;
  tripId: string | null;
  scheduleId: string | null;
  failure: string | null;
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
