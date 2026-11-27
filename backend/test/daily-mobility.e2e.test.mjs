import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, worker, fixture;
const sessions = new Map();
const trips = [];
const places = [];
const originalPreferences = new Map();
const call = (actor, method, path) => {
  const client = request(app.getHttpServer());
  return client[method]('/api/v1' + path)
    .set('x-ruteam-client', 'native')
    .auth(sessions.get(actor).token, { type: 'bearer' });
};

beforeAll(async () => {
  const url = process.env.TEST_DATABASE_URL;
  if (
    !url ||
    url === process.env.DATABASE_URL ||
    !new URL(url).pathname.endsWith('_test')
  )
    throw new Error('PostgreSQL de prueba aislado requerido');
  process.env.DATABASE_URL = url;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  for (const identity of ['diego', 'ana', 'sara']) {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    sessions.set(identity, body);
    originalPreferences.set(
      body.user.id,
      (await db.user.findUniqueOrThrow({ where: { id: body.user.id } }))
        .notificationPreferences,
    );
  }
  const vehicle = await db.vehicle.findUniqueOrThrow({
    where: { plate: 'STU123' },
  });
  const campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-SABIOS' },
  });
  fixture = {
    vehicleId: vehicle.id,
    estimatedDurationMinutes: 40,
    offeredSeats: 1,
    ruleIds: [],
    itinerary: {
      direction: 'DESDE_USC',
      publicMeetingPoints: true,
      description: 'Recorrido público para probar movilidad diaria',
      origin: { campusPointId: campus.id, label: 'Encuentro institucional' },
      stops: [],
      destination: {
        label: 'Destino público de prueba',
        latitude: 3.45,
        longitude: -76.51,
        instructions: 'Punto público',
      },
      geometry: {
        type: 'LineString',
        coordinates: [
          [Number(campus.longitude), Number(campus.latitude)],
          [-76.51, 3.45],
        ],
      },
    },
  };
});

afterAll(async () => {
  try {
    if (!db) return;
    const { Prisma } = await import('../dist/src/generated/prisma/client.js');
    if (places.length)
      await db.frequentPlace.deleteMany({ where: { id: { in: places } } });
    await db.reservation.deleteMany({ where: { tripId: { in: trips } } });
    await db.trip.deleteMany({ where: { id: { in: trips } } });
    for (const [id, notificationPreferences] of originalPreferences)
      await db.user.update({
        where: { id },
        data: {
          notificationPreferences: notificationPreferences ?? Prisma.DbNull,
        },
      });
  } finally {
    await app?.close();
  }
});

async function publish(minutes) {
  const { body } = await call('diego', 'post', '/trips')
    .send({
      ...fixture,
      departureAt: new Date(Date.now() + minutes * 60_000).toISOString(),
    })
    .expect(201);
  trips.push(body.id);
  return body;
}
async function join(actor, trip) {
  const [pickup, dropoff] = trip.itinerary.stops;
  return (
    await call(actor, 'post', `/trips/${trip.id}/participations`)
      .send({ pickupId: pickup.id, dropoffId: dropoff.id })
      .expect(201)
  ).body;
}
async function tick(now = new Date()) {
  if (!worker) {
    const { DailyMobilityWorker } =
      await import('../dist/src/modules/mobility/application/daily-mobility.worker.js');
    worker = app.get(DailyMobilityWorker);
  }
  await worker.tick(now);
}

const savedPath = (trip) => `/mobility/saved-trips/${trip.id}`;

test('guardar mantiene privacidad y capacidad, y una liberación genera un único aviso', async () => {
  const trip = await publish(530);
  await call('ana', 'put', savedPath(trip)).expect(200);
  await call('ana', 'put', savedPath(trip)).expect(200);
  const saved = (await call('ana', 'get', '/mobility/saved-trips').expect(200))
    .body;
  expect(saved).toEqual([
    expect.objectContaining({
      tripId: trip.id,
      availability: 'AVAILABLE',
      availableSeats: 1,
    }),
  ]);
  expect(
    (await call('sara', 'get', '/mobility/saved-trips').expect(200)).body,
  ).toEqual([]);
  expect(
    (await call('ana', 'get', '/mobility/agenda').expect(200)).body.entries.map(
      ({ tripId }) => tripId,
    ),
  ).not.toContain(trip.id);
  const participation = await join('sara', trip);
  expect(
    (await call('ana', 'get', '/mobility/saved-trips').expect(200)).body[0],
  ).toMatchObject({ availability: 'FULL', availableSeats: 0 });
  await call('ana', 'put', savedPath(trip) + '/availability-alert').expect(200);
  await tick();
  const count = () =>
    db.tripNotification.count({
      where: {
        recipientId: sessions.get('ana').user.id,
        tripId: trip.id,
        kind: 'SEAT_AVAILABLE',
      },
    });
  expect(await count()).toBe(0);
  await call(
    'sara',
    'post',
    `/participations/${participation.id}/cancel`,
  ).expect(200);
  await tick();
  await tick();
  expect(await count()).toBe(1);
  expect(
    await db.reservation.count({
      where: { tripId: trip.id, status: 'CONFIRMED' },
    }),
  ).toBe(0);
  await call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action: 'CANCEL' })
    .expect(200);
  expect(
    (await call('ana', 'get', '/mobility/saved-trips').expect(200)).body[0],
  ).toMatchObject({ availability: 'CANCELLED', availableSeats: 0 });
  await call('ana', 'delete', savedPath(trip)).expect(204);
  expect(
    (await call('ana', 'get', '/mobility/saved-trips').expect(200)).body,
  ).toEqual([]);
});

test('agenda estima recogida y descenso, y los avisos respetan la anticipación configurada', async () => {
  const trip = await publish(70);
  await join('ana', trip);
  const preferences = {
    recommendations: true,
    messages: true,
    reminders: true,
    recurrences: true,
    optionalTripUpdates: true,
    reminderLeadMinutes: 60,
  };
  await call('ana', 'put', '/notification-settings')
    .send(preferences)
    .expect(200);
  await call('diego', 'put', '/notification-settings')
    .send({ ...preferences, reminderLeadMinutes: 15 })
    .expect(200);
  const agenda = (
    await call('ana', 'get', '/mobility/agenda').expect(200)
  ).body.entries.find(({ tripId }) => tripId === trip.id);
  expect(agenda).toMatchObject({
    kind: 'PARTICIPATION',
    pickupAt: trip.departureAt,
    dropoffAt: trip.expectedEndAt,
  });
  const filters = {
    tripId: trip.id,
    kind: { in: ['TRIP_DEPARTURE_REMINDER', 'TRIP_PICKUP_REMINDER'] },
  };
  await tick(new Date(Date.parse(trip.departureAt) - 40 * 60_000));
  expect(
    await db.tripNotification.findMany({
      where: filters,
      select: { kind: true },
    }),
  ).toEqual([{ kind: 'TRIP_PICKUP_REMINDER' }]);
  await tick(new Date(Date.parse(trip.departureAt) - 14 * 60_000));
  await tick(new Date(Date.parse(trip.departureAt) - 13 * 60_000));
  expect(await db.tripNotification.count({ where: filters })).toBe(2);
});

test('los lugares frecuentes sólo son visibles y modificables por su titular', async () => {
  const data = {
    name: 'Punto preferido',
    kind: 'PUBLIC_REFERENCE',
    placeLabel: 'Parque cercano de prueba',
    latitude: 3.44,
    longitude: -76.52,
  };
  const { body: place } = await call('ana', 'post', '/mobility/frequent-places')
    .send(data)
    .expect(201);
  places.push(place.id);
  expect(place).toMatchObject(data);
  expect(place).not.toHaveProperty('userId');
  expect(
    (await call('sara', 'get', '/mobility/frequent-places').expect(200)).body,
  ).toEqual([]);
  await call('sara', 'patch', `/mobility/frequent-places/${place.id}`)
    .send(data)
    .expect(404);
  await call('sara', 'delete', `/mobility/frequent-places/${place.id}`).expect(
    404,
  );
  await call('ana', 'patch', `/mobility/frequent-places/${place.id}`)
    .send({ ...data, name: 'Otro nombre' })
    .expect(200);
  await call('ana', 'delete', `/mobility/frequent-places/${place.id}`).expect(
    204,
  );
});
