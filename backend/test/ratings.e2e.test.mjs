import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, vehicle, campus, first, second, upcoming;
const actors = new Map();
const trips = [];
const rate = (actor, trip, target, stars, comment) =>
  call(actor, 'post', `/trips/${trip.id}/ratings`).send({
    rateeId: actors.get(target).id,
    stars,
    comment,
  });
const call = (actor, method, path) => {
  const client = request(app.getHttpServer());
  return client[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(actors.get(actor).token, { type: 'bearer' });
};

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('RF-010 requiere una base de pruebas aislada');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  const password = process.env.AUTH_FIXTURE_PASSWORD;
  if (!password) throw new Error('Configura AUTH_FIXTURE_PASSWORD para RF-010');
  for (const identity of ['diego', 'ana', 'sara', 'laura']) {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .set('x-ruteam-client', 'native')
      .send({ email: `${identity}@student-fixtures.ruteam.invalid`, password })
      .expect(200);
    actors.set(identity, { id: body.account.id, token: body.token });
  }
  vehicle = await db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } });
  campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-SABIOS' },
  });
});

afterAll(async () => {
  if (db && trips.length) {
    await db.reservation.deleteMany({ where: { tripId: { in: trips } } });
    await db.trip.deleteMany({ where: { id: { in: trips } } });
  }
  await app?.close();
});

async function publish(hours, label) {
  const { body } = await call('diego', 'post', '/trips')
    .send({
      departureAt: new Date(Date.now() + hours * 3600000).toISOString(),
      vehicleId: vehicle.id,
      offeredSeats: 2,
      estimatedDurationMinutes: 40,
      ruleIds: [],
      itinerary: {
        direction: 'DESDE_USC',
        publicMeetingPoints: true,
        description: 'Ruta de reputación de pruebas',
        origin: { campusPointId: campus.id },
        destination: {
          label,
          latitude: 3.447,
          longitude: -76.52,
          instructions: 'Encuentro público de prueba',
        },
        stops: [],
      },
    })
    .expect(201);
  trips.push(body.id);
  return body;
}

async function complete(trip, markNoShow) {
  const body = {
    pickupId: trip.itinerary.stops[0].id,
    dropoffId: trip.itinerary.stops.at(-1).id,
  };
  const ana = (
    await call('ana', 'post', `/trips/${trip.id}/participations`)
      .send(body)
      .expect(201)
  ).body;
  const sara =
    markNoShow &&
    (
      await call('sara', 'post', `/trips/${trip.id}/participations`)
        .send(body)
        .expect(201)
    ).body;
  await call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action: 'START' })
    .expect(200);
  await call('diego', 'post', `/participations/${ana.id}/board`).expect(200);
  if (sara)
    await call('diego', 'post', `/participations/${sara.id}/no-show`).expect(
      200,
    );
  await call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action: 'FINISH' })
    .expect(200);
}

test('antes del cierre rechaza evaluar y publica reputación vacía', async () => {
  first = await publish(62, 'Destino de reputación uno');
  upcoming = await publish(65, 'Destino aún publicado RF-010');
  expect(
    (await call('ana', 'get', `/trips/${upcoming.id}`).expect(200)).body
      .driverReputation,
  ).toEqual({ capacity: 'DRIVER', average: null, count: 0 });
  await rate('diego', first, 'ana', 5).expect(409);
});

test('tras el cierre persisten destinos y sólo los pares que compartieron el viaje pueden evaluar', async () => {
  await complete(first, true);
  const pending = (
    await call('ana', 'get', `/trips/${first.id}/ratings`).expect(200)
  ).body;
  expect(pending.targets).toEqual([
    expect.objectContaining({
      rateeId: actors.get('diego').id,
      capacity: 'DRIVER',
      submitted: null,
    }),
  ]);
  const list = (await call('ana', 'get', '/ratings').expect(200)).body;
  expect(
    list.items.some(
      (item) => item.tripId === first.id && item.targets[0].submitted === null,
    ),
  ).toBe(true);
  await call('sara', 'get', `/trips/${first.id}/ratings`).expect(404);
  await rate('sara', first, 'diego', 5).expect(404);
  await rate('laura', first, 'diego', 5).expect(403);
  await rate('ana', first, 'sara', 5).expect(403);
  await rate('ana', first, 'ana', 5).expect(400);
  for (const n of [0, 6, 2.5]) await rate('ana', first, 'diego', n).expect(400);
  const notices = (await call('ana', 'get', '/notifications').expect(200)).body;
  expect(notices.items).toContainEqual(
    expect.objectContaining({
      kind: 'RATING_AVAILABLE',
      tripId: first.id,
      available: true,
    }),
  );
});

test('duplicados concurrentes dejan una sola calificación y la reputación se agrega por capacidad', async () => {
  const responses = await Promise.all([
    rate('ana', first, 'diego', 1, 'Comentario privado'),
    rate('ana', first, 'diego', 1, 'Comentario privado'),
  ]);
  expect(responses.map((r) => r.status).sort()).toEqual([201, 409]);
  await rate('diego', first, 'ana', 5).expect(201);
  second = await publish(64, 'Destino de reputación dos');
  await complete(second, false);
  await rate('ana', second, 'diego', 5).expect(201);
  const own = (
    await call('ana', 'get', `/trips/${first.id}/ratings`).expect(200)
  ).body;
  expect(own.targets[0].submitted).toMatchObject({
    stars: 1,
    comment: 'Comentario privado',
  });
  expect(own.reputations).toEqual(
    expect.arrayContaining([
      { capacity: 'DRIVER', count: 0, average: null },
      { capacity: 'PASSENGER', count: 1, average: 5 },
    ]),
  );
  const detail = (await call('ana', 'get', `/trips/${upcoming.id}`).expect(200))
    .body;
  expect(detail.driverReputation).toEqual({
    capacity: 'DRIVER',
    count: 2,
    average: 3,
  });
  expect(JSON.stringify(detail)).not.toContain('Comentario privado');
  const roster = (
    await call('diego', 'get', `/trips/${first.id}/participations`).expect(200)
  ).body;
  expect(
    roster.find((row) => row.requesterName.startsWith('Ana'))
      .passengerReputation,
  ).toEqual({ capacity: 'PASSENGER', count: 1, average: 5 });
  await expect(
    db.$executeRaw`UPDATE "TripRating" SET "stars"=6 WHERE "tripId"=${first.id}::uuid`,
  ).rejects.toThrow();
});
