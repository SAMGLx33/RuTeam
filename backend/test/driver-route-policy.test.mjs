import { expect, test } from '@jest/globals';
import {
  matchStops,
  tripDirection,
  validateGeometry,
} from '../dist/src/modules/trips/domain/models/driver-route.js';

const point = (position, access, longitude, campus = null) => ({
  id: String(position),
  position,
  access,
  longitude,
  latitude: 3.4,
  campus,
  campusPointId: null,
});
const origin = point(0, 'PICKUP', -76.5, 'USC');
const middle = point(1, 'WAYPOINT', -76.52);
const pickup = point(2, 'BOTH', -76.54);
const end = point(3, 'DROPOFF', -76.57);
const stops = [origin, middle, pickup, end];
const near = (longitude) => ({ latitude: 3.4, longitude });
const geometry = {
  type: 'LineString',
  coordinates: stops.map((stop) => [stop.longitude, stop.latitude]),
};
const query = (from, to) => ({ from, to, radiusKm: 0.2 });

test('matching pairs only authorized stops in the travel direction without changing them', () => {
  const snapshot = stops.map((stop) => ({ ...stop }));
  expect(matchStops(stops, query(near(-76.54), near(-76.57)))).toMatchObject({
    pickupId: '2',
    dropoffId: '3',
  });
  expect(matchStops(stops, query(near(-76.57), near(-76.5)))).toBeNull();
  expect(matchStops(stops, query(near(-76.52), near(-76.57)))).toBeNull();
  expect(matchStops(stops, query('USC', near(-76.57)))).toMatchObject({
    pickupId: '0',
    dropoffId: '3',
  });
  expect(stops).toEqual(snapshot);
});

test('geometry must follow the published point order and use finite, two-dimensional coordinates', () => {
  expect(() => validateGeometry(geometry, stops)).not.toThrow();
  expect(() =>
    validateGeometry(
      { ...geometry, coordinates: [...geometry.coordinates].reverse() },
      stops,
    ),
  ).toThrow();
  expect(() =>
    validateGeometry(
      {
        ...geometry,
        coordinates: [
          [-76.5, 3.4, 99],
          [-76.57, 3.4],
        ],
      },
      stops,
    ),
  ).toThrow();
});

test('una pasada posterior más cercana no descarta paradas válidas de la primera vuelta', () => {
  const repeated = {
    type: 'LineString',
    coordinates: [
      [-76.5, 3.4],
      [-76.52, 3.401],
      [-76.54, 3.4],
      [-76.54, 3.42],
      [-76.52, 3.42],
      [-76.52, 3.4],
      [-76.57, 3.38],
    ],
  };
  const ordered = [...stops.slice(0, -1), { ...end, latitude: 3.38 }];
  expect(() => validateGeometry(repeated, ordered)).not.toThrow();
});

test('la USC debe ser un extremo asociado al catálogo y el otro debe ser externo', () => {
  const institutional = { ...origin, campusPointId: 'catalog' };
  expect(tripDirection([institutional, pickup, end])).toBe('DESDE_USC');
  expect(tripDirection([pickup, end, institutional])).toBe('HACIA_USC');
  expect(tripDirection([pickup, institutional, end])).toBeNull();
  expect(tripDirection([institutional, institutional])).toBeNull();
  expect(tripDirection([origin, end])).toBeNull();
});
