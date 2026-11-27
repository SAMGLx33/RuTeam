import type {
  AlternativeMode,
  EmissionFactor,
  EnergySource,
  EnvironmentalMissing,
  VehicleEnergyInput,
  VehicleEnergyProfile,
} from '@ruteam/contracts';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';

const fecoc =
  'https://app.upme.gov.co/Calculadora_Emisiones1/new/Informe_Final_FECOC_Correcciones_UPME_FunNatura.pdf#page=31';
const galLiters = 3.7854118;
export const methodology = 'ruteam-operacion-v1';

function fuelFactor(source: EnergySource, value: number): EmissionFactor {
  return {
    id: 'FECOC-2016-' + source,
    version: '2016, tabla 5',
    source,
    value,
    reference: fecoc,
    unit: 'KG_CO2_PER_US_GAL',
    scope: 'DIRECT_FUEL_CO2',
    available: true,
  };
}

const factors: Partial<Record<EnergySource, EmissionFactor>> = {
  GASOLINE: fuelFactor('GASOLINE', 8.808),
  GASOLINE_E10: fuelFactor('GASOLINE_E10', 7.618),
  DIESEL: fuelFactor('DIESEL', 10.18),
  COLOMBIAN_GRID: {
    id: 'UPME-SIN-2024-0085-2026',
    version: 'SIN 2024, Resolución 0085 de 2026',
    source: 'COLOMBIAN_GRID',
    value: 0.22,
    unit: 'KG_CO2E_PER_KWH',
    reference: 'https://docs.upme.gov.co/Normatividad/0085_2026.pdf#page=3',
    scope: 'INDIRECT_GRID_CO2E',
    available: true,
  },
};

export function normalizeEnergy(
  input: VehicleEnergyInput,
): VehicleEnergyProfile {
  const { propulsion, source, average, unit } = input;
  const grid = source === 'COLOMBIAN_GRID';
  if (source !== 'OTHER' && (propulsion === 'ELECTRIC') !== grid)
    throw new DomainPolicyError(
      'La fuente energética debe corresponder a la propulsión',
    );
  if (
    (average === undefined) !== (unit === undefined) ||
    (unit &&
      propulsion !== 'OTHER' &&
      (unit === 'KWH_PER_100_KM') !== (propulsion === 'ELECTRIC')) ||
    (average !== undefined &&
      (!Number.isFinite(average) || average < 0.01 || average > 300))
  )
    throw new DomainPolicyError(
      'Indica un consumo positivo y una unidad compatible, o deja ambos campos vacíos',
    );
  return {
    ...input,
    provenance: 'DECLARED',
    normalizedPer100Km:
      average === undefined
        ? null
        : unit === 'KM_PER_L'
          ? 100 / average
          : average,
  };
}

export interface EmissionInput {
  profile: VehicleEnergyProfile;
  factor: EmissionFactor | null;
  methodology: string;
}
export function snapshotEnergy(
  profile: VehicleEnergyProfile | null,
): EmissionInput | null {
  return profile
    ? { profile, factor: factors[profile.source] ?? null, methodology }
    : null;
}

export function emissionKg(
  meters: number,
  input: EmissionInput | null,
): number | null {
  const average = input?.profile.normalizedPer100Km;
  if (
    !Number.isFinite(meters) ||
    meters < 0 ||
    average == null ||
    !Number.isFinite(average) ||
    average <= 0 ||
    !input?.factor ||
    !Number.isFinite(input.factor.value) ||
    input.factor.value <= 0 ||
    input.factor.source !== input.profile.source
  )
    return null;
  const electric = input.factor.unit === 'KG_CO2E_PER_KWH';
  if (electric !== (input.profile.unit === 'KWH_PER_100_KM')) return null;
  return (
    ((meters / 100_000) * average * input.factor.value) /
    (electric ? 1 : galLiters)
  );
}

export interface EmissionRider {
  userId: string;
  first: number;
  last: number;
  observedDropoff?: boolean;
}

export interface EmissionSnapshot {
  at: string;
  methodology: string;
  factor: EmissionFactor | null;
  vehicleKg: number | null;
  distanceMeters: number | null;
  driverKg: number | null;
  missing: EnvironmentalMissing | null;
  segmentMeters: number[] | null;
  occupants: number[] | null;
  riders: {
    userId: string;
    distanceMeters: number | null;
    kg: number | null;
    dropoffBasis?: 'CONFIRMED_STOP' | 'PLANNED_STOP';
  }[];
}

export function calculateTrip(
  at: Date,
  input: EmissionInput | null,
  meters: number | null,
  segments: number[] | null,
  last: number,
  riders: EmissionRider[],
): EmissionSnapshot {
  const vehicleKg =
    meters !== null && meters > 0 ? emissionKg(meters, input) : null;
  const hasPartial = riders.some(
    (rider) => rider.first !== 0 || rider.last !== last,
  );
  const segmentMeters =
    segments ?? (!hasPartial && meters !== null ? [meters] : null);
  const occupants =
    segmentMeters?.map(
      (_, index) =>
        1 +
        riders.filter(({ first, last: end }) =>
          segments ? first <= index && index < end : true,
        ).length,
    ) ?? null;
  const shares =
    occupants && vehicleKg !== null && segmentMeters && meters
      ? segmentMeters.map(
          (distance, i) => (vehicleKg * (distance / meters)) / occupants[i],
        )
      : null;
  return {
    at: at.toISOString(),
    methodology: input?.methodology ?? methodology,
    factor: input?.factor ?? null,
    vehicleKg,
    distanceMeters: meters,
    driverKg: shares?.reduce((total, kg) => total + kg, 0) ?? null,
    missing: !meters
      ? 'ROUTE_DISTANCE'
      : input?.profile.normalizedPer100Km == null
        ? 'VEHICLE_ENERGY'
        : vehicleKg === null
          ? 'FACTOR'
          : !shares
            ? 'SEGMENT_DISTANCE'
            : null,
    segmentMeters,
    occupants,
    riders: riders.map(({ userId, first, last: end, observedDropoff }) => ({
      dropoffBasis:
        observedDropoff === undefined
          ? undefined
          : observedDropoff
            ? 'CONFIRMED_STOP'
            : 'PLANNED_STOP',
      userId,
      distanceMeters: segments
        ? segments
            .slice(first, end)
            .reduce((total, distance) => total + distance, 0)
        : first === 0 && end === last
          ? meters
          : null,
      kg:
        shares
          ?.slice(segments ? first : 0, segments ? end : 1)
          .reduce((total, kg) => total + kg, 0) ?? null,
    })),
  };
}

export interface MobilityAlternative {
  mode: AlternativeMode;
  energy: EmissionInput | null;
}

export function alternativeDifference(
  alternative: MobilityAlternative,
  distance: number | null,
  attributed: number | null,
  factor: EmissionFactor | null,
) {
  if (distance === null || attributed === null || !factor) return null;
  if (alternative.mode === 'WALK' || alternative.mode === 'CYCLE')
    return -attributed;
  if (alternative.energy?.factor?.scope !== factor.scope) return null;
  const baseline = emissionKg(distance, alternative.energy);
  return baseline === null ? null : baseline - attributed;
}
