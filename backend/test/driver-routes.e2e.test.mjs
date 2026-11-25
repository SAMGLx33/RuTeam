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
  for (const identity of ['diego', 'ana', 'sara']) {
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
    ({ plate }) => plate === 'STU123',
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
          stops: [{ ...calle5, access: 'DROPOFF' }],
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
    ['DROPOFF', 1],
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
  const nearby = await query({
    near: '3.46,-76.51',
    radiusKm: '0.2',
    direction: 'DESDE_USC',
    before: fromNow(23),
  });
  expect(
    nearby.body.items.find(({ id }) => id === outbound.id)?.match.pickupId,
  ).toBe(outbound.itinerary.stops[0].id);
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
    { near: '3.5,-76.45', radiusKm: '0.2' },
  ]) {
    const result = await query(filters);
    expect(result.body.items.map(({ id }) => id)).not.toContain(outbound.id);
  }
  expect(
    (await db.trip.findUnique({ where: { id: outbound.id } })).routeGeometry,
  ).toEqual(outbound.itinerary.geometry);
});

test('última plaza con confirmaciones concurrentes, replay y cancelación libera historial', async () => {
  const [pickup, middle, dropoff] = outbound.itinerary.stops;
  const endpoint = `/trips/${outbound.id}/participations`;
  const input = { pickupId: pickup.id, dropoffId: dropoff.id };
  await call('post', endpoint, 'ana')
    .send({ ...input, pickupId: dropoff.id, dropoffId: middle.id })
    .expect(400);
  await call('post', endpoint, 'ana')
    .send({ ...input, dropoffId: inward.itinerary.stops.at(-1).id })
    .expect(400);
  await call('post', endpoint).send(input).expect(403);
  await call('post', endpoint, 'ana')
    .send({ ...input, memberIds: [users.ana, users.sara] })
    .expect(400);
  await call('post', `/trips/${outbound.id}/reservation-requests`, 'ana')
    .send(input)
    .expect(404);
  const responses = await Promise.all([
    call('post', endpoint, 'ana').send(input),
    call('post', endpoint, 'sara').send(input),
  ]);
  expect(responses.map(({ status }) => status).sort()).toEqual([201, 409]);
  const winnerIndex = responses.findIndex(({ status }) => status === 201);
  const winner = ['ana', 'sara'][winnerIndex];
  const loser = ['sara', 'ana'][winnerIndex];
  const confirmed = responses[winnerIndex].body;
  expect(confirmed).toMatchObject({
    status: 'CONFIRMED',
    quantity: 1,
    boardedAt: null,
    canCancel: true,
  });
  expect(confirmed.confirmedAt).toEqual(expect.any(String));
  const replays = await Promise.all([
    call('post', endpoint, winner).send(input).expect(201),
    call('post', endpoint, winner).send(input).expect(201),
  ]);
  expect(replays.map(({ body }) => body.id)).toEqual([
    confirmed.id,
    confirmed.id,
  ]);
  expect(await db.reservation.count({ where: { tripId: outbound.id } })).toBe(
    1,
  );
  expect(
    (await db.trip.findUnique({ where: { id: outbound.id } })).occupiedSeats,
  ).toBe(1);
  await call('post', endpoint, winner)
    .send({ ...input, dropoffId: middle.id })
    .expect(409);
  await call('post', `/reservation-requests/${confirmed.id}/decision`)
    .send({ decision: 'ACCEPT' })
    .expect(404);
  await call('get', endpoint, loser).expect(403);
  expect((await call('get', endpoint).expect(200)).body).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ id: confirmed.id, status: 'CONFIRMED' }),
    ]),
  );
  const full = await call('get', '/trips/available', 'ana')
    .query({ from: plaza.id })
    .expect(200);
  expect(full.body.items.map(({ id }) => id)).not.toContain(outbound.id);
  await call('post', `/participations/${confirmed.id}/cancel`, loser).expect(
    403,
  );
  await Promise.all([
    call('post', `/participations/${confirmed.id}/cancel`, winner).expect(200),
    call('post', `/participations/${confirmed.id}/cancel`, winner).expect(200),
  ]);
  expect(
    (await db.trip.findUnique({ where: { id: outbound.id } })).occupiedSeats,
  ).toBe(0);
  expect(
    (await db.reservation.findUnique({ where: { id: confirmed.id } })).status,
  ).toBe('CANCELLED');
  const second = await call('post', endpoint, loser).send(input).expect(201);
  await call('post', `/trips/${outbound.id}/transition`, 'ana')
    .send({ action: 'CANCEL' })
    .expect(403);
  await call('post', `/trips/${outbound.id}/transition`)
    .send({ action: 'CANCEL' })
    .expect(200);
  expect(
    await db.trip.findUnique({ where: { id: outbound.id } }),
  ).toMatchObject({ status: 'CANCELADO', occupiedSeats: 0 });
  expect(
    await db.reservation.count({
      where: { tripId: outbound.id, status: 'CANCELLED' },
    }),
  ).toBe(2);
  await call('post', `/participations/${second.body.id}/board`).expect(409);
  const after = await call('get', '/trips/available', 'ana')
    .query({ from: plaza.id })
    .expect(200);
  expect(after.body.items.map(({ id }) => id)).not.toContain(outbound.id);
});

test('confirmaciones individuales, historial de grupo sin promoción y abordaje sin segunda plaza', async () => {
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
  const endpoint = `/trips/${groupTrip.id}/participations`;
  const input = { pickupId: pickup.id, dropoffId: dropoff.id };
  const legacy = await db.reservation.create({
    data: {
      tripId: groupTrip.id,
      requesterId: users.ana,
      pickupId: pickup.id,
      dropoffId: dropoff.id,
      quantity: 2,
      status: 'PENDING',
      members: { create: [{ userId: users.ana }, { userId: users.sara }] },
    },
  });
  await call('post', endpoint, 'ana')
    .send({ ...input, memberIds: [users.ana, users.sara] })
    .expect(400);
  await call('get', endpoint, 'sara').expect(403);
  const cancelled = await call('post', endpoint, 'ana').send(input).expect(201);
  await call(
    'post',
    `/participations/${cancelled.body.id}/cancel`,
    'ana',
  ).expect(200);
  const confirmed = await call('post', endpoint, 'ana').send(input).expect(201);
  await call('post', endpoint, 'sara').send(input).expect(201);
  expect(confirmed.body).toMatchObject({
    status: 'CONFIRMED',
    quantity: 1,
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
  expect(
    await db.reservation.findUnique({ where: { id: legacy.id } }),
  ).toMatchObject({ status: 'PENDING', confirmedAt: null });
  expect(
    (await db.trip.findUnique({ where: { id: groupTrip.id } })).occupiedSeats,
  ).toBe(2);
  expect(
    (await call('get', '/reservations/my', 'sara').expect(200)).body,
  ).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ tripId: groupTrip.id, status: 'CONFIRMED' }),
      expect.objectContaining({ id: legacy.id, status: 'PENDING' }),
    ]),
  );
  await call(
    'post',
    `/participations/${confirmed.body.id}/board`,
    'ana',
  ).expect(403);
  await call('post', `/participations/${confirmed.body.id}/board`).expect(409);
  const departureAt = new Date(Date.now() + 10 * 60000);
  await db.trip.update({
    where: { id: groupTrip.id },
    data: {
      departureAt,
      expectedEndAt: new Date(departureAt.getTime() + 50 * 60000),
    },
  });
  await call('post', `/participations/${legacy.id}/board`).expect(409);
  const boarded = await call(
    'post',
    `/participations/${confirmed.body.id}/board`,
  ).expect(200);
  expect(boarded.body).toMatchObject({
    boardedAt: expect.any(String),
    status: 'CONFIRMED',
    canCancel: false,
  });
  const replay = await call(
    'post',
    `/participations/${confirmed.body.id}/board`,
  ).expect(200);
  expect(replay.body.boardedAt).toBe(boarded.body.boardedAt);
  expect(
    (await db.trip.findUnique({ where: { id: groupTrip.id } })).occupiedSeats,
  ).toBe(2);
  expect(
    await db.tripEvent.count({
      where: { tripId: groupTrip.id, type: 'PASSENGER_BOARDED' },
    }),
  ).toBe(1);
  await call(
    'post',
    `/participations/${confirmed.body.id}/cancel`,
    'ana',
  ).expect(409);
  const transition = (action) =>
    call('post', `/trips/${groupTrip.id}/transition`).send({ action });
  await transition('FINISH').expect(409);
  await transition('START').expect(200);
  expect(
    (await db.reservation.findUnique({ where: { id: legacy.id } })).status,
  ).toBe('REJECTED');
  await call('post', endpoint, 'ana').send(input).expect(409);
  await transition('FINISH').expect(200);
  await call('post', `/participations/${confirmed.body.id}/board`).expect(409);
  expect(
    await db.trip.findUnique({ where: { id: groupTrip.id } }),
  ).toMatchObject({ status: 'COMPLETADO', occupiedSeats: 2 });
});

test('dos conductores pueden confirmar plazas recíprocamente en paralelo', async () => {
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
      return call('post', `/trips/${trip.id}/participations`, actor)
        .send({
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

test('confirmación simultánea con inicio o cancelación respeta estado y ocupación', async () => {
  for (const [action, hours] of [
    ['START', 40],
    ['CANCEL', 42],
  ]) {
    const trip = (
      await call('post', '/trips')
        .send(
          weekday(hours, {
            origin: { campusPointId: plaza.id },
            destination: floralia,
          }),
        )
        .expect(201)
    ).body;
    tripIds.push(trip.id);
    const [pickup, dropoff] = trip.itinerary.stops;
    const [confirmation, transition] = await Promise.all([
      call('post', `/trips/${trip.id}/participations`, 'ana').send({
        pickupId: pickup.id,
        dropoffId: dropoff.id,
      }),
      call('post', `/trips/${trip.id}/transition`).send({ action }),
    ]);
    expect([201, 409]).toContain(confirmation.status);
    expect(transition.status).toBe(200);
    const stored = await db.trip.findUniqueOrThrow({ where: { id: trip.id } });
    expect(stored.status).toBe(action === 'START' ? 'EN_CURSO' : 'CANCELADO');
    const occupied = await db.reservation.aggregate({
      where: { tripId: trip.id, status: 'CONFIRMED' },
      _sum: { quantity: true },
    });
    expect(stored.occupiedSeats).toBe(occupied._sum.quantity ?? 0);
    expect(stored.occupiedSeats).toBeLessThanOrEqual(1);
    expect(
      await db.reservation.count({
        where: { tripId: trip.id, status: 'PENDING' },
      }),
    ).toBe(0);
    if (action === 'CANCEL') expect(stored.occupiedSeats).toBe(0);
  }
});

test('confirmación revalida documentos hasta final y cancelación simultánea libera una sola vez', async () => {
  const trip = (
    await call('post', '/trips')
      .send(
        weekday(44, {
          origin: { campusPointId: plaza.id },
          destination: floralia,
        }),
      )
      .expect(201)
  ).body;
  tripIds.push(trip.id);
  const [pickup, dropoff] = trip.itinerary.stops;
  const input = { pickupId: pickup.id, dropoffId: dropoff.id };
  const endpoint = `/trips/${trip.id}/participations`;
  const original = await db.vehicleDocument.findUniqueOrThrow({
    where: { vehicleId: vehicle.id },
  });
  await db.vehicleDocument.update({
    where: { vehicleId: vehicle.id },
    data: { expiresAt: new Date(Date.now() + 3600000) },
  });
  try {
    await call('post', endpoint, 'ana').send(input).expect(409);
  } finally {
    await db.vehicleDocument.update({
      where: { vehicleId: vehicle.id },
      data: { expiresAt: original.expiresAt },
    });
  }
  expect(await db.reservation.count({ where: { tripId: trip.id } })).toBe(0);
  const first = await call('post', endpoint, 'ana').send(input).expect(201);
  const [withdrawal, confirmation] = await Promise.all([
    call('post', `/participations/${first.body.id}/cancel`, 'ana'),
    call('post', endpoint, 'sara').send(input),
  ]);
  expect(withdrawal.status).toBe(200);
  expect([201, 409]).toContain(confirmation.status);
  const stored = await db.trip.findUniqueOrThrow({ where: { id: trip.id } });
  const occupied = await db.reservation.aggregate({
    where: { tripId: trip.id, status: 'CONFIRMED' },
    _sum: { quantity: true },
  });
  expect(stored.occupiedSeats).toBe(occupied._sum.quantity ?? 0);
  expect(stored.occupiedSeats).toBeLessThanOrEqual(1);
  expect(
    (await db.reservation.findUniqueOrThrow({ where: { id: first.body.id } }))
      .status,
  ).toBe('CANCELLED');
});
