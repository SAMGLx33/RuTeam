export interface MobilityTotals {
  driverTrips: number;
  passengerTrips: number;
  sharedTrips: number;
  transportedParticipants: number;
  driverDistanceMeters: number | null;
  driverTripsWithDistance: number;
  passengerDistanceMeters: number | null;
  passengerTripsWithDistance: number;
}

export type EnergySource =
  'GASOLINE' | 'GASOLINE_E10' | 'DIESEL' | 'COLOMBIAN_GRID' | 'OTHER';
export type PropulsionType = 'COMBUSTION' | 'HYBRID' | 'ELECTRIC' | 'OTHER';
export type ConsumptionUnit = 'KM_PER_L' | 'L_PER_100_KM' | 'KWH_PER_100_KM';
export type AlternativeMode =
  | 'UNSPECIFIED'
  | 'CAR'
  | 'MOTORCYCLE'
  | 'PUBLIC_TRANSIT'
  | 'CYCLE'
  | 'WALK'
  | 'OTHER';

export interface VehicleEnergyInput {
  propulsion: PropulsionType;
  source: EnergySource;
  average?: number;
  unit?: ConsumptionUnit;
}
export interface VehicleEnergyProfile extends VehicleEnergyInput {
  provenance: 'DECLARED';
  normalizedPer100Km: number | null;
}

export interface EmissionFactor {
  id: string;
  version: string;
  source: EnergySource;
  reference: string;
  value: number;
  unit: 'KG_CO2_PER_US_GAL' | 'KG_CO2E_PER_KWH';
  scope: 'DIRECT_FUEL_CO2' | 'INDIRECT_GRID_CO2E';
  available: true;
}
export type EmissionScope = EmissionFactor['scope'];
export type EnvironmentalMissing =
  | 'VEHICLE_ENERGY'
  | 'ROUTE_DISTANCE'
  | 'FACTOR'
  | 'SEGMENT_DISTANCE'
  | 'NO_SNAPSHOT';
export interface EnvironmentalTrip {
  tripId: string;
  role: 'DRIVER' | 'PASSENGER';
  period: string;
  distanceMeters: number | null;
  vehicleKg: number | null;
  attributedKg: number | null;
  factor: EmissionFactor | null;
  methodology: string | null;
  calculatedAt: string | null;
  missing: EnvironmentalMissing | null;
  alternative: { mode: AlternativeMode; differenceKg: number | null } | null;
  canDeclareAlternative: boolean;
  dropoffBasis?: 'CONFIRMED_STOP' | 'PLANNED_STOP';
}
export interface EnvironmentalTotals {
  period: string | null;
  role: EnvironmentalTrip['role'];
  scope: EmissionScope;
  vehicleKg: number | null;
  attributedKg: number | null;
  trips: number;
}

export interface MobilityStatistics {
  months: number;
  totals: MobilityTotals;
  monthly: (MobilityTotals & { period: string })[];
  environmental:
    | {
        status: 'NO_DATA';
        missing: Partial<Record<EnvironmentalMissing, number>>;
        totals: [];
      }
    | {
        status: 'AVAILABLE';
        missing: Partial<Record<EnvironmentalMissing, number>>;
        totals: EnvironmentalTotals[];
      };
}
