import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { upcomingTrip } from '../src/features/home/upcoming-trip.ts';

const now = Date.parse('2030-10-20T15:00:00Z');
const delayed = {
  tripStatus: 'PROGRAMADO',
  departureAt: '2030-10-20T14:50:00Z',
  estimatedDepartureAt: '2030-10-20T15:20:00Z',
} as const;
const scheduled = {
  tripStatus: 'PROGRAMADO',
  departureAt: '2030-10-20T15:30:00Z',
} as const;
test('prioriza la salida retrasada vigente sin cambiar el horario publicado', () => {
  assert.equal(upcomingTrip([scheduled, delayed], now), delayed);
  assert.equal(
    upcomingTrip(
      [scheduled, { ...delayed, expiredAt: '2030-10-20T14:59:59Z' }],
      now,
    ),
    scheduled,
  );
});
test('un viaje activo conserva prioridad aunque su hora anterior ya pasó', () => {
  const active = {
    status: 'EN_CURSO',
    departureAt: '2030-10-20T13:00:00Z',
  } as const;
  assert.equal(upcomingTrip([scheduled, active], now), active);
});
