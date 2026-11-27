import { expect, test } from '@jest/globals';
import {
  alternativeDifference,
  calculateTrip,
  emissionKg,
  normalizeEnergy,
  snapshotEnergy,
} from '../dist/src/modules/mobility/domain/emissions.js';
import { segmentDistances } from '../dist/src/modules/mobility/domain/emission-segments.js';

const gasoline = {
  propulsion: 'COMBUSTION',
  source: 'GASOLINE',
  average: 20,
  unit: 'KM_PER_L',
};
const energy = snapshotEnergy(normalizeEnergy(gasoline));

test('normaliza litros y electricidad y conserva el indicador publicado', () => {
  expect(energy.profile.normalizedPer100Km).toBe(5);
  expect(emissionKg(100000, energy)).toBeCloseTo((5 * 8.808) / 3.7854118, 12);
  const equivalent = snapshotEnergy(
    normalizeEnergy({ ...gasoline, average: 5, unit: 'L_PER_100_KM' }),
  );
  expect(emissionKg(100000, equivalent)).toBe(emissionKg(100000, energy));
  expect(energy.factor).toMatchObject({
    unit: 'KG_CO2_PER_US_GAL',
    scope: 'DIRECT_FUEL_CO2',
  });
  const electric = snapshotEnergy(
    normalizeEnergy({
      propulsion: 'ELECTRIC',
      source: 'COLOMBIAN_GRID',
      average: 15,
      unit: 'KWH_PER_100_KM',
    }),
  );
  expect(emissionKg(100000, electric)).toBeCloseTo(3.3, 12);
  expect(electric.factor).toMatchObject({
    unit: 'KG_CO2E_PER_KWH',
    scope: 'INDIRECT_GRID_CO2E',
  });
  expect(emissionKg(-1, energy)).toBeNull();
  expect(() => normalizeEnergy({ ...gasoline, average: 0 })).toThrow();
  expect(() =>
    normalizeEnergy({ ...gasoline, unit: 'KWH_PER_100_KM' }),
  ).toThrow();
  expect(
    emissionKg(
      100000,
      snapshotEnergy(normalizeEnergy({ ...gasoline, source: 'OTHER' })),
    ),
  ).toBeNull();
  expect(
    emissionKg(
      100000,
      snapshotEnergy(
        normalizeEnergy({ propulsion: 'COMBUSTION', source: 'GASOLINE' }),
      ),
    ),
  ).toBeNull();
});

test('reparte los tramos según ocupación efectiva y conserva el total sin redondeos intermedios', () => {
  const result = calculateTrip(new Date(0), energy, 12000, [5000, 7000], 2, [
    { first: 0, last: 2, userId: 'full' },
    { first: 0, last: 1, userId: 'partial' },
  ]);
  expect(result.occupants).toEqual([3, 2]);
  expect(result.riders[1].distanceMeters).toBe(5000);
  expect(result.riders[1].kg).toBeCloseTo(emissionKg(5000, energy) / 3, 12);
  expect(
    result.driverKg +
      result.riders.reduce((total, rider) => total + rider.kg, 0),
  ).toBeCloseTo(result.vehicleKg, 12);
  const alternative = alternativeDifference(
    { mode: 'WALK', energy: null },
    5000,
    result.riders[1].kg,
    energy.factor,
  );
  expect(alternative).toBe(-result.riders[1].kg);
  expect(
    alternativeDifference(
      { mode: 'CAR', energy },
      5000,
      result.riders[1].kg,
      energy.factor,
    ),
  ).toBeGreaterThan(0);
  expect(
    alternativeDifference(
      { mode: 'PUBLIC_TRANSIT', energy: null },
      5000,
      result.riders[1].kg,
      energy.factor,
    ),
  ).toBeNull();
  const unknown = calculateTrip(new Date(0), energy, 12000, null, 2, [
    { first: 0, last: 1, userId: 'partial' },
  ]);
  expect(unknown).toMatchObject({
    driverKg: null,
    missing: 'SEGMENT_DISTANCE',
    riders: [{ kg: null, distanceMeters: null }],
  });
});

test('estima longitudes sobre la geometría publicada y rechaza anclajes no comprobables', () => {
  const points = [
    [-76.5, 3.4],
    [-76.49, 3.4],
    [-76.48, 3.4],
  ];
  const stops = points.map(([longitude, latitude]) => ({
    latitude,
    longitude,
  }));
  const geometry = { type: 'LineString', coordinates: points };
  const segments = segmentDistances(geometry, stops, 2400);
  expect(segments[0]).toBeCloseTo(1200);
  expect(segments[1]).toBeCloseTo(1200);
  expect(
    segmentDistances(
      geometry,
      [stops[0], { latitude: 3, longitude: -76.49 }, stops[2]],
      2400,
    ),
  ).toBeNull();
  expect(
    segmentDistances(geometry, [stops[0], stops[2], stops[1]], 2400),
  ).toBeNull();
});
