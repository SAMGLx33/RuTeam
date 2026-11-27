import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

let app, db, client, publication;
const ids = new Map();
const tokens = new Map();
const trips = [];
const contacts = [];
const call = (actor, method, path) =>
  client[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens.get(actor), { type: 'bearer' });

const economics = {
  estimate: { fuelCop: 9001, tollsCop: 1000, parkingCop: 0 },
  compensationMethods: ['NEQUI', 'CASH'],
};

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Se requiere una base PostgreSQL de prueba independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  client = request(app.getHttpServer());
  db = app.get(PrismaService);
  for (const identity of ['diego', 'ana', 'sara']) {
    const { body } = await client
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    tokens.set(identity, body.token);
    ids.set(identity, body.user.id);
  }
  const [campus, vehicle] = await Promise.all([
    db.campusDestination.findUniqueOrThrow({
      where: { code: 'USC-DEMO-SABIOS' },
    }),
    db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } }),
  ]);
  publication = {
    vehicleId: vehicle.id,
    offeredSeats: 3,
    ruleIds: [],
    estimatedDurationMinutes: 50,
    itinerary: {
      direction: 'DESDE_USC',
      publicMeetingPoints: true,
      description: 'Recorrido para cierre económico y seguridad',
      origin: { campusPointId: campus.id, label: 'Encuentro de prueba' },
      destination: {
        label: 'Destino público',
        latitude: 3.45,
        longitude: -76.51,
        instructions: 'Encuentro público señalizado',
      },
      stops: [],
    },
  };
}, 15000);

afterAll(async () => {
  try {
    if (!db) return;
    await db.emergencyContact.deleteMany({ where: { id: { in: contacts } } });
    await db.tripIncident.deleteMany({ where: { tripId: { in: trips } } });
    await db.tripCompensation.deleteMany({
      where: { reservation: { tripId: { in: trips } } },
    });
    await db.reservation.deleteMany({ where: { tripId: { in: trips } } });
    await db.trip.deleteMany({ where: { id: { in: trips } } });
  } finally {
    await app?.close();
  }
});

async function publish(hours, extra = {}) {
  const { body } = await call('diego', 'post', '/trips')
    .send({
      ...publication,
      departureAt: new Date(Date.now() + hours * 3600000).toISOString(),
      ...extra,
    })
    .expect(201);
  trips.push(body.id);
  return body;
}

function join(actor, trip) {
  const [pickup, dropoff] = trip.itinerary.stops;
  return call(actor, 'post', `/trips/${trip.id}/participations`).send({
    pickupId: pickup.id,
    dropoffId: dropoff.id,
  });
}

function transition(trip, action) {
  return call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action })
    .expect(200);
}

test('publicación y compensación exactas, coherentes en historial y concurrentes', async () => {
  const preview = '/trips/economics-preview';
  await call('ana', 'post', preview)
    .send({ economics, offeredSeats: 3 })
    .expect(403);
  await call('diego', 'post', preview)
    .send({ economics, offeredSeats: 5 })
    .expect(400);
  await call('diego', 'post', preview)
    .send({
      economics: {
        ...economics,
        estimate: { ...economics.estimate, tollsCop: -1 },
      },
      offeredSeats: 3,
    })
    .expect(400);
  expect(
    (
      await call('diego', 'post', preview)
        .send({ economics, offeredSeats: 1 })
        .expect(200)
    ).body,
  ).toMatchObject({
    totalCop: 10001,
    suggestedContributionCop: 5000,
    source: 'DRIVER_DECLARED',
  });
  const trial = await call('diego', 'post', preview)
    .send({ economics, offeredSeats: 3 })
    .expect(200);
  expect(trial.body).toMatchObject({
    estimate: economics.estimate,
    totalCop: 10001,
    suggestedContributionCop: 2500,
  });
  const trip = await publish(810, { economics });
  const free = await publish(811, { offeredSeats: 1 });
  const term = {
    suggestedContributionCop: 2500,
    compensationMethods: ['NEQUI', 'CASH'],
  };
  expect(free.economics).toEqual({
    suggestedContributionCop: 0,
    compensationMethods: [],
  });
  const detail = (await call('ana', 'get', `/trips/${trip.id}`).expect(200))
    .body;
  expect(detail.economics).toEqual(term);
  expect(detail).not.toHaveProperty('expenseEstimate');
  await call('ana', 'get', `/trips/${trip.id}/expense-estimate`).expect(404);
  await call('diego', 'post', `/trips/${trip.id}/expense-estimate`)
    .send(economics.estimate)
    .expect(409);

  const { body: withdrawn } = await join('ana', trip).expect(201);
  await call('ana', 'post', `/participations/${withdrawn.id}/cancel`).expect(
    200,
  );
  const confirmed = await Promise.all([join('ana', trip), join('ana', trip)]);
  expect(confirmed.map(({ status }) => status)).toEqual([201, 201]);
  const [a, replay] = confirmed.map(({ body }) => body);
  expect(replay.id).toBe(a.id);
  expect(a.economics).toEqual(term);
  const { body: absent } = await join('sara', trip).expect(201);

  const path = (id) => `/participations/${id}/compensation`;
  await call('sara', 'get', path(a.id)).expect(404);
  await call('ana', 'post', path(a.id)).send({ method: 'NEQUI' }).expect(409);
  await transition(trip, 'START');
  const pass = (
    await call('ana', 'post', `/participations/${a.id}/boarding-pass`).expect(
      201,
    )
  ).body;
  await call('diego', 'post', `/participations/${a.id}/board`).expect(200);
  await call('diego', 'post', `/trips/${trip.id}/boarding-pass/redeem`)
    .send({ code: pass.code })
    .expect(409);
  await transition(trip, 'FINISH');

  for (const [actor, id] of [
    ['sara', absent.id],
    ['ana', withdrawn.id],
  ]) {
    expect((await call(actor, 'get', path(id)).expect(200)).body).toMatchObject(
      { canDeclare: false, record: null },
    );
    await call(actor, 'post', path(id)).send({ method: 'NEQUI' }).expect(409);
  }
  expect(
    await db.reservation.findUnique({ where: { id: absent.id } }),
  ).toMatchObject({ noShowAt: expect.any(Date) });
  expect(
    await db.reservationBoardingPass.count({ where: { reservationId: a.id } }),
  ).toBe(0);
  expect((await call('ana', 'get', path(a.id)).expect(200)).body).toMatchObject(
    { terms: term, canDeclare: true },
  );
  await call('ana', 'post', path(a.id))
    .send({ method: 'DAVIPLATA' })
    .expect(409);
  const declarations = await Promise.all([
    call('ana', 'post', path(a.id)).send({ method: 'NEQUI' }),
    call('ana', 'post', path(a.id)).send({ method: 'CASH' }),
  ]);
  expect(declarations.map(({ status }) => status).sort()).toEqual([200, 409]);
  const { record } = declarations.find(({ status }) => status === 200).body;
  expect(record).toMatchObject({ amountCop: 2500, status: 'DECLARED' });
  const retry = await call('ana', 'post', path(a.id))
    .send({ method: record.method })
    .expect(200);
  expect(retry.body.record).toEqual(record);
  await call('ana', 'post', `${path(a.id)}/resolution`)
    .send({ action: 'ACKNOWLEDGE' })
    .expect(404);
  await call('diego', 'post', `${path(a.id)}/resolution`)
    .send({ action: 'ACKNOWLEDGE' })
    .expect(200);
  expect((await call('ana', 'get', path(a.id)).expect(200)).body).toMatchObject(
    {
      terms: term,
      canDeclare: false,
      record: { status: 'ACKNOWLEDGED', resolvedAt: expect.any(String) },
    },
  );
  const notices = await db.tripNotification.findMany({
    where: { tripId: trip.id },
  });
  const count = (kind, name) =>
    notices.filter(
      ({ kind: k, recipientId }) => k === kind && recipientId === ids.get(name),
    ).length;
  expect(count('COMPENSATION_DECLARED', 'diego')).toBe(1);
  expect(count('COMPENSATION_ACKNOWLEDGED', 'ana')).toBe(1);
  expect(count('PARTICIPATION_CONFIRMED', 'ana')).toBe(2);
  expect(count('PASSENGER_WITHDREW', 'diego')).toBe(1);
  expect(count('TRIP_STARTED', 'ana')).toBe(1);
  expect(count('PICKUP_NEXT', 'ana')).toBe(1);
  expect(count('TRIP_FINISHED', 'sara')).toBe(1);
  expect(count('RATING_AVAILABLE', 'sara')).toBe(0);
}, 25000);

test('contactos e incidencias son privados y el seguimiento distingue caducidad y término', async () => {
  const contactPath = '/me/emergency-contacts';
  const input = {
    name: 'Contacto sintético',
    phone: '+573000000001',
    available: true,
  };
  const { body: contact } = await call('ana', 'post', contactPath)
    .send(input)
    .expect(201);
  contacts.push(contact.id);
  expect(
    (await call('ana', 'get', contactPath).expect(200)).body,
  ).toContainEqual(expect.objectContaining(input));
  expect(
    (await call('sara', 'get', contactPath).expect(200)).body,
  ).not.toContainEqual(expect.objectContaining({ id: contact.id }));
  await call('sara', 'put', `${contactPath}/${contact.id}`)
    .send(input)
    .expect(404);
  await call('sara', 'delete', `${contactPath}/${contact.id}`).expect(404);
  await call('ana', 'put', `${contactPath}/${contact.id}`)
    .send({ ...input, available: false })
    .expect(200);
  await call('ana', 'post', contactPath)
    .send({ ...input, phone: 'tel:123' })
    .expect(400);

  const trip = await publish(812);
  const { body: passenger } = await join('ana', trip).expect(201);
  const incidentPath = `/trips/${trip.id}/incidents`;
  const locationPath = `/trips/${trip.id}/location`;
  const incident = {
    kind: 'ROAD_SAFETY',
    description: 'Detalle sintético para la prueba privada',
  };
  await call('ana', 'post', incidentPath).send(incident).expect(404);
  await transition(trip, 'START');
  await call('sara', 'get', incidentPath).expect(404);
  await call('sara', 'post', incidentPath).send(incident).expect(404);
  await call('ana', 'post', incidentPath)
    .send({ ...incident, reportedUserId: randomUUID() })
    .expect(400);
  await call('diego', 'post', `/participations/${passenger.id}/board`).expect(
    200,
  );
  const { body: saved } = await call('ana', 'post', incidentPath)
    .send(incident)
    .expect(201);
  expect(saved).toMatchObject({
    ...incident,
    id: expect.any(String),
    status: 'PRIVATE_RECORD',
  });
  expect(
    (await call('diego', 'get', incidentPath).expect(200)).body.records,
  ).not.toContainEqual(expect.objectContaining({ id: saved.id }));
  expect(
    (await call('ana', 'get', incidentPath).expect(200)).body.records,
  ).toContainEqual(saved);

  const sample = {
    latitude: 3.45,
    longitude: -76.51,
    capturedAt: new Date().toISOString(),
  };
  await call('diego', 'post', locationPath).send(sample).expect(204);
  expect((await call('ana', 'get', locationPath).expect(200)).body.state).toBe(
    'AVAILABLE',
  );
  const past = new Date(Date.now() - 125000);
  await db.tripDriverPosition.update({
    where: { tripId: trip.id },
    data: { capturedAt: past, sharedAt: past },
  });
  const stale = await call('ana', 'get', locationPath).expect(200);
  expect(stale.body).toMatchObject({
    state: 'STALE',
    sample: null,
    route: null,
  });
  await call('diego', 'delete', locationPath).expect(204);
  expect((await call('ana', 'get', locationPath).expect(200)).body.state).toBe(
    'NOT_SHARED',
  );
  await transition(trip, 'FINISH');
  expect(
    (await call('ana', 'get', locationPath).expect(200)).body,
  ).toMatchObject({ state: 'ENDED', sample: null });
  await call('sara', 'get', locationPath).expect(404);
  await call('ana', 'delete', `${contactPath}/${contact.id}`).expect(204);
}, 25000);
