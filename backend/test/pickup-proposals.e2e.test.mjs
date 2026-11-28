import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, plaza, vehicle;
const tokens = {};
const trips = [];
const north = {
  label: 'Punto exterior de prueba',
  latitude: 3.455,
  longitude: -76.53,
  instructions: 'Esperar junto a la señal',
};
const point = {
  label: 'Recogida junto al comercio',
  latitude: 3.43,
  longitude: -76.539,
};
function requestAt(method, path, identity = 'diego') {
  const agent = request(app.getHttpServer());
  return agent[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens[identity], { type: 'bearer' });
}

async function publish(direction, hours, overrides = {}) {
  const origin =
    direction === 'HACIA_USC' ? north : { campusPointId: plaza.id };
  const destination =
    direction === 'HACIA_USC'
      ? { campusPointId: plaza.id, label: 'Sótano tras la escalera' }
      : north;
  const vertices = [
    [north.longitude, north.latitude],
    [point.longitude, point.latitude],
    [plaza.longitude, plaza.latitude],
  ];
  const response = await requestAt('post', '/trips').send({
    vehicleId: vehicle.id,
    departureAt: new Date(Date.now() + hours * 3600000).toISOString(),
    estimatedDurationMinutes: 55,
    offeredSeats: 1,
    ruleIds: [],
    itinerary: {
      direction,
      origin,
      destination,
      stops: [],
      description: 'Trayecto público de prueba',
      publicMeetingPoints: true,
      geometry: {
        type: 'LineString',
        coordinates: direction === 'HACIA_USC' ? vertices : vertices.reverse(),
      },
      ...overrides,
    },
  });
  if (response.status === 201) trips.push(response.body.id);
  return response;
}

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    TEST_DATABASE_URL === DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Se requiere una base de pruebas independiente');
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
    tokens[identity] = response.body.token;
  }
  const catalog = await requestAt('get', '/campus/meeting-points').expect(200);
  plaza = catalog.body.find(({ kind }) => kind === 'PLAZA');
  const vehicles = await requestAt('get', '/vehicles').expect(200);
  vehicle = vehicles.body.find(({ plate }) => plate === 'STU123');
}, 15000);

afterAll(async () => {
  if (trips.length) {
    await db.reservation.deleteMany({ where: { tripId: { in: trips } } });
    await db.trip.deleteMany({ where: { id: { in: trips } } });
  }
  await app?.close();
});

test('exige USC en un extremo y acepta nombre de encuentro libre sin coordenadas propias', async () => {
  expect(
    (
      await publish('HACIA_USC', 72, {
        destination: { ...north, label: 'Otro punto' },
        stops: [{ campusPointId: plaza.id, access: 'BOTH' }],
      })
    ).status,
  ).toBe(400);
  expect(
    (
      await publish('DESDE_USC', 72, {
        origin: { ...north, campusReference: 'USC' },
      })
    ).status,
  ).toBe(400);
  expect(
    (await publish('HACIA_USC', 72, { direction: 'DESDE_USC' })).status,
  ).toBe(400);
  expect(
    (
      await publish('DESDE_USC', 72, {
        stops: [
          {
            ...point,
            instructions: 'Prueba de recogida no permitida',
            access: 'PICKUP',
          },
        ],
      })
    ).status,
  ).toBe(400);
  const inbound = await publish('HACIA_USC', 72);
  expect(inbound.status).toBe(201);
  expect(inbound.body.itinerary.direction).toBe('HACIA_USC');
  expect(inbound.body.itinerary.stops.at(-1)).toMatchObject({
    label: 'Sótano tras la escalera',
    campusPointId: plaza.id,
    instructions: expect.stringContaining('referencia del campus'),
  });
  const matching = await requestAt('get', '/trips/available', 'ana')
    .query({ direction: 'HACIA_USC', toText: 'sotano tras la escalera' })
    .expect(200);
  expect(matching.body.items.map(({ id }) => id)).toContain(inbound.body.id);
});

test('HACIA_USC conserva el punto de paso y bloquea nuevas recogidas', async () => {
  for (const access of ['PICKUP', 'DROPOFF', 'BOTH'])
    expect(
      (
        await publish('HACIA_USC', 76, {
          stops: [
            { ...point, instructions: 'Punto público histórico', access },
          ],
        })
      ).status,
    ).toBe(400);
  const { body: trip, status } = await publish('HACIA_USC', 76, {
    stops: [
      { ...point, instructions: 'Punto de paso público', access: 'WAYPOINT' },
    ],
  });
  expect(status).toBe(201);
  const path = `/trips/${trip.id}/pickup-proposals`;
  await requestAt('post', path, 'ana').send(point).expect(409);
  expect((await requestAt('get', path, 'ana').expect(200)).body).toEqual([]);
  const [origin, middle, usc] = trip.itinerary.stops;
  const participants = `/trips/${trip.id}/participations`;
  await requestAt('post', participants, 'ana')
    .send({ pickupId: middle.id, dropoffId: usc.id })
    .expect(400);
  await requestAt('post', participants, 'ana')
    .send({ pickupId: origin.id, dropoffId: middle.id })
    .expect(400);
  await requestAt('post', participants, 'ana')
    .send({ pickupId: origin.id, dropoffId: usc.id })
    .expect(201);
  const stored = await db.trip.findUniqueOrThrow({
    where: { id: trip.id },
    include: { stops: { orderBy: { position: 'asc' } } },
  });
  expect(stored.routeGeometry).toEqual(trip.itinerary.geometry);
  expect(stored.occupiedSeats).toBe(1);
  expect(stored.stops.map(({ access }) => access)).toEqual([
    'PICKUP',
    'WAYPOINT',
    'DROPOFF',
  ]);
});
