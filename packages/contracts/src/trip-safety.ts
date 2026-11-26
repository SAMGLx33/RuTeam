import type { TripDirection } from './routes.js';

export interface TripSafetyContext {
  status: 'EN_CURSO';
  direction: TripDirection | null;
  departureAt: string;
  startedAt: string | null;
  reachedStop: { label: string; reachedAt: string } | null;
  nextStop: { label: string; estimatedAt: string | null } | null;
}
