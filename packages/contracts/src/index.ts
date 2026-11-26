import type { ItineraryInput, TripItinerary } from './routes.js';
export type * from './routes.js';
export type * from './accounts.js';
export type * from './mobility.js';
export type * from './chat.js';

/** API v1. Tipos públicos; ninguna regla de negocio vive en este paquete. */
export type InstitutionalGroup =
  'STUDENT' | 'TEACHER' | 'ADMINISTRATIVE' | 'WORKER' | 'OTHER';
export interface CurrentUser {
  id: string;
  email: string;
  capabilities: { passenger: true; driver: boolean };
  profile: { displayName: string };
  membership: {
    status: 'ACTIVE';
    group: InstitutionalGroup;
    verifiedBy: string;
    validUntil: string;
  };
  demo: boolean;
}
export interface DemoLoginInput {
  identity: 'ana' | 'diego' | 'laura' | 'sara';
}
export interface DemoLoginResponse {
  user: CurrentUser;
  expiresAt: string;
  token?: string;
}
export interface CampusDestination {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  demo: boolean;
}

export type VehicleType = 'CAR' | 'MOTORCYCLE';
export type DocumentVerificationStatus =
  'DECLARED' | 'VERIFIED' | 'EXPIRED' | 'UNVERIFIED';
export type DocumentVerificationSource =
  'SELF_DECLARED' | 'AUTHORIZED_SOURCE' | 'LEGACY_REVIEW';
export interface DemoLicense {
  revision: number;
  userId: string;
  category: 'CAR' | 'MOTORCYCLE' | 'BOTH';
  expiresAt: string;
  verificationStatus: DocumentVerificationStatus;
  verificationSource: DocumentVerificationSource;
  demo: boolean;
}
export interface VehicleSummary {
  revision: number;
  id: string;
  plate: string;
  type: VehicleType;
  passengerCapacity: number;
  brand: string;
  modelYear: number;
  color: string;
  demo: boolean;
  soatExpiresAt: string | null;
  verificationStatus: DocumentVerificationStatus;
  verificationSource: DocumentVerificationSource;
  eligibleNow: boolean;
}
export interface TripRule {
  id: string;
  code: string;
  description: string;
}
export interface TripPoint {
  label: string;
  latitude: number;
  longitude: number;
}
export interface TripSummary {
  id: string;
  driverId: string;
  vehicleId: string;
  vehicle: { plate: string; type: VehicleType };
  destination: { id: string | null; name: string; demo: boolean };
  itinerary: TripItinerary | null;
  origin: TripPoint;
  departureAt: string;
  expectedEndAt: string;
  startedAt?: string | null;
  finishedAt?: string | null;
  estimatedDurationMinutes: number;
  offeredSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  status: 'PROGRAMADO' | 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO';
  occupancy: 'DISPONIBLE' | 'LLENO';
  locationMode: string;
  providesHelmet: boolean | null;
  stops: (TripPoint & { position: number })[];
  rules: TripRule[];
}

export interface RegisterVehicleInput {
  plate: string;
  type: VehicleType;
  passengerCapacity: number;
  brand: string;
  modelYear: number;
  color: string;
  soatExpiresAt: string;
}
export interface RegisterDemoLicenseInput {
  category: 'CAR' | 'MOTORCYCLE' | 'BOTH';
  expiresAt: string;
}
export interface PublishTripInput {
  vehicleId: string;
  departureAt: string;
  estimatedDurationMinutes: number;
  offeredSeats: number;
  ruleIds: string[];
  providesHelmet?: boolean;
  itinerary: ItineraryInput;
}

export * from './ratings.js';
export type { TripSafetyContext } from './trip-safety.js';
export type {
  TripExpenseDetails,
  TripExpenseEstimate,
  TripExpenseInput,
} from './expenses.js';
export type * from './groups.js';
export type * from './trip-tracking.js';
export type * from './boarding.js';
