import assert from 'node:assert/strict';
import test from 'node:test';
import type { RouteManeuver } from '../../packages/contracts/src/routes.ts';
import {
  estimateRouteProgress,
  prepareNavigation,
} from '../src/features/trips/route-progress.ts';

const clock = 65000;
const fix = {
  latitude: 0,
  longitude: 0,
  accuracy: 8,
  heading: null,
  speed: null,
  timestamp: clock,
};
const steps: RouteManeuver[] = [
  {
    order: 0,
    leg: 0,
    kind: 'DEPART',
    modifier: null,
    street: 'Primera vía',
    latitude: 0,
    longitude: -0.001,
    distanceMeters: 220,
    durationSeconds: 30,
    geometry: {
      type: 'LineString',
      coordinates: [
        [-0.001, 0],
        [0.001, 0],
      ],
    },
    stopPosition: 0,
  },
  {
    order: 1,
    leg: 0,
    kind: 'TURN',
    modifier: 'LEFT',
    street: 'Segunda vía',
    latitude: 0,
    longitude: 0.001,
    distanceMeters: 440,
    durationSeconds: 60,
    geometry: {
      type: 'LineString',
      coordinates: [
        [0.001, 0],
        [0.001, 0.001],
        [0, 0.001],
        [0, -0.001],
      ],
    },
    stopPosition: null,
  },
];
const navigation = prepareNavigation(steps);

test('un cruce no produce indicaciones hasta que el rumbo o la continuidad lo distinguen', () => {
  assert.equal(
    estimateRouteProgress(navigation, fix, null, clock).status,
    'AMBIGUOUS',
  );
  const heading = estimateRouteProgress(
    navigation,
    { ...fix, heading: 90, speed: 4 },
    null,
    clock,
  );
  assert.equal(heading.status, 'ON_ROUTE');
  if (heading.status !== 'ON_ROUTE') return;
  assert.equal(heading.next?.maneuver.street, 'Segunda vía');
  assert.ok(heading.meters > 99 && heading.meters < 121);
  const prior = estimateRouteProgress(
    navigation,
    { ...fix, longitude: -0.0004, timestamp: clock - 2000 },
    null,
    clock,
  );
  assert.equal(prior.status, 'ON_ROUTE');
  if (prior.status === 'ON_ROUTE')
    assert.equal(
      estimateRouteProgress(navigation, fix, prior, clock).status,
      'ON_ROUTE',
    );
});

test('caducidad, precisión insuficiente y separación de la ruta tienen estados distintos', () => {
  assert.equal(
    estimateRouteProgress(
      navigation,
      { ...fix, timestamp: clock - 31000 },
      null,
      clock,
    ).status,
    'STALE',
  );
  assert.equal(
    estimateRouteProgress(navigation, { ...fix, accuracy: 100 }, null, clock)
      .status,
    'IMPRECISE',
  );
  assert.equal(
    estimateRouteProgress(navigation, { ...fix, latitude: 0.01 }, null, clock)
      .status,
    'OFF_ROUTE',
  );
});
