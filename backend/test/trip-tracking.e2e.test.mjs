import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, campus, vehicle, tripId;
const tokens = new Map();

function call(actor, method, path) {
  const client = request(app.getHttpServer());
  const exchange = client[method](`/api/v1${path}`).set(
    'x-ruteam-client',
    'native',
  );
  const token = tokens.get(actor);
  return token ? exchange.auth(token, { type: 'bearer' }) : exchange;
}

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Seguimiento requiere una base de pruebas independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  for (const identity of ['diego', 'ana', 'sara']) {
    const { body } = await call(null, 'post', '/auth/login')
      .send({
        email: `${identity}@student-fixtures.ruteam.invalid`,
        password: process.env.AUTH_FIXTURE_PASSWORD,
      })
      .expect(200);
    tokens.set(identity, body.token);
  }
  campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-ENTRADA' },
  });
  vehicle = await db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } });
}, 15000);

afterAll(async () => {
  if (tripId) {
    await db.reservation.deleteMany({ where: { tripId } });
    await db.trip.delete({ where: { id: tripId } });
  }
  await app?.close();
});

test('una ubicación voluntaria sólo se consulta en viaje activo, vence y se borra al finalizar', async () => {
  const { body: trip } = await call('diego', 'post', '/trips')
    .send({
      vehicleId: vehicle.id,
      departureAt: new Date(Date.now() + 65 * 3600000).toISOString(),
      estimatedDurationMinutes: 40,
      offeredSeats: 1,
      ruleIds: [],
      itinerary: {
        direction: 'DESDE_USC',
        publicMeetingPoints: true,
        origin: { campusPointId: campus.id },
        destination: {
          label: 'Zona pública del ensayo',
          latitude: 3.44,
          longitude: -76.52,
          instructions: 'Espera en espacio público',
        },
        stops: [],
        description: 'Ruta de la prueba de seguimiento',
      },
    })
    .expect(201);
  tripId = trip.id;
  const [origin, destination] = trip.itinerary.stops;
  const path = `/trips/${tripId}/location`;
  const sample = {
    latitude: 3.40391,
    longitude: -76.54879,
    capturedAt: new Date().toISOString(),
  };
  await call('diego', 'post', path).send(sample).expect(404);
  const { body: participation } = await call(
    'ana',
    'post',
    `/trips/${tripId}/participations`,
  )
    .send({ pickupId: origin.id, dropoffId: destination.id })
    .expect(201);
  await db.trip.update({
    where: { id: tripId },
    data: {
      departureAt: new Date(Date.now() + 5 * 60000),
      expectedEndAt: new Date(Date.now() + 45 * 60000),
    },
  });
  await call('diego', 'post', `/trips/${tripId}/transition`)
    .send({ action: 'START' })
    .expect(200);
  const empty = await call('ana', 'get', path).expect(200);
  expect(empty.headers['cache-control']).toBe('private, no-store');
  expect(empty.body).toEqual({ canShare: false, sample: null, route: null });
  await call('ana', 'post', path).send(sample).expect(404);
  await call('sara', 'get', path).expect(404);
  await call('diego', 'post', path)
    .send({ ...sample, latitude: 91 })
    .expect(400);
  await call('diego', 'post', path)
    .send({ ...sample, capturedAt: '2000-01-01T00:00:00.000Z' })
    .expect(400);
  await call('diego', 'post', path).send(sample).expect(204);
  const viewed = await call('ana', 'get', path).expect(200);
  expect(viewed.body.canShare).toBe(false);
  expect(viewed.body.sample).toEqual({
    ...sample,
    sharedAt: expect.any(String),
  });
  expect(viewed.body.route).toEqual({
    geometry: null,
    stops: [
      { latitude: origin.latitude, longitude: origin.longitude },
      { latitude: destination.latitude, longitude: destination.longitude },
    ],
  });
  await call('diego', 'post', path).send(sample).expect(429);
  await call('ana', 'delete', path).expect(404);
  await call('diego', 'delete', path).expect(204);
  await call('diego', 'delete', path).expect(204);
  expect((await call('ana', 'get', path).expect(200)).body.sample).toBeNull();

  await call('diego', 'post', path).send(sample).expect(204);
  await db.tripDriverPosition.update({
    where: { tripId },
    data: { sharedAt: new Date(Date.now() - 121000) },
  });
  expect((await call('ana', 'get', path).expect(200)).body.sample).toBeNull();
  await call('diego', 'post', path).send(sample).expect(204);
  await call(
    'diego',
    'post',
    `/participations/${participation.id}/no-show`,
  ).expect(200);
  await call('ana', 'get', path).expect(404);
  await call('diego', 'post', `/trips/${tripId}/transition`)
    .send({ action: 'FINISH' })
    .expect(200);
  await call('diego', 'get', path).expect(404);
  await call('diego', 'post', path).send(sample).expect(404);
  expect(
    await db.tripDriverPosition.findUnique({ where: { tripId } }),
  ).toBeNull();
});
