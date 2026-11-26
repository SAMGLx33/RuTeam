import { expect, test } from '@jest/globals';
import { RoutingSelections } from '../dist/src/modules/trips/application/routing-selections.js';

const choice = new RoutingSelections({});
const stops = [
  { latitude: 3.4, longitude: -76.55 },
  { latitude: 3.42, longitude: -76.53 },
  { latitude: 3.44, longitude: -76.52 },
];
const geometry = {
  type: 'LineString',
  coordinates: stops.map(({ latitude, longitude }) => [longitude, latitude]),
};
const route = {
  geometry,
  distanceMeters: 8000,
  durationMinutes: 20,
  legDurationsSeconds: [600, 600],
};

test('firma los tramos temporales sólo para el conductor y la alternativa exacta', () => {
  const { routingSelection } = choice.offer('driver', stops, route, 1000000);
  expect(
    choice.verify(routingSelection, 'driver', stops, geometry, 20, 1010000),
  ).toMatchObject({
    legs: [600, 600],
    distance: 8000,
  });
  for (const [token, actor, points, line, duration, now] of [
    [`${routingSelection}x`, 'driver', stops, geometry, 20, 1010000],
    [routingSelection, 'someone-else', stops, geometry, 20, 1010000],
    [routingSelection, 'driver', [...stops].reverse(), geometry, 20, 1010000],
    [routingSelection, 'driver', stops, undefined, 20, 1010000],
    [routingSelection, 'driver', stops, geometry, 30, 1010000],
    [routingSelection, 'driver', stops, geometry, 20, 2800000],
  ])
    expect(() =>
      choice.verify(token, actor, points, line, duration, now),
    ).toThrow(/expiró o cambió/);
});
