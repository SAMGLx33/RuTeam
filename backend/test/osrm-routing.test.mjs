import { expect, test } from '@jest/globals';
import { createServer } from 'node:http';
import { once } from 'node:events';
import { OsrmRoutingProvider } from '../dist/src/modules/trips/infrastructure/routing/osrm-routing.provider.js';

const origin = { label: 'Punto DEMO A', latitude: 3.4, longitude: -76.55 };
const destination = {
  label: 'Punto DEMO B',
  latitude: 3.46,
  longitude: -76.51,
};
const geometry = {
  type: 'LineString',
  coordinates: [
    [-76.55, 3.4],
    [-76.54, 3.43],
    [-76.51, 3.46],
  ],
};

test('OSRM ausente se informa y no inventa una alternativa vial', async () => {
  await expect(
    new OsrmRoutingProvider({}).options([origin, destination]),
  ).rejects.toThrow('Motor vial sin configurar');
});

test('solicita alternativas GeoJSON y descarta geometrías incompatibles del motor', async () => {
  let requestUrl;
  const server = createServer((req, res) => {
    requestUrl = req.url;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        code: 'Ok',
        routes: [
          { distance: 8100, duration: 800, geometry },
          {
            distance: 8100,
            duration: 800,
            geometry: {
              ...geometry,
              coordinates: [...geometry.coordinates].reverse(),
            },
          },
        ],
      }),
    );
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const provider = new OsrmRoutingProvider({
      ROUTING_BASE_URL: `http://127.0.0.1:${server.address().port}`,
    });
    await expect(provider.options([origin, destination])).resolves.toEqual([
      { distanceMeters: 8100, durationMinutes: 13, geometry },
    ]);
    expect(requestUrl).toContain(
      '/route/v1/driving/-76.550000,3.400000;-76.510000,3.460000?',
    );
    expect(requestUrl).toContain('geometries=geojson');
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});

test('pide las maniobras y normaliza sus tramos sin deducir giros de la línea general', async () => {
  let requestUrl;
  const start = [-76.55, 3.4];
  const change = [-76.54, 3.43];
  const end = [-76.51, 3.46];
  const line = (...coordinates) => ({ type: 'LineString', coordinates });
  const sample = {
    distance: 8100,
    duration: 800,
    geometry,
    legs: [
      {
        duration: 800,
        distance: 8100,
        steps: [
          {
            distance: 4500,
            duration: 400,
            name: 'Avenida de prueba',
            geometry: line(start, change),
            maneuver: { location: start, type: 'depart' },
          },
          {
            distance: 3600,
            duration: 400,
            name: 'Calle Pública',
            geometry: line(change, end),
            maneuver: { location: change, type: 'turn', modifier: 'left' },
          },
          {
            distance: 0,
            duration: 0,
            name: 'Calle Pública',
            geometry: line(end, end),
            maneuver: { location: end, type: 'arrive' },
          },
        ],
      },
    ],
  };
  const server = createServer((req, res) => {
    requestUrl = req.url;
    res.setHeader('content-type', 'application/json');
    res.end(
      JSON.stringify({
        code: 'Ok',
        routes: [
          sample,
          {
            ...sample,
            legs: [
              {
                duration: 800,
                distance: 8100,
                steps: [{ maneuver: { location: [999, 3.4], type: 'turn' } }],
              },
            ],
          },
        ],
      }),
    );
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const provider = new OsrmRoutingProvider({
      ROUTING_BASE_URL: `http://127.0.0.1:${server.address().port}`,
    });
    const [valid, malformed] = await provider.options([origin, destination]);
    expect(requestUrl).toContain('steps=true');
    expect(valid.maneuvers).toEqual([
      {
        order: 0,
        leg: 0,
        kind: 'DEPART',
        modifier: null,
        street: 'Avenida de prueba',
        latitude: 3.4,
        longitude: -76.55,
        distanceMeters: 4500,
        durationSeconds: 400,
        geometry: line(start, change),
        stopPosition: 0,
      },
      {
        order: 1,
        leg: 0,
        kind: 'TURN',
        modifier: 'LEFT',
        street: 'Calle Pública',
        latitude: 3.43,
        longitude: -76.54,
        distanceMeters: 3600,
        durationSeconds: 400,
        geometry: line(change, end),
        stopPosition: null,
      },
      {
        order: 2,
        leg: 0,
        kind: 'ARRIVE',
        modifier: null,
        street: 'Calle Pública',
        latitude: 3.46,
        longitude: -76.51,
        distanceMeters: 0,
        durationSeconds: 0,
        geometry: line(end, end),
        stopPosition: 1,
      },
    ]);
    expect(malformed.geometry).toEqual(geometry);
    expect(malformed.maneuvers).toBeUndefined();
  } finally {
    await new Promise((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
