import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';
let app, db, plaza, basement, vehicle, outbound, inward, tokens, users;
const tripIds = [];
const fromNow = (hours) => new Date(Date.now() + hours * 3600000).toISOString();
const call = (method, path, actor = 'diego') => {
  const agent = request(app.getHttpServer());
  return agent[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens[actor], { type: 'bearer' });
};
const publicPoint = (label, latitude, longitude) => ({
  label,
  latitude,
  longitude,
  instructions: 'Esperar en el punto público DEMO',
});
const floralia = publicPoint('Floralia · encuentro DEMO', 3.469, -76.505);
const calle5 = publicPoint('Calle Quinta · comercio DEMO', 3.421, -76.543);
const weekday = (hours, itinerary) => ({
  vehicleId: vehicle.id,
  departureAt: fromNow(hours),
  estimatedDurationMinutes: 50,
  offeredSeats: 1,
  ruleIds: [],
  itinerary: {
    publicMeetingPoints: true,
    description: 'Trayecto sintético de prueba',
    stops: [],
    ...itinerary,
  },
});

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('BD de test aislada requerida');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  tokens = {};
  users = {};
  for (const identity of ['diego', 'ana', 'admin']) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    tokens[identity] = response.body.token;
    users[identity] = response.body.user.id;
  }
  const catalog = (await call('get', '/campus/meeting-points').expect(200))
    .body;
  plaza = catalog.find((point) => point.kind === 'PLAZA');
  basement = catalog.find((point) => point.level === '-2');
  expect(basement).toMatchObject({
    demo: true,
    kind: 'BASEMENT',
    accessReference: expect.any(String),
  });
  expect(catalog.find((point) => point.kind === 'CAMPUS').latitude).toBeNull();
  vehicle = (await call('get', '/vehicles').expect(200)).body.find(
    ({ plate }) => plate === 'DEM123',
  );
});

afterAll(async () => {
  if (db && tripIds.length) {
    await db.reservation.deleteMany({ where: { tripId: { in: tripIds } } });
    await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  }
  await app?.close();
});

test('publica USC → Floralia con geometría elegida, y Floralia → sótano USC', async () => {
  const geometry = {
    type: 'LineString',
    coordinates: [
      [plaza.longitude, plaza.latitude],
      [calle5.longitude, calle5.latitude],
      [-76.51, 3.46],
      [floralia.longitude, floralia.latitude],
    ],
  };
  outbound = (
    await call('post', '/trips')
      .send(
        weekday(22, {
          origin: { campusPointId: plaza.id },
          destination: floralia,
          stops: [{ ...calle5, access: 'BOTH' }],
          geometry,
        }),
      )
      .expect(201)
  ).body;
  tripIds.push(outbound.id);
  expect(outbound.itinerary).toMatchObject({
    geometry,
    distanceMeters: expect.any(Number),
  });
  expect(
    outbound.itinerary.stops.map(({ access, position }) => [access, position]),
  ).toEqual([
    ['PICKUP', 0],
    ['BOTH', 1],
    ['DROPOFF', 2],
  ]);
  expect(outbound.destination.name).toBe(floralia.label);
  inward = (
    await call('post', '/trips')
      .send(
        weekday(24, {
          origin: floralia,
          destination: { campusPointId: basement.id },
          stops: [{ ...calle5, access: 'PICKUP' }],
        }),
      )
      .expect(201)
  ).body;
  tripIds.push(inward.id);
  expect(inward.itinerary.geometry).toBeNull();
  expect(inward.itinerary.stops.at(-1)).toMatchObject({
    campusPointId: basement.id,
    instructions: expect.stringContaining('nivel -2'),
  });
  await call('post', '/trips')
    .send(weekday(26, { origin: floralia, destination: calle5 }))
    .expect(400);
  await call('post', '/trips', 'ana')
    .send(
      weekday(26, {
        origin: { campusPointId: plaza.id },
        destination: floralia,
      }),
    )
    .expect(403);
  await call('post', '/trips')
    .send(
      weekday(26, {
        origin: { campusPointId: plaza.id },
        destination: floralia,
        publicMeetingPoints: false,
      }),
    )
    .expect(400);
  const routeInput = {
    origin: { campusPointId: plaza.id },
    destination: floralia,
    stops: [],
    publicMeetingPoints: true,
  };
  await call('post', '/trips/route-options', 'ana')
    .send(routeInput)
    .expect(403);
  if (!process.env.ROUTING_BASE_URL)
    await call('post', '/trips/route-options').send(routeInput).expect(503);
});

test('matching filtra dirección, parada autorizada, horario y conserva la geometría', async () => {
  await call('get', '/trips/available', 'ana')
    .query({ cursor: 'invalido' })
    .expect(400);
  const query = (params) =>
    call('get', '/trips/available', 'ana').query(params).expect(200);
  const search = await query({
    from: plaza.id,
    to: '3.469,-76.505',
    radiusKm: '0.2',
    after: fromNow(21),
    before: fromNow(23),
  });
  expect(search.body.items.map(({ id }) => id)).toContain(outbound.id);
  expect(search.body.items[0]).not.toHaveProperty('vehicle.plate');
  expect(search.body.items[0].itinerary.geometry).toEqual(
    outbound.itinerary.geometry,
  );
  for (const filters of [
    {
      from: '3.469,-76.505',
      to: plaza.id,
      radiusKm: '0.2',
      before: fromNow(23),
    },
    { from: '3.46,-76.51', to: '3.469,-76.505', radiusKm: '0.2' },
    { from: plaza.id, after: fromNow(23) },
    { from: plaza.id, seats: '2' },
  ]) {
    const result = await query(filters);
    expect(result.body.items.map(({ id }) => id)).not.toContain(outbound.id);
  }
  expect(
    (await db.trip.findUnique({ where: { id: outbound.id } })).routeGeometry,
  ).toEqual(outbound.itinerary.geometry);
});

test('último cupo con dos aceptaciones concurrentes y cancelación del viaje', async () => {
  const [pickup, middle, dropoff] = outbound.itinerary.stops;
  const endpoint = `/trips/${outbound.id}/reservation-requests`;
  const input = (identity) => ({
    memberIds: [users[identity]],
    pickupId: pickup.id,
    dropoffId: dropoff.id,
  });
  await call('post', endpoint, 'ana')
    .send({ ...input('ana'), pickupId: dropoff.id, dropoffId: middle.id })
    .expect(400);
  await call('post', endpoint, 'ana')
    .send({ ...input('ana'), dropoffId: inward.itinerary.stops.at(-1).id })
    .expect(400);
  const first = await call('post', endpoint, 'ana')
    .send(input('ana'))
    .expect(201);
  await call('post', endpoint, 'ana').send(input('ana')).expect(409);
  const second = await call('post', endpoint, 'admin')
    .send(input('admin'))
    .expect(201);
  const decision = (id, actor) =>
    call('post', `/reservation-requests/${id}/decision`, actor).send({
      decision: 'ACCEPT',
    });
  await decision(first.body.id, 'ana').expect(403);
  const responses = await Promise.all([
    decision(first.body.id),
    decision(second.body.id),
  ]);
  expect(responses.map(({ status }) => status).sort()).toEqual([200, 409]);
  const stored = await db.trip.findUnique({ where: { id: outbound.id } });
  expect(stored.occupiedSeats).toBe(1);
  const full = await call('get', '/trips/available', 'ana')
    .query({ from: plaza.id })
    .expect(200);
  expect(full.body.items.map(({ id }) => id)).not.toContain(outbound.id);
  await call('post', `/trips/${outbound.id}/transition`, 'ana')
    .send({ action: 'CANCEL' })
    .expect(403);
  await call('post', `/trips/${outbound.id}/transition`)
    .send({ action: 'CANCEL' })
    .expect(200);
  const cancelled = await db.trip.findUnique({ where: { id: outbound.id } });
  expect(cancelled).toMatchObject({ status: 'CANCELADO', occupiedSeats: 0 });
  expect(
    await db.reservation.count({
      where: { tripId: outbound.id, status: 'CANCELLED' },
    }),
  ).toBe(2);
  const after = await call('get', '/trips/available', 'ana')
    .query({ from: plaza.id })
    .expect(200);
  expect(after.body.items.map(({ id }) => id)).not.toContain(outbound.id);
});

test('grupo con dos miembros, cancelación pendiente y transición de inicio a fin', async () => {
  const groupTrip = (
    await call('post', '/trips')
      .send({
        ...weekday(28, {
          origin: { campusPointId: basement.id },
          destination: floralia,
        }),
        offeredSeats: 2,
      })
      .expect(201)
  ).body;
  tripIds.push(groupTrip.id);
  const [pickup, dropoff] = groupTrip.itinerary.stops;
  const endpoint = `/trips/${groupTrip.id}/reservation-requests`;
  const send = () =>
    call('post', endpoint, 'ana')
      .send({
        memberIds: [users.ana, users.admin],
        pickupId: pickup.id,
        dropoffId: dropoff.id,
      })
      .expect(201);
  const inactive = await db.user.findUnique({
    where: { demoIdentity: 'laura' },
  });
  await call('post', endpoint, 'ana')
    .send({
      memberIds: [users.ana, inactive.id],
      pickupId: pickup.id,
      dropoffId: dropoff.id,
    })
    .expect(403);
  await call('get', endpoint, 'admin').expect(403);
  const cancelled = await send();
  await call(
    'post',
    `/reservation-requests/${cancelled.body.id}/cancel`,
    'ana',
  ).expect(200);
  const pending = await send();
  const confirmed = await call(
    'post',
    `/reservation-requests/${pending.body.id}/decision`,
  )
    .send({ decision: 'ACCEPT' })
    .expect(200);
  expect(confirmed.body).toMatchObject({
    status: 'CONFIRMED',
    quantity: 2,
    pickup: {
      id: pickup.id,
      latitude: basement.latitude,
      instructions: expect.stringContaining('nivel -2'),
    },
    dropoff: {
      id: dropoff.id,
      longitude: floralia.longitude,
      instructions: floralia.instructions,
    },
  });
  await call('post', `/reservation-requests/${pending.body.id}/decision`)
    .send({ decision: 'ACCEPT' })
    .expect(200);
  expect(
    (await call('get', '/reservations/my', 'admin').expect(200)).body,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: pending.body.id, status: 'CONFIRMED' }),
    ]),
  );
  const transition = (action) =>
    call('post', `/trips/${groupTrip.id}/transition`).send({ action });
  await transition('FINISH').expect(409);
  await transition('START').expect(200);
  await transition('FINISH').expect(200);
  expect(
    await db.trip.findUnique({ where: { id: groupTrip.id } }),
  ).toMatchObject({ status: 'COMPLETADO', occupiedSeats: 2 });
});

test('dos conductores pueden pedir cupos recíprocamente en paralelo', async () => {
  let secondVehicle;
  const reciprocalTrips = [];
  const expiry = new Date(fromNow(150));
  await db.driverEligibility.create({
    data: {
      userId: users.ana,
      expiresAt: expiry,
      category: 'CAR',
      reviewStatus: 'APPROVED',
    },
  });
  try {
    secondVehicle = await db.vehicle.create({
      data: {
        ownerId: users.ana,
        plate: 'REC321',
        type: 'CAR',
        brand: 'Marca DEMO',
        passengerCapacity: 2,
        color: 'GRIS',
        modelYear: 2021,
        document: { create: { expiresAt: expiry, reviewStatus: 'APPROVED' } },
      },
    });
    const publish = async (actor, vehicleId) => {
      const trip = (
        await call('post', '/trips', actor)
          .send({
            ...weekday(32, {
              origin: { campusPointId: plaza.id },
              destination: floralia,
            }),
            vehicleId,
          })
          .expect(201)
      ).body;
      reciprocalTrips.push(trip.id);
      return trip;
    };
    const tripByDiego = await publish('diego', vehicle.id);
    const tripByAna = await publish('ana', secondVehicle.id);
    const ask = (actor, trip) => {
      const [pickup, dropoff] = trip.itinerary.stops;
      return call('post', `/trips/${trip.id}/reservation-requests`, actor)
        .send({
          memberIds: [users[actor]],
          pickupId: pickup.id,
          dropoffId: dropoff.id,
        })
        .expect(201);
    };
    await Promise.all([ask('ana', tripByDiego), ask('diego', tripByAna)]);
    expect(
      await db.reservation.count({
        where: { tripId: { in: reciprocalTrips } },
      }),
    ).toBe(2);
  } finally {
    await db.reservation.deleteMany({
      where: { tripId: { in: reciprocalTrips } },
    });
    await db.trip.deleteMany({ where: { id: { in: reciprocalTrips } } });
    if (secondVehicle)
      await db.vehicle.delete({ where: { id: secondVehicle.id } });
    await db.driverEligibility.delete({ where: { userId: users.ana } });
  }
});
