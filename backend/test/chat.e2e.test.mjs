import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import request from 'supertest';

let app, db, vehicle, campus;
const tokens = new Map();
const trips = [];
const names = ['ana', 'diego', 'sara'];
const call = (actor, method, path) => {
  const client = request(app.getHttpServer());
  return client[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens.get(actor), { type: 'bearer' });
};

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Chat requiere una base de pruebas independiente');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  for (const identity of names) {
    const { body } = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    tokens.set(identity, body.token);
  }
  campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-SABIOS' },
  });
  vehicle = await db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } });
}, 15000);

afterAll(async () => {
  if (trips.length) {
    await db.reservation.deleteMany({ where: { tripId: { in: trips } } });
    await db.trip.deleteMany({ where: { id: { in: trips } } });
  }
  await app?.close();
});

async function publish(offset) {
  const { body } = await call('diego', 'post', '/trips')
    .send({
      vehicleId: vehicle.id,
      departureAt: new Date(Date.now() + offset * 3600000).toISOString(),
      estimatedDurationMinutes: 40,
      offeredSeats: 2,
      ruleIds: [],
      itinerary: {
        direction: 'DESDE_USC',
        publicMeetingPoints: true,
        origin: { campusPointId: campus.id },
        destination: {
          label: 'Zona de prueba',
          latitude: 3.44,
          longitude: -76.52,
          instructions: 'Espera en espacio público',
        },
        stops: [],
        description: 'Ruta pública de prueba',
      },
    })
    .expect(201);
  trips.push(body.id);
  return body;
}

function confirm(actor, trip) {
  const [origin, destination] = trip.itinerary.stops;
  return call(actor, 'post', `/trips/${trip.id}/participations`)
    .send({
      pickupId: origin.id,
      dropoffId: destination.id,
    })
    .expect(201);
}

test('viaje confirmado permite chat paginado y aviso único; retiro revoca el recurso', async () => {
  const trip = await publish(620);
  const path = `/trips/${trip.id}/chat`;
  await call('ana', 'get', path).expect(404);
  const { body: seat } = await confirm('ana', trip);
  await call('sara', 'get', path).expect(404);
  await call('ana', 'get', `${path}?cursor=invalid`).expect(400);
  const item = {
    clientMessageId: randomUUID(),
    body: 'Encuentro junto a la entrada',
  };
  const results = await Promise.all([
    call('diego', 'post', `${path}/messages`).send(item).expect(201),
    call('diego', 'post', `${path}/messages`).send(item).expect(201),
  ]);
  expect(results[0].body.id).toBe(results[1].body.id);
  expect(results[0].body.clientMessageId).toBe(item.clientMessageId);
  const { body: ownHistory } = await call('diego', 'get', path).expect(200);
  expect(ownHistory.messages[0].clientMessageId).toBe(item.clientMessageId);
  await call('diego', 'post', `${path}/messages`)
    .send({ ...item, body: 'Contenido cambiado' })
    .expect(409);
  for (let i = 1; i <= 20; i++)
    await call('diego', 'post', `${path}/messages`)
      .send({ clientMessageId: randomUUID(), body: `Referencia pública ${i}` })
      .expect(201);
  const { body: first } = await call('ana', 'get', path).expect(200);
  expect(first.messages).toHaveLength(20);
  expect(first.conversation.hasUnread).toBe(true);
  const older = await call('ana', 'get', path)
    .query({ cursor: first.nextCursor })
    .expect(200);
  expect(older.body.messages.map(({ id }) => id)).toEqual([results[0].body.id]);
  expect(older.body.messages[0]).not.toHaveProperty('clientMessageId');
  expect(
    await db.tripNotification.count({
      where: { tripId: trip.id, kind: 'CHAT_MESSAGE' },
    }),
  ).toBe(1);
  await call('ana', 'post', `${path}/read`)
    .send({ messageId: first.messages[0].id })
    .expect(204);
  await call('ana', 'post', `${path}/read`)
    .send({ messageId: results[0].body.id })
    .expect(204);
  const { body: current } = await call('ana', 'get', path).expect(200);
  expect(current.conversation.hasUnread).toBe(false);
  await call('ana', 'post', `/participations/${seat.id}/cancel`).expect(200);
  await call('ana', 'get', path).expect(404);
  const { body: list } = await call('ana', 'get', '/chat/conversations').expect(
    200,
  );
  expect(list.items.some(({ tripId }) => tripId === trip.id)).toBe(false);
}, 15000);

test('viaje completado conserva acceso de lectura para quien abordó y expira a las 24 h', async () => {
  const trip = await publish(622);
  const { body: boarded } = await confirm('ana', trip);
  await confirm('sara', trip);
  await db.trip.update({
    where: { id: trip.id },
    data: {
      departureAt: new Date(Date.now() + 10 * 60000),
      expectedEndAt: new Date(Date.now() + 50 * 60000),
    },
  });
  await call('diego', 'post', `/participations/${boarded.id}/board`).expect(
    200,
  );
  const path = `/trips/${trip.id}`;
  await call('diego', 'post', `${path}/transition`)
    .send({ action: 'START' })
    .expect(200);
  await call('diego', 'post', `${path}/transition`)
    .send({ action: 'FINISH', confirmMissingDropoffs: true })
    .expect(200);
  expect(
    (await call('ana', 'get', `${path}/chat`).expect(200)).body.conversation
      .canSend,
  ).toBe(false);
  await call('sara', 'get', `${path}/chat`).expect(404);
  await call('ana', 'post', `${path}/chat/messages`)
    .send({ clientMessageId: randomUUID(), body: 'Viaje terminado' })
    .expect(409);
  await db.trip.update({
    where: { id: trip.id },
    data: { startedAt: null, finishedAt: new Date(Date.now() - 86400001) },
  });
  await call('ana', 'get', `${path}/chat`).expect(404);
}, 15000);
