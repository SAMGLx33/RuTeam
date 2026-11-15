import { test, expect } from '@jest/globals';
import { Viaje } from '../dist/src/modules/trips/domain/models/viaje.js';
import { VehiculoPolicy } from '../dist/src/modules/vehicles/domain/policies/vehiculo.policy.js';
const now = new Date('2026-11-13T12:00:00Z');
const input = {
  departureAt: '2026-11-13T13:00:00Z',
  estimatedDurationMinutes: 45,
  offeredSeats: 3,
  stops: [{ position: 1 }, { position: 2 }],
};
test('intervalo DEMO y ocupación derivados sin alterar ciclo de vida', () => {
  expect(Viaje.validarPublicacion(input, now).toISOString()).toBe(
    '2026-11-13T13:45:00.000Z',
  );
  expect(Viaje.ocupacion(3, 0)).toBe('DISPONIBLE');
  expect(Viaje.ocupacion(3, 3)).toBe('LLENO');
});
test('límite de treinta minutos es estricto y paradas consecutivas', () => {
  expect(() =>
    Viaje.validarPublicacion(
      { ...input, departureAt: '2026-11-13T12:30:00Z' },
      now,
    ),
  ).toThrow();
  expect(() =>
    Viaje.validarPublicacion({ ...input, stops: [{ position: 2 }] }, now),
  ).toThrow();
});
test.each([
  ['CAR', 1, true],
  ['CAR', 4, true],
  ['CAR', 5, false],
  ['MOTORCYCLE', 1, true],
  ['MOTORCYCLE', 2, false],
  ['CAR', 0, false],
  ['CAR', 1.5, false],
])('capacidad %s %s', (type, n, valid) => {
  if (valid)
    expect(() => VehiculoPolicy.validarCapacidad(type, n)).not.toThrow();
  else expect(() => VehiculoPolicy.validarCapacidad(type, n)).toThrow();
});
test.each([
  null,
  { reviewStatus: 'PENDING', demo: true, expiresAt: new Date('2030-01-01') },
  { reviewStatus: 'APPROVED', demo: true, expiresAt: now },
])('documento no publicable %j', (document) =>
  expect(VehiculoPolicy.esPublicable(document, now)).toBe(false),
);
