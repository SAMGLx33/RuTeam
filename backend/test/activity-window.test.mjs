import { expect, test } from '@jest/globals';
import {
  overlap,
  segmentWindow,
} from '../dist/src/modules/trips/domain/activity-window.js';

test('los intervalos son semiabiertos y un tramo sin tiempos usa la ventana completa', () => {
  const trip = {
    departureAt: new Date('2031-03-04T14:00:00Z'),
    expectedEndAt: new Date('2031-03-04T15:00:00Z'),
    estimatedDurationMinutes: 60,
    status: 'PROGRAMADO',
  };
  const p = (estimatedOffsetSeconds) => ({ estimatedOffsetSeconds });
  expect(
    overlap(
      segmentWindow(trip, p(0), p(1800)),
      segmentWindow(trip, p(1800), p(3600)),
    ),
  ).toBe(false);
  expect(
    overlap(
      segmentWindow(trip, p(null), p(1800)),
      segmentWindow(trip, p(1800), p(3600)),
    ),
  ).toBe(true);
  expect(
    segmentWindow(
      { ...trip, estimatedDepartureAt: new Date('2031-03-04T14:10:00Z') },
      p(0),
      p(1800),
    ).end.toISOString(),
  ).toBe('2031-03-04T14:40:00.000Z');
});

test('salida próxima, demora, vencimiento e inicio son estados independientes del reloj original', async () => {
  const { departureState } =
    await import('../dist/src/modules/trips/domain/departure-state.js');
  const trip = {
    departureAt: new Date('2031-03-04T14:00:00Z'),
    expectedEndAt: new Date('2031-03-04T15:00:00Z'),
    estimatedDurationMinutes: 60,
    status: 'PROGRAMADO',
    expiredAt: null,
  };
  expect(departureState(trip, new Date('2031-03-04T13:30:00Z'))).toBe('SOON');
  expect(departureState(trip, new Date('2031-03-04T14:00:00Z'))).toBe(
    'DELAYED',
  );
  expect(departureState(trip, new Date('2031-03-04T15:30:00Z'))).toBe(
    'EXPIRED',
  );
  expect(
    departureState(
      { ...trip, status: 'EN_CURSO' },
      new Date('2031-03-04T18:00:00Z'),
    ),
  ).toBe('STARTED');
});
