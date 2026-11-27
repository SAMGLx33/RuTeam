import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { createHash, randomUUID } from 'node:crypto';
import request from 'supertest';

let app,
  db,
  client,
  template,
  generate,
  worker,
  recommender,
  calendar,
  campusSiteId;
const sessions = new Map();
const tripIds = new Set();
const scheduleIds = new Set();
const preferenceIds = new Set();
const base = '/api/v1';
const credentials = (identity) => ({
  email: `${identity}@student-fixtures.ruteam.invalid`,
  password: process.env.AUTH_FIXTURE_PASSWORD,
});

const call = (actor, method, url, token = sessions.get(actor)?.token) => {
  const req = client[method](base + url).set('x-ruteam-client', 'native');
  return token ? req.auth(token, { type: 'bearer' }) : req;
};

const login = (identity) =>
  call(null, 'post', '/auth/login').send(credentials(identity)).expect(200);

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    TEST_DATABASE_URL === DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  ) {
    throw new Error('Se requiere PostgreSQL de prueba independiente');
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  const { RecurringTripsService } =
    await import('../dist/src/modules/trips/application/recurring-trips.service.js');
  const { RecurringTripsWorker } =
    await import('../dist/src/modules/trips/application/recurring-trips.worker.js');
  const { RecommendationWorker } =
    await import('../dist/src/modules/mobility/application/recommendation.worker.js');
  calendar = await import('../dist/src/modules/trips/domain/recurrence.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  client = request(app.getHttpServer());
  generate = app.get(RecurringTripsService);
  worker = app.get(RecurringTripsWorker);
  recommender = app.get(RecommendationWorker);
  for (const identity of ['diego', 'ana', 'sara']) {
    const { body } = await call(null, 'post', '/auth/demo/login')
      .send({ identity })
      .expect(201);
    sessions.set(identity, {
      token: body.token,
      account: { id: body.user.id },
    });
  }
  const [campus, vehicle] = await Promise.all([
    db.campusDestination.findUniqueOrThrow({
      where: { code: 'USC-DEMO-SABIOS' },
    }),
    db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } }),
  ]);
  campusSiteId = campus.campusSiteId;
  template = {
    vehicleId: vehicle.id,
    offeredSeats: 3,
    ruleIds: [],
    estimatedDurationMinutes: 42,
    itinerary: {
      direction: 'DESDE_USC',
      publicMeetingPoints: true,
      description: 'Recorrido de continuidad',
      origin: { campusPointId: campus.id, label: 'Entrada de prueba' },
      destination: {
        label: 'Destino de prueba',
        latitude: 3.45,
        longitude: -76.51,
        instructions: 'Referencia pública',
      },
      stops: [],
      geometry: {
        type: 'LineString',
        coordinates: [
          [Number(campus.longitude), Number(campus.latitude)],
          [-76.51, 3.45],
        ],
      },
    },
    economics: {
      estimate: { fuelCop: 12000, tollsCop: 0, parkingCop: 0 },
      compensationMethods: ['CASH'],
    },
  };
}, 45000);

const userId = (actor) => sessions.get(actor).account.id;

afterAll(async () => {
  try {
    if (!db) return;
    const schedules = [...scheduleIds];
    const generated = await db.recurringOccurrence.findMany({
      where: { scheduleId: { in: schedules } },
    });
    for (const { tripId } of generated) if (tripId) tripIds.add(tripId);
    const ids = [...tripIds];
    await db.mobilityPreference.deleteMany({
      where: { id: { in: [...preferenceIds] } },
    });
    await db.tripNotification.deleteMany({
      where: { OR: schedules.map((id) => ({ eventKey: { startsWith: id } })) },
    });
    await db.recurringOccurrence.deleteMany({
      where: { scheduleId: { in: schedules } },
    });
    await db.recurringTrip.deleteMany({ where: { id: { in: schedules } } });
    await db.tripIncident.deleteMany({ where: { tripId: { in: ids } } });
    await db.tripCompensation.deleteMany({
      where: { reservation: { tripId: { in: ids } } },
    });
    await db.reservation.deleteMany({ where: { tripId: { in: ids } } });
    await db.trip.deleteMany({ where: { id: { in: ids } } });
  } finally {
    await app?.close();
  }
});

const day = (offset) =>
  calendar.bogotaDay(new Date(Date.now() + offset * 86400000));
const weekday = (date) => calendar.calendarDate(date).getUTCDay() || 7;
const scheduleAction = (id, action) =>
  call('diego', 'post', `/trip-schedules/${id}/action`)
    .send({ action })
    .expect(200);

async function createSchedule(extra = {}) {
  const startsOn = day(2);
  const input = {
    name: 'Viaje de continuidad',
    startsOn,
    endsOn: day(4),
    time: '06:30',
    weekdays: [weekday(startsOn), weekday(day(4))],
    template,
    ...extra,
  };
  const { body } = await call('diego', 'post', '/trip-schedules')
    .send(input)
    .expect(201);
  scheduleIds.add(body.id);
  return { input, schedule: body };
}

async function publish(hours, extra = {}) {
  const { body } = await call('diego', 'post', '/trips')
    .send({
      ...template,
      departureAt: new Date(Date.now() + hours * 3600000).toISOString(),
      ...extra,
    })
    .expect(201);
  tripIds.add(body.id);
  return body;
}

function join(actor, trip) {
  const [pickup, dropoff] = trip.itinerary.stops;
  return call(actor, 'post', `/trips/${trip.id}/participations`)
    .send({ pickupId: pickup.id, dropoffId: dropoff.id })
    .expect(201);
}

const transition = (actor, trip, action, fields = {}) =>
  call(actor, 'post', `/trips/${trip.id}/transition`).send({
    action,
    confirmMissingDropoffs: action === 'FINISH' ? true : undefined,
    ...fields,
  });

test('recurrencias generan fechas Colombia idempotentes, reanudan pendientes y cancelan fechas explícitamente', async () => {
  const now = new Date('2026-11-30T02:00:00.000Z');
  const dates = calendar.upcomingDates(
    {
      startsOn: '2026-11-29',
      endsOn: '2026-12-02',
      weekdays: [7, 1, 3],
      time: '22:00',
    },
    now,
    2,
  );
  expect(dates.map(({ departureAt }) => departureAt.toISOString())).toEqual([
    '2026-11-30T03:00:00.000Z',
    '2026-12-01T03:00:00.000Z',
  ]);

  const { schedule, input } = await createSchedule();
  const url = `/trip-schedules/${schedule.id}`;
  await call('ana', 'get', url).expect(404);
  await call('ana', 'post', '/trip-schedules').send(input).expect(403);
  await call('diego', 'post', '/trip-schedules')
    .send({ ...input, startsOn: '2026-02-30' })
    .expect(400);
  const preference = await call('ana', 'post', '/mobility/preferences')
    .send({
      label: 'Rutina de recurrencia en prueba',
      campusPointId: campusSiteId,
      direction: 'DESDE_USC',
      days: input.weekdays,
      startMinute: 0,
      endMinute: 1439,
      placeLabel: 'Zona habitual de prueba',
      latitude: 3.45,
      longitude: -76.51,
      radiusKm: 0.2,
      vehicleTypes: ['CAR'],
      notificationsEnabled: true,
      active: true,
    })
    .expect(201);
  preferenceIds.add(preference.body.id);
  const driver = userId('diego');
  const externalNow = new Date(Date.now() + 1000);
  await Promise.all([
    worker.tick(),
    generate.generate(driver, schedule.id, externalNow),
    generate.generate(driver, schedule.id, externalNow),
  ]);
  const detail = (await call('diego', 'get', url).expect(200)).body;
  expect(detail.occurrences.map(({ date }) => date).sort()).toEqual([
    input.startsOn,
    input.endsOn,
  ]);
  const [later, earlier] = detail.occurrences;
  const firstId = earlier.trip.id;
  expect(earlier.departureAt).toBe(input.startsOn + 'T11:30:00.000Z');
  expect(
    await db.recommendationJob.count({
      where: { tripId: { in: [firstId, later.trip.id] } },
    }),
  ).toBe(2);
  expect(
    await db.tripNotification.count({
      where: {
        recipientId: driver,
        tripId: firstId,
        kind: 'OCCURRENCE_PUBLISHED',
      },
    }),
  ).toBe(1);
  for (let index = 0; index < 30; index++) {
    const job = await db.recommendationJob.findUnique({
      where: { tripId: firstId },
    });
    if (job?.state === 'COMPLETED') break;
    await recommender.tick();
  }
  expect(
    await db.tripNotification.count({
      where: {
        recipientId: userId('ana'),
        tripId: firstId,
        kind: 'TRIP_MATCH',
      },
    }),
  ).toBe(1);
  const { body: first } = await call('ana', 'get', `/trips/${firstId}`).expect(
    200,
  );
  const { body: participation } = await join('ana', first);
  expect(await db.reservation.count({ where: { tripId: later.trip.id } })).toBe(
    0,
  );
  await call('ana', 'post', `/trips/${firstId}/duplicate`)
    .send({ departureAt: day(35) + 'T12:00:00Z' })
    .expect(404);
  const duplicated = await call('diego', 'post', `/trips/${firstId}/duplicate`)
    .send({ departureAt: day(35) + 'T12:00:00Z' })
    .expect(201);
  tripIds.add(duplicated.body.id);
  expect(duplicated.body.id).not.toBe(firstId);
  expect(duplicated.body.itinerary.geometry).toEqual(first.itinerary.geometry);

  expect((await scheduleAction(schedule.id, 'PAUSE')).body.state).toBe(
    'PAUSED',
  );
  const newDate = day(5);
  const amended = {
    ...input,
    endsOn: newDate,
    weekdays: [...input.weekdays, weekday(newDate)],
    time: '08:15',
  };
  await call('diego', 'put', url).send(amended).expect(200);
  await worker.tick();
  expect(
    await db.recurringOccurrence.count({ where: { scheduleId: schedule.id } }),
  ).toBe(2);
  await call('diego', 'get', '/auth/account').expect(200);
  const eventsSince = new Date();
  const membership = await db.institutionalMembership.findUniqueOrThrow({
    where: { userId: driver },
  });
  try {
    await db.institutionalMembership.update({
      where: { userId: driver },
      data: { validUntil: new Date(Date.now() + 3600000) },
    });
    await scheduleAction(schedule.id, 'RESUME');
    await worker.tick();
    const failed = (
      await call('diego', 'get', url).expect(200)
    ).body.occurrences.find(({ date }) => date === newDate);
    expect(failed).toMatchObject({
      failure: expect.stringContaining('vigente'),
      trip: null,
    });
    await db.institutionalMembership.update({
      where: { userId: driver },
      data: { validUntil: new Date(Date.now() - 60000) },
    });
    const expired = await call('diego', 'get', '/auth/account').expect(200);
    expect(expired.body.eligibility.status).toBe('EXPIRED');
    await call('diego', 'get', '/auth/account').expect(200);
    expect(
      await db.tripNotification.count({
        where: {
          recipientId: driver,
          kind: 'ELIGIBILITY_CHANGED',
          createdAt: { gte: eventsSince },
        },
      }),
    ).toBe(1);
  } finally {
    await db.institutionalMembership.update({
      where: { userId: driver },
      data: { validUntil: membership.validUntil },
    });
  }
  await call('diego', 'get', '/auth/account').expect(200);
  await scheduleAction(schedule.id, 'RETRY');
  await worker.tick();
  const updated = (await call('diego', 'get', url).expect(200)).body;
  expect(
    updated.occurrences.find(({ date }) => date === newDate),
  ).toMatchObject({
    trip: { id: expect.any(String) },
    failure: null,
    departureAt: newDate + 'T13:15:00.000Z',
  });
  expect(
    updated.occurrences.find(({ date }) => date === input.startsOn),
  ).toMatchObject({
    trip: { id: firstId, occupiedSeats: 1 },
    departureAt: earlier.departureAt,
  });
  expect(
    (await scheduleAction(schedule.id, 'CANCEL')).body.occurrences.every(
      ({ trip }) => trip.status === 'PROGRAMADO',
    ),
  ).toBe(true);
  expect(
    (await scheduleAction(schedule.id, 'CANCEL_FUTURE')).body.occurrences.every(
      ({ trip }) => trip.status === 'CANCELADO',
    ),
  ).toBe(true);
  expect(
    await db.reservation.findUnique({ where: { id: participation.id } }),
  ).toMatchObject({ status: 'CANCELLED' });
  expect(
    await db.tripNotification.count({
      where: {
        tripId: firstId,
        recipientId: userId('ana'),
        kind: 'TRIP_CANCELLED',
      },
    }),
  ).toBe(1);
}, 45000);

test('movilidad, economía e incidencias privadas distinguen viaje completado, ausencia e interrupción segura', async () => {
  const stats = async (actor) =>
    (await call(actor, 'get', '/mobility/statistics?months=1').expect(200))
      .body;
  const before = {
    diego: await stats('diego'),
    ana: await stats('ana'),
    sara: await stats('sara'),
  };
  const complete = await publish(627);
  const { body: attended } = await join('ana', complete);
  await join('sara', complete);
  await transition('diego', complete, 'START').expect(200);
  await call('diego', 'post', `/participations/${attended.id}/board`).expect(
    200,
  );
  await transition('diego', complete, 'FINISH').expect(200);

  const interrupted = await publish(629);
  const { body: boarded } = await join('ana', interrupted);
  const { body: unboarded } = await join('sara', interrupted);
  await transition('diego', interrupted, 'START').expect(200);
  await call('diego', 'post', `/participations/${boarded.id}/board`).expect(
    200,
  );
  await transition('sara', interrupted, 'INTERRUPT', {
    reason: 'SAFETY',
    confirmedSafe: true,
  }).expect(403);
  await transition('diego', interrupted, 'INTERRUPT', {
    reason: 'SAFETY',
  }).expect(400);
  await transition('diego', interrupted, 'CANCEL').expect(409);
  await call('diego', 'post', `/trips/${interrupted.id}/location`)
    .send({
      latitude: 3.45,
      longitude: -76.51,
      capturedAt: new Date().toISOString(),
    })
    .expect(204);
  const ended = await transition('diego', interrupted, 'INTERRUPT', {
    reason: 'SAFETY',
    confirmedSafe: true,
  }).expect(200);
  expect(ended.body).toMatchObject({
    status: 'INTERRUMPIDO',
    occupiedSeats: 1,
    finishedAt: expect.any(String),
  });
  expect(
    await db.tripDriverPosition.findUnique({
      where: { tripId: interrupted.id },
    }),
  ).toBeNull();
  expect(
    (await call('ana', 'get', `/trips/${interrupted.id}/location`).expect(200))
      .body.state,
  ).toBe('ENDED');

  expect(
    await db.reservation.findUnique({ where: { id: unboarded.id } }),
  ).toMatchObject({ status: 'CANCELLED' });
  expect(
    await db.reservation.findUnique({ where: { id: boarded.id } }),
  ).toMatchObject({ status: 'CONFIRMED', boardedAt: expect.any(Date) });
  expect(
    await db.tripNotification.count({
      where: { tripId: interrupted.id, kind: 'TRIP_INTERRUPTED' },
    }),
  ).toBe(2);
  await call('ana', 'post', `/participations/${boarded.id}/compensation`)
    .send({ method: 'CASH' })
    .expect(409);
  const canceled = await publish(631);
  await transition('diego', canceled, 'CANCEL', {
    reason: 'CHANGE_OF_PLANS',
  }).expect(200);
  const distance = (
    await db.trip.findUniqueOrThrow({ where: { id: complete.id } })
  ).routeDistanceMeters;
  expect(distance).toBeGreaterThan(0);
  const driver = await stats('diego');
  expect(driver.totals).toMatchObject({
    driverTrips: before.diego.totals.driverTrips + 1,
    transportedParticipants: before.diego.totals.transportedParticipants + 1,
    driverDistanceMeters:
      (before.diego.totals.driverDistanceMeters ?? 0) + distance,
  });
  const rider = await stats('ana');
  expect(rider.totals.passengerTrips).toBe(
    before.ana.totals.passengerTrips + 1,
  );
  expect(rider.totals.passengerDistanceMeters).toBe(
    (before.ana.totals.passengerDistanceMeters ?? 0) + distance,
  );
  expect(rider.monthly[0].period).toBe(day(0).slice(0, 7));
  expect(rider.environmental).toMatchObject({
    status: 'NO_DATA',
    totals: [],
    missing: { VEHICLE_ENERGY: expect.any(Number) },
  });
  expect((await stats('sara')).totals).toEqual(before.sara.totals);
  await call(null, 'get', '/mobility/statistics').expect(401);

  const history = (actor, suffix = '') =>
    call(
      actor,
      'get',
      `/economics/history?tripId=${complete.id}${suffix}`,
    ).expect(200);
  const initial = (await history('ana', '&filter=SUGGESTED')).body;
  expect(initial.entries[0]).toMatchObject({
    expenseCop: null,
    suggestedCop: 3000,
    traveled: true,
  });
  expect(initial.totals.suggestedForTraveledCop).toBe(3000);
  expect((await history('sara', '&role=DRIVER')).body.entries).toEqual([]);
  const compensation = `/participations/${attended.id}/compensation`;
  await call('ana', 'post', compensation).send({ method: 'CASH' }).expect(200);
  expect(
    (await history('diego', '&role=DRIVER&filter=DECLARED')).body.totals,
  ).toMatchObject({ declaredCop: 3000, expenseCop: 12000 });
  await call('diego', 'post', compensation + '/resolution')
    .send({ action: 'DISPUTE' })
    .expect(200);
  const disputed = (await history('ana', '&filter=DISPUTED')).body;
  expect(disputed.totals.disputedCop).toBe(3000);
  expect((await history('sara', '&filter=DISPUTED')).body.entries).toEqual([]);
  expect((await history('ana', '&month=2000-01')).body.entries).toEqual([]);

  const eligible = (await call('ana', 'get', '/me/incidents/trips').expect(200))
    .body;
  expect(eligible.trips).toContainEqual(
    expect.objectContaining({ id: interrupted.id }),
  );
  const url = `/trips/${interrupted.id}/incidents`;
  const input = {
    kind: 'ECONOMIC',
    description: 'Registro privado de prueba del cierre durante el trayecto.',
  };
  await call('sara', 'post', url).send(input).expect(404);
  const { body: incident } = await call('ana', 'post', url)
    .send(input)
    .expect(201);
  expect(incident.status).toBe('PRIVATE_RECORD');
  expect(
    (await call('ana', 'get', '/me/incidents').expect(200)).body.records,
  ).toContainEqual(expect.objectContaining({ id: incident.id }));
  const exportUrl = `/me/incidents/${incident.id}/export`;
  await call('diego', 'get', exportUrl).expect(404);
  const exported = await call('ana', 'get', exportUrl).expect(200);
  expect(exported.body.record).toMatchObject({
    ...input,
    trip: { id: interrupted.id },
  });
  expect(exported.headers['cache-control']).toContain('no-store');
}, 45000);

test('cerrar cuenta protege viajes activos, revoca sesiones y conserva el historial tras recuperación', async () => {
  const { schedule } = await createSchedule({ time: '17:35' });
  const active = await publish(633);
  const future = await publish(635);
  const { body: reservation } = await join('ana', future);
  await join('sara', future);
  const anaClose = await call('ana', 'post', '/auth/lifecycle/close')
    .send({
      action: 'DEACTIVATE',
      confirmed: true,
      password: credentials('ana').password,
    })
    .expect(200);
  expect(anaClose.body).toMatchObject({
    state: 'DEACTIVATED',
    canReactivate: true,
    deletionRequest: null,
  });
  try {
    expect(
      await db.reservation.findUnique({ where: { id: reservation.id } }),
    ).toMatchObject({
      status: 'CANCELLED',
      withdrawalReason: 'ACCOUNT_CLOSED',
    });
    expect(
      await db.trip.findUnique({ where: { id: future.id } }),
    ).toMatchObject({ occupiedSeats: 1 });
    await call('ana', 'post', '/mobility/preferences').send({}).expect(401);
  } finally {
    await call(null, 'post', '/auth/lifecycle/recover')
      .send({
        ...credentials('ana'),
        action: 'REACTIVATE',
        confirmed: true,
      })
      .expect(200);
  }
  const { body: other } = await login('diego');
  const initial = (await call('diego', 'get', '/auth/lifecycle').expect(200))
    .body;
  const otherHash = createHash('sha256').update(other.token).digest('hex');
  const stored = await db.authSession.findUniqueOrThrow({
    where: { tokenHash: otherHash },
  });
  const otherSession = initial.sessions.find(
    ({ id, current }) => !current && id === stored.id,
  );
  expect(otherSession).toBeDefined();
  const password = credentials('diego').password;
  await call('diego', 'post', `/auth/lifecycle/sessions/${randomUUID()}/revoke`)
    .send({ password })
    .expect(401);
  await call(
    'diego',
    'post',
    `/auth/lifecycle/sessions/${otherSession.id}/revoke`,
  )
    .send({ password })
    .expect(204);
  await call('diego', 'get', '/auth/lifecycle', other.token).expect(401);
  const close = { action: 'REQUEST_DELETION', confirmed: true, password };
  await transition('diego', active, 'START').expect(200);
  await call('diego', 'post', '/auth/lifecycle/close').send(close).expect(409);
  const driverId = userId('diego');
  const activeMembership = await db.institutionalMembership.findUniqueOrThrow({
    where: { userId: driverId },
  });
  try {
    await db.institutionalMembership.update({
      where: { userId: driverId },
      data: { validUntil: new Date(Date.now() - 60000) },
    });
    await call('diego', 'get', '/trips/my').expect(403);
    const settings = (await call('diego', 'get', '/auth/lifecycle').expect(200))
      .body;
    expect(settings.activeTrips).toContainEqual(
      expect.objectContaining({
        id: active.id,
        asDriver: true,
        status: 'EN_CURSO',
      }),
    );
    await transition('diego', active, 'INTERRUPT', {
      reason: 'OTHER',
      confirmedSafe: true,
    }).expect(200);
  } finally {
    await db.institutionalMembership.update({
      where: { userId: driverId },
      data: { validUntil: activeMembership.validUntil },
    });
  }

  const recovery = (action) =>
    call(null, 'post', '/auth/lifecycle/recover').send({
      ...credentials('diego'),
      action,
      confirmed: true,
    });
  let closed = false;
  try {
    const response = await call('diego', 'post', '/auth/lifecycle/close')
      .send(close)
      .expect(200);
    closed = true;
    expect(response.body).toMatchObject({
      state: 'DEACTIVATED',
      canReactivate: false,
      deletionRequest: { status: 'REQUESTED' },
    });
    await call('diego', 'get', '/auth/lifecycle').expect(401);
    await call('diego', 'get', '/trip-schedules').expect(401);
    expect(
      await db.trip.findUnique({ where: { id: future.id } }),
    ).toMatchObject({
      status: 'CANCELADO',
      occupiedSeats: 0,
      terminationReason: 'ACCOUNT_CLOSED',
    });
    expect(
      await db.recurringTrip.findUnique({ where: { id: schedule.id } }),
    ).toMatchObject({ state: 'PAUSED' });
    await call(null, 'post', '/auth/lifecycle/status')
      .send({ ...credentials('diego'), password: 'invalid-proof' })
      .expect(401);
    expect(
      (
        await call(null, 'post', '/auth/lifecycle/status')
          .send(credentials('diego'))
          .expect(200)
      ).body,
    ).toMatchObject({ state: 'DEACTIVATED' });
    await recovery('REACTIVATE').expect(409);
    await recovery('WITHDRAW_DELETION').expect(200);
    expect((await recovery('REACTIVATE').expect(200)).body).toMatchObject({
      state: 'ACTIVE',
      deletionRequest: { status: 'WITHDRAWN' },
    });
    closed = false;
    await call('diego', 'get', '/auth/lifecycle').expect(401);
    sessions.set('diego', (await login('diego')).body);
    expect(
      (await call('diego', 'get', '/auth/lifecycle').expect(200)).body.state,
    ).toBe('ACTIVE');
  } finally {
    if (closed) {
      await recovery('WITHDRAW_DELETION');
      await recovery('REACTIVATE');
    }
  }
}, 45000);
