/** API v1. Tipos públicos; ninguna regla de negocio vive en este paquete. */
export type InstitutionalGroup =
  'STUDENT' | 'TEACHER' | 'ADMINISTRATIVE' | 'WORKER' | 'OTHER';
export interface CurrentUser {
  id: string;
  email: string;
  role: 'MEMBER' | 'ADMIN';
  capabilities: { passenger: true; driver: boolean };
  profile: { displayName: string };
  membership: {
    status: 'ACTIVE';
    group: InstitutionalGroup;
    verifiedBy: 'DEMO';
    validUntil: string;
  };
  demo: true;
}
export interface DemoLoginInput {
  identity: 'ana' | 'diego' | 'laura' | 'admin';
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
export type DocumentReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export interface DemoLicense {
  revision: number;
  userId: string;
  category: 'CAR' | 'MOTORCYCLE' | 'BOTH';
  expiresAt: string;
  reviewStatus: DocumentReviewStatus;
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
  reviewStatus: DocumentReviewStatus;
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
  destination: { id: string; name: string; demo: boolean };
  origin: TripPoint;
  departureAt: string;
  expectedEndAt: string;
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
export interface ReviewDemoDocumentInput {
  decision: 'APPROVED' | 'REJECTED';
  revision: number;
}
export interface PublishTripInput {
  vehicleId: string;
  destinationId: string;
  origin: TripPoint;
  departureAt: string;
  estimatedDurationMinutes: number;
  offeredSeats: number;
  ruleIds: string[];
  stops: (TripPoint & { position: number })[];
  providesHelmet?: boolean;
}
