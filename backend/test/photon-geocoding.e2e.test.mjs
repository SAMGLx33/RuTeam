import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { once } from 'node:events';
import { createServer } from 'node:http';
import request from 'supertest';

let app, provider;
let upstreamRequests = 0;
const originalDatabase = process.env.DATABASE_URL;
const originalProvider = process.env.GEOCODING_BASE_URL;

beforeAll(async () => {
  const { TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    TEST_DATABASE_URL === originalDatabase ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Se requiere una base de pruebas independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;

  provider = createServer((req, res) => {
    upstreamRequests++;
    const query = new URL(req.url, 'http://localhost').searchParams.get('q');
    res.end(
      JSON.stringify({
        type: 'FeatureCollection',
        features:
          query === 'Estadio Cali'
            ? [
                {
                  type: 'Feature',
                  properties: {
                    name: 'Estadio controlado',
                    city: 'Cali',
                    countrycode: 'CO',
                  },
                  geometry: { type: 'Point', coordinates: [-76.54, 3.43] },
                },
              ]
            : [],
      }),
    );
  });
  provider.listen(0, '127.0.0.1');
  await once(provider, 'listening');
  process.env.GEOCODING_BASE_URL = `http://127.0.0.1:${provider.address().port}`;
  const { createApp } = await import('../dist/src/bootstrap.js');
  app = await createApp();
  await app.init();
}, 15000);

afterAll(async () => {
  try {
    await app?.close();
  } finally {
    if (provider?.listening) {
      provider.closeAllConnections();
      await new Promise((resolve, reject) =>
        provider.close((error) => (error ? reject(error) : resolve())),
      );
    }
    if (originalProvider === undefined) delete process.env.GEOCODING_BASE_URL;
    else process.env.GEOCODING_BASE_URL = originalProvider;
    process.env.DATABASE_URL = originalDatabase;
  }
});

const search = (agent) =>
  agent.post('/api/v1/geocoding/search').set('x-ruteam-client', 'native');

test('la búsqueda protegida no llega a Photon sin sesión elegible', async () => {
  const agent = request(app.getHttpServer());
  const previous = upstreamRequests;
  await search(agent).send({ query: 'Estadio Cali' }).expect(401);
  expect(upstreamRequests).toBe(previous);
});

test('valida texto, mantiene la búsqueda fuera de caché y sólo devuelve el resultado público', async () => {
  const agent = request(app.getHttpServer());
  const login = await agent
    .post('/api/v1/auth/demo/login')
    .set('x-ruteam-client', 'native')
    .send({ identity: 'ana' })
    .expect(201);
  const authorized = () =>
    search(agent).auth(login.body.token, { type: 'bearer' });
  const previous = upstreamRequests;
  await authorized().send({ query: '  ' }).expect(400);
  await authorized().send({ query: 'Cali\nPalmira' }).expect(400);
  await authorized()
    .send({ query: 'Estadio Cali', provider: 'https://example.invalid' })
    .expect(400);
  expect(upstreamRequests).toBe(previous);
  const result = await authorized()
    .send({ query: ' Estadio Cali ' })
    .expect(200)
    .expect('Cache-Control', 'no-store');
  expect(result.body).toEqual({
    items: [
      {
        label: 'Estadio controlado',
        context: 'Cali',
        latitude: 3.43,
        longitude: -76.54,
      },
    ],
    attribution: 'Datos © OpenStreetMap contributors',
  });
  expect(upstreamRequests).toBe(previous + 1);
});
