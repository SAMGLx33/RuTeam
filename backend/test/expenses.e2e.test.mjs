import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, trip, client;
const tokens = new Map();
const call = (actor, method, path) =>
  client[method](`/api/v1${path}`)
    .auth(tokens.get(actor), { type: 'bearer' })
    .set('x-ruteam-client', 'native');

beforeAll(async () => {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (
    !testUrl ||
    testUrl === process.env.DATABASE_URL ||
    !new URL(testUrl).pathname.endsWith('_test')
  )
    throw new Error('Estimaciones requieren PostgreSQL de pruebas separado');
  process.env.DATABASE_URL = testUrl;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  client = request(app.getHttpServer());
  db = app.get(PrismaService);
  for (const identity of ['diego', 'ana']) {
    const { body } = await client
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    tokens.set(identity, body.token);
  }
  const campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-SABIOS' },
  });
  const vehicle = await db.vehicle.findUniqueOrThrow({
    where: { plate: 'STU123' },
  });
  ({ body: trip } = await call('diego', 'post', '/trips')
    .send({
      departureAt: new Date(Date.now() + 80 * 3600000).toISOString(),
      estimatedDurationMinutes: 45,
      offeredSeats: 1,
      ruleIds: [],
      vehicleId: vehicle.id,
      itinerary: {
        direction: 'DESDE_USC',
        publicMeetingPoints: true,
        description: 'Prueba de estimación privada',
        origin: { campusPointId: campus.id },
        destination: {
          label: 'Destino de estimación',
          latitude: 3.45,
          longitude: -76.51,
          instructions: 'Lugar público de pruebas',
        },
        stops: [],
      },
    })
    .expect(201));
});
afterAll(async () => {
  if (trip) await db.trip.delete({ where: { id: trip.id } });
  await app?.close();
});

test('almacena COP exactos para el titular y bloquea importes inválidos, acceso ajeno y edición posterior al inicio', async () => {
  const route = `/trips/${trip.id}/expense-estimate`;
  const amounts = { fuelCop: 7201, tollsCop: 2002, parkingCop: 2000 };
  expect((await call('diego', 'get', route).expect(200)).body).toEqual({
    estimate: null,
    editable: true,
  });
  await call('ana', 'get', route).expect(404);
  await call('ana', 'post', route).send(amounts).expect(404);
  for (const fuelCop of [-1, 0.5, 100000001])
    await call('diego', 'post', route)
      .send({ ...amounts, fuelCop })
      .expect(400);
  await call('diego', 'post', route).send(amounts).expect(200);
  expect(
    (await call('diego', 'get', route).expect(200)).body.estimate,
  ).toMatchObject({ ...amounts, totalCop: 11203 });
  const publicTrip = (await call('ana', 'get', `/trips/${trip.id}`).expect(200))
    .body;
  expect(publicTrip).not.toHaveProperty('expenseEstimate');
  await call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action: 'START' })
    .expect(200);
  await call('diego', 'post', route).send(amounts).expect(409);
}, 15000);
