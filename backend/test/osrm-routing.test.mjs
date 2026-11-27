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
