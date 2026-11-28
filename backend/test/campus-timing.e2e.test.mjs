import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { createServer } from 'node:http';
import { once } from 'node:events';
import request from 'supertest';

let app,
  db,
  server,
  routeTrip,
  duplicatedTrip,
  preference,
  driver,
  passenger,
  campus,
  meeting,
  vehicle;
const originalRouting = process.env.ROUTING_BASE_URL;
const call = (token, method, path) => {
  const client = request(app.getHttpServer());
  return client[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(token, { type: 'bearer' });
};

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Cartografía requiere una base de pruebas independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  server = createServer((req, res) => {
    const points = req.url
      .split('?')[0]
      .split('/')
      .at(-1)
      .split(';')
      .map((point) => point.split(',').map(Number));
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        code: 'Ok',
        routes: [
          {
            distance: 9200,
            duration: 2400,
            legs: points.slice(1).map((to, leg) => {
              const from = points[leg];
              return {
                duration: 1200,
                distance: 4600,
                steps: [
                  {
                    duration: 1200,
                    distance: 4600,
                    name: 'Vía sintética',
                    geometry: { type: 'LineString', coordinates: [from, to] },
                    maneuver: { location: from, type: 'depart' },
                  },
                  {
                    duration: 0,
                    distance: 0,
                    name: 'Vía sintética',
                    geometry: { type: 'LineString', coordinates: [to, to] },
                    maneuver: { location: to, type: 'arrive' },
                  },
                ],
              };
            }),
            geometry: { type: 'LineString', coordinates: points },
          },
        ],
      }),
    );
  }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  process.env.ROUTING_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  const login = async (identity) =>
    (
      await request(app.getHttpServer())
        .post('/api/v1/auth/demo/login')
        .set('x-ruteam-client', 'native')
        .send({ identity })
        .expect(201)
    ).body.token;
  driver = await login('diego');
  passenger = await login('ana');
  campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-CAMPUS' },
  });
  meeting = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-SABIOS' },
  });
  vehicle = await db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } });
}, 15000);

afterAll(async () => {
  try {
    if (preference)
      await db.mobilityPreference.delete({ where: { id: preference } });
    if (duplicatedTrip) await db.trip.delete({ where: { id: duplicatedTrip } });
    if (routeTrip) await db.trip.delete({ where: { id: routeTrip } });
    await app?.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  } finally {
    if (originalRouting === undefined) delete process.env.ROUTING_BASE_URL;
    else process.env.ROUTING_BASE_URL = originalRouting;
  }
});

test('distingue sedes y persiste la geometría seleccionada con estimación intermedia que cruza medianoche', async () => {
  const { body: catalog } = await call(
    passenger,
    'get',
    '/campus/meeting-points',
  ).expect(200);
  const palmira = catalog.find(({ name }) => name === 'Seccional Palmira');
  expect(palmira).toMatchObject({
    kind: 'CAMPUS',
    demo: false,
    latitude: null,
    longitude: null,
    sourceUrl: expect.any(String),
  });
  expect(catalog.find(({ id }) => id === meeting.id).campusSiteId).toBe(
    campus.id,
  );
  const route = {
    direction: 'HACIA_USC',
    publicMeetingPoints: true,
    origin: {
      label: 'Inicio público aislado',
      latitude: 3.46,
      longitude: -76.5,
      instructions: 'Punto público',
    },
    destination: { campusPointId: meeting.id, label: 'Junto al acceso' },
    stops: [
      {
        label: 'Recogida pública intermedia',
        latitude: 3.44,
        longitude: -76.52,
        instructions: 'Punto público',
        access: 'PICKUP',
      },
    ],
  };
  const {
    body: [option],
  } = await call(driver, 'post', '/trips/route-options')
    .send(route)
    .expect(200);
  expect(option).toMatchObject({
    durationMinutes: 40,
    legDurationsSeconds: [1200, 1200],
    routingSelection: expect.any(String),
    maneuvers: expect.any(Array),
  });
  const departureAt = new Date(Date.now() + 22 * 86400000);
  departureAt.setUTCHours(4, 50, 0, 0);
  const publication = {
    departureAt: departureAt.toISOString(),
    vehicleId: vehicle.id,
    offeredSeats: 1,
    estimatedDurationMinutes: option.durationMinutes,
    ruleIds: [],
    itinerary: {
      ...route,
      description: 'Ruta de prueba',
      geometry: option.geometry,
      routingSelection: option.routingSelection,
      maneuvers: option.maneuvers,
    },
  };
  await call(driver, 'post', '/trips')
    .send({ ...publication, estimatedDurationMinutes: 30 })
    .expect(400);
  await call(driver, 'post', '/trips')
    .send({
      ...publication,
      itinerary: {
        ...publication.itinerary,
        maneuvers: [
          { ...option.maneuvers[0], street: 'Vía alterada' },
          ...option.maneuvers.slice(1),
        ],
      },
    })
    .expect(400);
  const { body: published } = await call(driver, 'post', '/trips')
    .send(publication)
    .expect(201);
  routeTrip = published.id;
  expect(published.itinerary.geometry).toEqual(option.geometry);
  expect(
    (await call(driver, 'get', `/trips/${routeTrip}/operation`).expect(200))
      .body.maneuvers,
  ).toEqual(option.maneuvers);
  await call(passenger, 'get', `/trips/${routeTrip}/operation`).expect(404);
  const { body: duplicate } = await call(
    driver,
    'post',
    `/trips/${routeTrip}/duplicate`,
  )
    .send({ departureAt: new Date(+departureAt + 86400000).toISOString() })
    .expect(201);
  duplicatedTrip = duplicate.id;
  expect(
    (
      await call(driver, 'get', `/trips/${duplicatedTrip}/operation`).expect(
        200,
      )
    ).body.maneuvers,
  ).toEqual(option.maneuvers);
  expect(
    published.itinerary.stops.map(
      ({ estimatedOffsetSeconds }) => estimatedOffsetSeconds,
    ),
  ).toEqual([0, 1200, 2400]);
  expect(published.itinerary.stops[2].campusSiteId).toBe(campus.id);
  const pickupAt = new Date(departureAt.getTime() + 1200 * 1000);
  const routine = {
    label: 'Recogida de madrugada',
    campusPointId: palmira.id,
    direction: 'HACIA_USC',
    days: [pickupAt.getUTCDay() || 7],
    startMinute: 0,
    endMinute: 15,
    placeLabel: 'Punto habitual de prueba',
    latitude: 3.44,
    longitude: -76.52,
    radiusKm: 0.25,
    vehicleTypes: ['CAR'],
    notificationsEnabled: true,
    active: true,
  };
  const { body: saved } = await call(passenger, 'post', '/mobility/preferences')
    .send(routine)
    .expect(201);
  preference = saved.id;
  const feed = () =>
    call(passenger, 'get', '/trips/feed?tab=FOR_YOU').expect(200);
  expect((await feed()).body.items.some(({ id }) => id === routeTrip)).toBe(
    false,
  );
  await call(passenger, 'patch', `/mobility/preferences/${preference}`)
    .send({ ...routine, campusPointId: campus.id })
    .expect(200);
  const match = (await feed()).body.items.find(
    ({ id }) => id === routeTrip,
  )?.recommendation;
  expect(match).toMatchObject({
    type: 'DIRECT',
    pickupId: published.itinerary.stops[1].id,
    pickupEstimatedAt: pickupAt.toISOString(),
  });
  const { RecommendationWorker } =
    await import('../dist/src/modules/mobility/application/recommendation.worker.js');
  const worker = app.get(RecommendationWorker);
  for (let i = 0; i < 20; i++) {
    if (
      (await db.recommendationJob.findUnique({ where: { tripId: routeTrip } }))
        ?.state === 'COMPLETED'
    )
      break;
    await worker.tick();
  }
  expect(
    await db.tripNotification.count({
      where: { tripId: routeTrip, kind: 'TRIP_MATCH' },
    }),
  ).toBe(1);
}, 15000);
