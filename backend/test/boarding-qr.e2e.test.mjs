import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, trip, first, second;
const tokens = new Map();
const users = new Map();
const call = (actor, method, path) => {
  const client = request(app.getHttpServer());
  return client[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens.get(actor), { type: 'bearer' });
};
const issue = (actor, reservation) =>
  call(actor, 'post', `/participations/${reservation.id}/boarding-pass`);
const redeem = (actor, code) =>
  call(actor, 'post', `/trips/${trip.id}/boarding-pass/redeem`).send({ code });

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('QR requiere una base de pruebas independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  for (const identity of ['diego', 'ana', 'sara']) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    tokens.set(identity, response.body.token);
    users.set(identity, response.body.user.id);
  }
  const catalog = (
    await call('diego', 'get', '/campus/meeting-points').expect(200)
  ).body;
  const campus = catalog.find(({ kind }) => kind === 'PLAZA');
  const vehicle = (
    await call('diego', 'get', '/vehicles').expect(200)
  ).body.find(({ plate }) => plate === 'STU123');
  trip = (
    await call('diego', 'post', '/trips')
      .send({
        vehicleId: vehicle.id,
        offeredSeats: 2,
        ruleIds: [],
        estimatedDurationMinutes: 45,
        departureAt: new Date(Date.now() + 189 * 3600000).toISOString(),
        itinerary: {
          description: 'Escaneo QR de prueba',
          publicMeetingPoints: true,
          origin: {
            label: 'Encuentro A QR',
            latitude: 3.47,
            longitude: -76.51,
            instructions: 'Punto público',
          },
          stops: [
            {
              label: 'Encuentro B QR',
              latitude: 3.44,
              longitude: -76.53,
              access: 'PICKUP',
              instructions: 'Punto público',
            },
          ],
          destination: { campusPointId: campus.id },
        },
      })
      .expect(201)
  ).body;
  const [origin, intermediate, dropoff] = trip.itinerary.stops;
  const join = (actor, pickupId) =>
    call(actor, 'post', `/trips/${trip.id}/participations`).send({
      pickupId,
      dropoffId: dropoff.id,
    });
  first = (await join('ana', origin.id).expect(201)).body;
  second = (await join('sara', intermediate.id).expect(201)).body;
});

afterAll(async () => {
  try {
    if (trip) {
      await db.reservation.deleteMany({ where: { tripId: trip.id } });
      await db.trip.delete({ where: { id: trip.id } });
    }
  } finally {
    await app?.close();
  }
});

test('vincula QR a pasajero, parada, titular y expiración y hace atómico el uso concurrente', async () => {
  await issue('sara', first).expect(404);
  await issue('ana', first).expect(409);
  await call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action: 'START' })
    .expect(200);
  await issue('sara', second).expect(409);
  const pass1 = await issue('ana', first).expect(201);
  expect(pass1.headers['cache-control']).toBe('no-store');
  expect(Object.keys(pass1.body).sort()).toEqual(['code', 'expiresAt']);
  expect(pass1.body.code).toMatch(/^ruteam-board:v1:[A-Za-z0-9_-]{43}$/);
  expect(pass1.body.code).not.toContain(users.get('ana'));
  await redeem('sara', pass1.body.code).expect(403);
  const pass2 = (await issue('ana', first).expect(201)).body;
  await redeem('diego', pass1.body.code).expect(409);
  const saved = await db.reservationBoardingPass.findUniqueOrThrow({
    where: { reservationId: first.id },
  });
  expect(saved.tokenHash).not.toContain(pass2.code);
  expect(saved.tokenHash).toMatch(/^[a-f0-9]{64}$/);
  await db.reservationBoardingPass.update({
    where: { reservationId: first.id },
    data: { expiresAt: new Date(Date.now() - 5000) },
  });
  await redeem('diego', pass2.code).expect(409);
  const pass3 = (await issue('ana', first).expect(201)).body;
  const responses = await Promise.all([
    redeem('diego', pass3.code),
    redeem('diego', pass3.code),
  ]);
  expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
  const boarded = responses.find(({ status }) => status === 200).body;
  expect(boarded.id).toBe(first.id);
  expect(boarded.boardedAt).toEqual(expect.any(String));
  expect(
    await db.tripEvent.count({
      where: { tripId: trip.id, type: 'PASSENGER_BOARDED' },
    }),
  ).toBe(1);
  expect(
    (await db.trip.findUnique({ where: { id: trip.id } })).occupiedSeats,
  ).toBe(2);
  await issue('ana', first).expect(409);
});

test('conserva el abordaje manual y exige la parada actual al emitir QR', async () => {
  const intermediate = trip.itinerary.stops[1].id;
  await call(
    'diego',
    'post',
    `/trips/${trip.id}/stops/${intermediate}/reach`,
  ).expect(200);
  const secondPass = (await issue('sara', second).expect(201)).body;
  const manuallyBoarded = await call(
    'diego',
    'post',
    `/participations/${second.id}/board`,
  ).expect(200);
  expect(manuallyBoarded.body.boardedAt).toEqual(expect.any(String));
  await redeem('diego', secondPass.code).expect(409);
  const quantity = await db.tripEvent.count({
    where: { tripId: trip.id, type: 'PASSENGER_BOARDED' },
  });
  expect(quantity).toBe(2);
  expect(
    (await db.trip.findUnique({ where: { id: trip.id } })).occupiedSeats,
  ).toBe(2);
});
