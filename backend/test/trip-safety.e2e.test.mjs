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
    throw new Error('Seguridad requiere una base de pruebas independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  for (const identity of ['diego', 'ana', 'sara', 'laura']) {
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

test('el contexto del viaje activo se limita a titular y ocupantes confirmados sin exponer identidades ni coordenadas', async () => {
  const { body: trip } = await call('diego', 'post', '/trips')
    .send({
      vehicleId: vehicle.id,
      departureAt: new Date(Date.now() + 61 * 3600000).toISOString(),
      estimatedDurationMinutes: 40,
      offeredSeats: 2,
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
        description: 'Ruta pública de prueba de seguridad',
      },
    })
    .expect(201);
  tripId = trip.id;
  const [origin, destination] = trip.itinerary.stops;
  const path = `/trips/${tripId}/safety`;
  await call(null, 'get', path).expect(401);
  await call('diego', 'get', path).expect(404);
  const { body: reservation } = await call(
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
  await call('sara', 'get', path).expect(404);
  await call('laura', 'get', path).expect(403);
  const response = await call('ana', 'get', path).expect(200);
  expect(response.headers['cache-control']).toBe('private, no-store');
  expect(response.body).toEqual({
    status: 'EN_CURSO',
    direction: 'DESDE_USC',
    departureAt: expect.any(String),
    startedAt: expect.any(String),
    reachedStop: expect.objectContaining({
      label: origin.label,
      reachedAt: expect.any(String),
    }),
    nextStop: { label: 'Zona pública del ensayo', estimatedAt: null },
  });
  expect(Object.keys(response.body.reachedStop).sort()).toEqual([
    'label',
    'reachedAt',
  ]);
  await call('diego', 'get', path).expect(200);
  await call(
    'diego',
    'post',
    `/participations/${reservation.id}/no-show`,
  ).expect(200);
  await call('ana', 'get', path).expect(404);
  await call('diego', 'post', `/trips/${tripId}/transition`)
    .send({ action: 'FINISH' })
    .expect(200);
  await call('diego', 'get', path).expect(404);
});
