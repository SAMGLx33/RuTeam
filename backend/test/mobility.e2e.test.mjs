import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';
let app,
  db,
  worker,
  campus,
  meeting,
  vehicle,
  tokens,
  users,
  trip,
  preference,
  notification;
const tripIds = [],
  preferenceIds = [],
  extraUserIds = [];
const call = (method, path, actor = 'ana') => {
  const agent = request(app.getHttpServer());
  return agent[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens[actor], { type: 'bearer' });
};
const schedule = (date) => {
  const local = new Date(date.getTime() - 5 * 3600000);
  return { days: [local.getUTCDay() || 7], startMinute: 0, endMinute: 1439 };
};
const input = (date, extra = {}) => ({
  label: 'Rutina privada de prueba',
  campusPointId: campus.id,
  direction: 'HACIA_USC',
  ...schedule(date),
  placeLabel: 'Zona habitual privada123',
  latitude: 3.44,
  longitude: -76.52,
  radiusKm: 0.2,
  vehicleTypes: ['CAR'],
  notificationsEnabled: true,
  active: true,
  ...extra,
});
const publish = async (offset = 600) => {
  const departureAt = new Date(Date.now() + offset * 3600000);
  const response = await call('post', '/trips', 'diego')
    .send({
      vehicleId: vehicle.id,
      departureAt: departureAt.toISOString(),
      estimatedDurationMinutes: 45,
      offeredSeats: 1,
      ruleIds: [],
      itinerary: {
        direction: 'HACIA_USC',
        publicMeetingPoints: true,
        description: 'Ruta de prueba sintética',
        origin: {
          label: 'Domicilio sintético Calle Privada123 #45',
          latitude: 3.44,
          longitude: -76.52,
          instructions: 'Punto público autorizado',
        },
        destination: { campusPointId: meeting.id },
        stops: [],
        geometry: {
          type: 'LineString',
          coordinates: [
            [-76.52, 3.44],
            [meeting.longitude, meeting.latitude],
          ],
        },
      },
    })
    .expect(201);
  tripIds.push(response.body.id);
  return response.body;
};
async function drain(tripId) {
  for (let i = 0; i < 30; i++) {
    const job = await db.recommendationJob.findUnique({ where: { tripId } });
    if (job?.state === 'COMPLETED') return;
    await worker.tick();
  }
  throw new Error('El trabajo no terminó en lotes acotados');
}
beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    process.env.TEST_DATABASE_URL === process.env.DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('BD de test aislada requerida');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  const { RecommendationWorker } =
    await import('../dist/src/modules/mobility/application/recommendation.worker.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  worker = app.get(RecommendationWorker);
  tokens = {};
  users = {};
  for (const actor of ['ana', 'diego', 'sara']) {
    const response = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity: actor })
      .expect(201);
    tokens[actor] = response.body.token;
    users[actor] = response.body.user.id;
  }
  const catalog = (await call('get', '/campus/meeting-points').expect(200))
    .body;
  meeting = catalog.find(({ kind }) => kind === 'PLAZA');
  campus = catalog.find(({ id }) => id === meeting.campusSiteId);
  vehicle = (await call('get', '/vehicles', 'diego').expect(200)).body.find(
    ({ plate }) => plate === 'STU123',
  );
});
afterAll(async () => {
  if (db) {
    await db.mobilityPreference.deleteMany({
      where: { id: { in: preferenceIds } },
    });
    await db.user.deleteMany({ where: { id: { in: extraUserIds } } });
    await db.reservation.deleteMany({ where: { tripId: { in: tripIds } } });
    await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  }
  await app?.close();
});

test('preferencias privadas múltiples con edición/desactivación/borrado sólo propio', async () => {
  const date = new Date(Date.now() + 600 * 3600000);
  preference = (
    await call('post', '/mobility/preferences').send(input(date)).expect(201)
  ).body;
  preferenceIds.push(preference.id);
  expect(preference).toMatchObject({
    latitude: 3.44,
    longitude: -76.52,
    radiusKm: 0.2,
    active: true,
  });
  expect(preference).not.toHaveProperty('userId');
  const another = (
    await call('post', '/mobility/preferences')
      .send(input(date, { label: 'Otro horario', direction: 'DESDE_USC' }))
      .expect(201)
  ).body;
  preferenceIds.push(another.id);
  expect(
    (await call('get', '/mobility/preferences').expect(200)).body.map(
      ({ id }) => id,
    ),
  ).toEqual(expect.arrayContaining([preference.id, another.id]));
  expect(
    (await call('get', '/mobility/preferences', 'sara').expect(200)).body.map(
      ({ id }) => id,
    ),
  ).not.toContain(preference.id);
  await call('patch', `/mobility/preferences/${preference.id}`, 'sara')
    .send(input(date))
    .expect(404);
  await call('delete', `/mobility/preferences/${preference.id}`, 'sara').expect(
    404,
  );
  await call('patch', `/mobility/preferences/${another.id}`)
    .send(input(date, { label: 'Inactiva', active: false }))
    .expect(200);
  await call('delete', `/mobility/preferences/${another.id}`).expect(204);
  await call('post', '/mobility/preferences')
    .send(input(date, { latitude: null }))
    .expect(400);
  await call('post', '/mobility/preferences')
    .send(input(date, { days: [8] }))
    .expect(400);
  await call('post', '/mobility/preferences')
    .send(input(date, { startMinute: 900, endMinute: 800 }))
    .expect(400);
  await call('post', '/mobility/preferences')
    .send(input(date, { campusPointId: meeting.id }))
    .expect(400);
  await call('post', '/mobility/preferences')
    .send({ ...input(date), userId: users.sara })
    .expect(400);
});

test('feed automático no expone coordenadas/domicilio/preferencias y Todos funciona sin perfil', async () => {
  trip = await publish();
  expect(
    await db.recommendationJob.findUnique({ where: { tripId: trip.id } }),
  ).toMatchObject({ state: 'PENDING' });
  const personal = await call('get', '/trips/feed')
    .query({ tab: 'FOR_YOU' })
    .expect(200);
  const card = personal.body.items.find(({ id }) => id === trip.id);
  expect(card).toMatchObject({
    recommendation: { type: 'DIRECT' },
    availableSeats: 1,
    direction: 'HACIA_USC',
  });
  const serialized = JSON.stringify(card);
  for (const forbidden of [
    'latitude',
    'longitude',
    'geometry',
    'student-fixtures',
    'Domicilio sintético',
    'Zona habitual privada123',
    'passwordHash',
    'tokenHash',
    'plate',
  ])
    expect(serialized).not.toContain(forbidden);
  const empty = await call('get', '/trips/feed', 'sara')
    .query({ tab: 'FOR_YOU' })
    .expect(200);
  expect(empty.body).toMatchObject({ items: [], hasActivePreferences: false });
  expect(
    (
      await call('get', '/trips/feed', 'sara').query({ tab: 'ALL' }).expect(200)
    ).body.items.map(({ id }) => id),
  ).toContain(trip.id);
  expect(
    (
      await call('get', '/trips/feed', 'diego')
        .query({ tab: 'ALL' })
        .expect(200)
    ).body.items.map(({ id }) => id),
  ).not.toContain(trip.id);
  const detail = (await call('get', `/trips/${trip.id}`).expect(200)).body;
  expect(detail).toMatchObject({
    status: 'PROGRAMADO',
    acceptsParticipation: true,
    match: { pickupId: trip.itinerary.stops[0].id },
    recommendation: { type: 'DIRECT' },
  });
  expect(detail.itinerary.geometry).toEqual(trip.itinerary.geometry);
  expect(
    (await call('get', `/trips/${trip.id}`, 'diego').expect(200)).body
      .acceptsParticipation,
  ).toBe(false);
});

test('trabajo persistente recupera lease vencido y no duplica avisos por múltiples perfiles o reintentos', async () => {
  const extra = (
    await call('post', '/mobility/preferences')
      .send(
        input(new Date(trip.departureAt), {
          label: 'Otra preferencia compatible',
        }),
      )
      .expect(201)
  ).body;
  preferenceIds.push(extra.id);
  await db.recommendationJob.update({
    where: { tripId: trip.id },
    data: { state: 'PROCESSING', leaseUntil: new Date(Date.now() - 1000) },
  });
  await drain(trip.id);
  const rows = await db.tripNotification.findMany({
    where: { tripId: trip.id },
  });
  expect(rows).toHaveLength(1);
  expect(rows[0].recipientId).toBe(users.ana);
  notification = rows[0];
  await db.recommendationJob.update({
    where: { tripId: trip.id },
    data: { state: 'PENDING', cursor: null, availableAt: new Date() },
  });
  await drain(trip.id);
  expect(await db.tripNotification.count({ where: { tripId: trip.id } })).toBe(
    1,
  );
  expect((await call('get', '/notifications').expect(200)).body.items).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        id: notification.id,
        tripId: trip.id,
        available: true,
        matchType: 'DIRECT',
      }),
    ]),
  );
  expect(
    (await call('get', '/notifications', 'sara').expect(200)).body.items.map(
      ({ id }) => id,
    ),
  ).not.toContain(notification.id);
  await call('post', `/notifications/${notification.id}/read`, 'sara').expect(
    404,
  );
  const read = (
    await call('post', `/notifications/${notification.id}/read`).expect(200)
  ).body;
  const replay = (
    await call('post', `/notifications/${notification.id}/read`).expect(200)
  ).body;
  expect(read.readAt).toEqual(expect.any(String));
  expect(replay.readAt).toBe(read.readAt);
  expect(
    (await db.trip.findUnique({ where: { id: trip.id } })).occupiedSeats,
  ).toBe(0);
  expect(await db.reservation.count({ where: { tripId: trip.id } })).toBe(0);
});

test('lleno y cancelado salen del feed; aviso y detalle muestran estado actual sin match ni reserva nueva', async () => {
  const [pickup, dropoff] = trip.itinerary.stops;
  const participation = (
    await call('post', `/trips/${trip.id}/participations`, 'sara')
      .send({ pickupId: pickup.id, dropoffId: dropoff.id })
      .expect(201)
  ).body;
  expect(
    (
      await call('get', '/trips/feed').query({ tab: 'FOR_YOU' }).expect(200)
    ).body.items.map(({ id }) => id),
  ).not.toContain(trip.id);
  expect(
    (await call('get', '/notifications').expect(200)).body.items.find(
      ({ id }) => id === notification.id,
    ).available,
  ).toBe(false);
  const full = (await call('get', `/trips/${trip.id}`).expect(200)).body;
  expect(full).toMatchObject({
    status: 'PROGRAMADO',
    availableSeats: 0,
    acceptsParticipation: false,
    acceptsPickupProposal: false,
    match: null,
    recommendation: null,
  });
  await call(
    'post',
    `/participations/${participation.id}/cancel`,
    'sara',
  ).expect(200);
  expect(
    (
      await call('get', '/trips/feed').query({ tab: 'FOR_YOU' }).expect(200)
    ).body.items.map(({ id }) => id),
  ).toContain(trip.id);
  await call('post', `/trips/${trip.id}/transition`, 'diego')
    .send({ action: 'CANCEL' })
    .expect(200);
  expect(
    (
      await call('get', '/trips/feed').query({ tab: 'ALL' }).expect(200)
    ).body.items.map(({ id }) => id),
  ).not.toContain(trip.id);
  expect(
    (await call('get', `/trips/${trip.id}`).expect(200)).body,
  ).toMatchObject({
    status: 'CANCELADO',
    acceptsParticipation: false,
    acceptsPickupProposal: false,
    match: null,
    recommendation: null,
  });
  expect(
    (await call('get', '/notifications').expect(200)).body.items.find(
      ({ id }) => id === notification.id,
    ).available,
  ).toBe(false);
});

test('proximidad a geometría produce potencial sin pickup ni plaza; preferencias editadas se reflejan al instante', async () => {
  const potential = await publish(650);
  const date = new Date(potential.departureAt);
  const marker = {
    latitude: (3.44 + meeting.latitude) / 2,
    longitude: (-76.52 + meeting.longitude) / 2,
  };
  const own = (
    await call('post', '/mobility/preferences', 'sara')
      .send(input(date, { ...marker, radiusKm: 0.1 }))
      .expect(201)
  ).body;
  preferenceIds.push(own.id);
  const feed = (
    await call('get', '/trips/feed', 'sara')
      .query({ tab: 'FOR_YOU' })
      .expect(200)
  ).body;
  expect(feed.items.find(({ id }) => id === potential.id)).toMatchObject({
    recommendation: { type: 'POTENTIAL', pickupId: null, distanceKm: null },
  });
  expect(
    (await call('get', `/trips/${potential.id}`, 'sara').expect(200)).body,
  ).toMatchObject({
    match: null,
    acceptsParticipation: false,
    acceptsPickupProposal: true,
    recommendation: { type: 'POTENTIAL' },
  });
  expect(
    (await db.trip.findUnique({ where: { id: potential.id } })).occupiedSeats,
  ).toBe(0);
  await call('patch', `/mobility/preferences/${own.id}`, 'sara')
    .send(input(date, { ...marker, radiusKm: 0.1, active: false }))
    .expect(200);
  expect(
    (
      await call('get', '/trips/feed', 'sara')
        .query({ tab: 'FOR_YOU' })
        .expect(200)
    ).body.items.map(({ id }) => id),
  ).not.toContain(potential.id);
  await drain(potential.id);
  expect(
    await db.tripNotification.count({
      where: { tripId: potential.id, recipientId: users.sara },
    }),
  ).toBe(0);
});

test('publicación llena antes de procesar no notifica; retiro reevalúa sin duplicar y expirado no ofrece match', async () => {
  const full = await publish(768);
  const [pickup, dropoff] = full.itinerary.stops;
  const reserved = (
    await call('post', `/trips/${full.id}/participations`, 'sara')
      .send({ pickupId: pickup.id, dropoffId: dropoff.id })
      .expect(201)
  ).body;
  await drain(full.id);
  expect(await db.tripNotification.count({ where: { tripId: full.id } })).toBe(
    0,
  );
  await call('post', `/participations/${reserved.id}/cancel`, 'sara').expect(
    200,
  );
  await drain(full.id);
  expect(
    await db.tripNotification.count({
      where: { tripId: full.id, recipientId: users.ana },
    }),
  ).toBe(1);
  const expired = await publish(800);
  const departureAt = new Date(Date.now() - 2 * 3600000);
  await db.trip.update({
    where: { id: expired.id },
    data: {
      departureAt,
      expectedEndAt: new Date(departureAt.getTime() + 45 * 60000),
    },
  });
  await drain(expired.id);
  expect(
    await db.tripNotification.count({ where: { tripId: expired.id } }),
  ).toBe(0);
  expect(
    (
      await call('get', '/trips/feed').query({ tab: 'ALL' }).expect(200)
    ).body.items.map(({ id }) => id),
  ).not.toContain(expired.id);
  expect(
    (await call('get', `/trips/${expired.id}`, 'diego').expect(200)).body,
  ).toMatchObject({
    match: null,
    acceptsParticipation: false,
    acceptsPickupProposal: false,
    recommendation: null,
  });
});

test('worker no avisa a correo no confirmado ni a una cuenta ordinaria con matrícula DEMO aparente', async () => {
  const sourceTrip = await publish(900);
  const date = new Date(sourceTrip.departureAt);
  const pending = await db.mobilityPreference.create({
    data: { ...input(date), userId: users.sara },
  });
  preferenceIds.push(pending.id);
  const untrusted = await db.user.create({
    data: {
      email: `untrusted-${sourceTrip.id}@usc.edu.co`,
      emailVerifiedAt: new Date(),
      profile: { create: { displayName: 'Cuenta sintética de validación' } },
      membership: {
        create: {
          group: 'STUDENT',
          status: 'ACTIVE',
          verifiedBy: 'DEMO',
          validUntil: new Date('2030-12-31'),
        },
      },
    },
  });
  extraUserIds.push(untrusted.id);
  const apparent = await db.mobilityPreference.create({
    data: { ...input(date), userId: untrusted.id },
  });
  preferenceIds.push(apparent.id);
  const original = await db.user.findUniqueOrThrow({
    where: { id: users.sara },
    select: { emailVerifiedAt: true },
  });
  await db.user.update({
    where: { id: users.sara },
    data: { emailVerifiedAt: null },
  });
  try {
    await drain(sourceTrip.id);
    expect(
      await db.tripNotification.count({
        where: {
          tripId: sourceTrip.id,
          recipientId: { in: [users.sara, untrusted.id] },
        },
      }),
    ).toBe(0);
  } finally {
    await db.user.update({
      where: { id: users.sara },
      data: { emailVerifiedAt: original.emailVerifiedAt },
    });
  }
});
