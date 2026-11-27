import type { RouteGeometry } from './routes.js';

export interface TripDriverLocationInput {
  latitude: number;
  longitude: number;
  capturedAt: string;
}

export interface TripTrackingView {
  state: 'AVAILABLE' | 'STALE' | 'NOT_SHARED' | 'ENDED';
  canShare: boolean;
  expiresAt?: string;
  sample: (TripDriverLocationInput & { sharedAt: string }) | null;
  route: {
    geometry: RouteGeometry | null;
    stops: Array<Pick<TripDriverLocationInput, 'latitude' | 'longitude'>>;
  } | null;
}
