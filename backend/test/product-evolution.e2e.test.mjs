import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { randomUUID } from 'node:crypto';
import { setTimeout as pause } from 'node:timers/promises';
import { TextDecoder } from 'node:util';
import request from 'supertest';

let app, db, server, url, template, driverEnergy, push, worker;
const users = new Map();
const trips = new Set();
const schedules = new Set();
const streams = new Set();
const day = (offset = 0) =>
  new Date(Date.now() - 5 * 3600_000 + offset * 86400_000)
    .toISOString()
    .slice(0, 10);
const headers = (actor) => ({
  'x-ruteam-client': 'native',
  Authorization: 'Bearer ' + users.get(actor).token,
});
const call = (actor, method, path) => {
  const api = request(server);
  return api[method]('/api/v1' + path).set(headers(actor));
};

beforeAll(async () => {
  const { TEST_DATABASE_URL, DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    TEST_DATABASE_URL === DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('PostgreSQL de prueba aislado requerido');
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  process.env.EXPO_PUSH_ENABLED = 'true';
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  const { ExpoPushDelivery } =
    await import('../dist/src/modules/mobility/notifications/expo-push-delivery.js');
  const { RecurringTripsWorker } =
    await import('../dist/src/modules/trips/application/recurring-trips.worker.js');
  app = await createApp();
  await app.listen(0, '127.0.0.1');
  server = app.getHttpServer();
  url = 'http://127.0.0.1:' + server.address().port + '/api/v1';
  db = app.get(PrismaService);
  push = app.get(ExpoPushDelivery);
  worker = app.get(RecurringTripsWorker);
  for (const identity of ['diego', 'ana', 'sara']) {
    const { body } = await request(server)
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    users.set(identity, body);
  }
  const campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-SABIOS' },
  });
  const vehicle = await db.vehicle.findUniqueOrThrow({
    where: { plate: 'STU123' },
  });
  driverEnergy = vehicle.energyProfile;
  const start = [Number(campus.longitude), Number(campus.latitude)];
  const middle = [-76.535, 3.42],
    finish = [-76.51, 3.45];
  template = {
    vehicleId: vehicle.id,
    estimatedDurationMinutes: 48,
    offeredSeats: 3,
    ruleIds: [],
    itinerary: {
      direction: 'DESDE_USC',
      publicMeetingPoints: true,
      description: 'Recorrido público de evolución',
      origin: { campusPointId: campus.id, label: 'Encuentro institucional' },
      stops: [
        {
          label: 'Salida intermedia',
          longitude: middle[0],
          latitude: middle[1],
          access: 'DROPOFF',
          instructions: 'Punto público',
        },
      ],
      destination: {
        label: 'Destino público',
        longitude: finish[0],
        latitude: finish[1],
        instructions: 'Punto señalizado',
      },
      geometry: { type: 'LineString', coordinates: [start, middle, finish] },
    },
  };
}, 45000);

afterAll(async () => {
  for (const stream of streams) stream.abort();
  try {
    if (!db) return;
    const scheduleIds = [...schedules];
    for (const { tripId } of await db.recurringOccurrence.findMany({
      where: { scheduleId: { in: scheduleIds }, tripId: { not: null } },
    }))
      trips.add(tripId);
    const ids = [...trips];
    await db.recurringOccurrence.deleteMany({
      where: { scheduleId: { in: scheduleIds } },
    });
    await db.recurringTrip.deleteMany({ where: { id: { in: scheduleIds } } });
    await db.reservation.deleteMany({ where: { tripId: { in: ids } } });
    await db.trip.deleteMany({ where: { id: { in: ids } } });
    if (template) {
      const { Prisma } = await import('../dist/src/generated/prisma/client.js');
      await db.vehicle.update({
        where: { id: template.vehicleId },
        data: { energyProfile: driverEnergy ?? Prisma.DbNull },
      });
    }
  } finally {
    await app?.close();
  }
}, 45000);

async function publish(hours) {
  const { body } = await call('diego', 'post', '/trips')
    .send({
      ...template,
      departureAt: new Date(Date.now() + hours * 3600000).toISOString(),
    })
    .expect(201);
  trips.add(body.id);
  return body;
}
const join = (actor, trip, stop = 2) =>
  call(actor, 'post', '/trips/' + trip.id + '/participations')
    .send({
      pickupId: trip.itinerary.stops[0].id,
      dropoffId: trip.itinerary.stops[stop].id,
    })
    .expect(201);
const transition = (trip, action, extra = {}) =>
  call('diego', 'post', '/trips/' + trip.id + '/transition')
    .send({
      action,
      confirmMissingDropoffs: action === 'FINISH' ? true : undefined,
      ...extra,
    })
    .expect(200);
const energy = {
  propulsion: 'COMBUSTION',
  source: 'GASOLINE_E10',
  unit: 'L_PER_100_KM',
  average: 8,
};

test('congela el factor en la publicación, calcula el tramo abordado y protege escenarios privados', async () => {
  const registeredVehicle = (
    await call('diego', 'post', '/vehicles')
      .send({
        plate: 'EVL709',
        type: 'CAR',
        passengerCapacity: 2,
        brand: 'Fixture energético',
        modelYear: 2024,
        color: 'GRIS',
        soatExpiresAt: new Date(Date.now() + 365 * 86400_000).toISOString(),
        energyProfile: energy,
      })
      .expect(201)
  ).body;
  try {
    expect(registeredVehicle.energyProfile).toMatchObject({
      source: 'GASOLINE_E10',
      normalizedPer100Km: 8,
    });
  } finally {
    await db.vehicle.delete({ where: { id: registeredVehicle.id } });
  }
  const vehiclePath = '/vehicles/' + template.vehicleId + '/energy';
  await call('ana', 'put', vehiclePath).send({ profile: energy }).expect(404);
  await call('diego', 'put', vehiclePath)
    .send({ profile: { ...energy, average: -1 } })
    .expect(400);
  await call('diego', 'put', vehiclePath).send({ profile: energy }).expect(200);
  const trip = await publish(580);
  const { body: ana } = await join('ana', trip, 1);
  await join('sara', trip);
  await call('diego', 'put', vehiclePath)
    .send({
      profile: {
        propulsion: 'ELECTRIC',
        source: 'COLOMBIAN_GRID',
        average: 18,
        unit: 'KWH_PER_100_KM',
      },
    })
    .expect(200);
  await transition(trip, 'START');
  await call('diego', 'post', '/participations/' + ana.id + '/board').expect(
    200,
  );
  await transition(trip, 'FINISH');
  const path = '/mobility/environment/trips/' + trip.id;
  const owner = (await call('diego', 'get', path).expect(200)).body;
  const passenger = (await call('ana', 'get', path).expect(200)).body;
  expect(owner.factor).toMatchObject({
    value: 7.618,
    version: '2016, tabla 5',
    scope: 'DIRECT_FUEL_CO2',
  });
  expect(owner.vehicleKg).toBeCloseTo(
    ((owner.distanceMeters / 100000) * 8 * 7.618) / 3.7854118,
    10,
  );
  expect(passenger.distanceMeters).toBeLessThan(owner.distanceMeters);
  expect(passenger.attributedKg + owner.attributedKg).toBeCloseTo(
    owner.vehicleKg,
    10,
  );
  expect(passenger.vehicleKg).toBeNull();
  await call('sara', 'get', path).expect(404);
  await call('sara', 'put', path + '/alternative')
    .send({ mode: 'WALK' })
    .expect(404);
  const saved = (
    await call('ana', 'put', path + '/alternative')
      .send({ mode: 'WALK' })
      .expect(200)
  ).body;
  expect(saved.alternative.differenceKg).toBe(-passenger.attributedKg);
  expect(
    (await call('ana', 'get', '/mobility/statistics?months=1').expect(200)).body
      .environmental,
  ).toMatchObject({
    status: 'AVAILABLE',
    totals: expect.arrayContaining([
      expect.objectContaining({ role: 'PASSENGER', period: null }),
    ]),
  });
  expect(
    (await call('diego', 'get', path).expect(200)).body.alternative,
  ).toBeNull();
  const reuse = (
    await call('diego', 'get', '/trips/' + trip.id + '/reuse').expect(200)
  ).body;
  expect(reuse.itinerary.geometry).toEqual(template.itinerary.geometry);
  await call('ana', 'get', '/trips/' + trip.id + '/reuse').expect(404);
  await call('diego', 'put', vehiclePath).send({ profile: null }).expect(200);
}, 45000);

function events(actor, tripId) {
  const controller = new globalThis.AbortController();
  streams.add(controller);
  const rows = [];
  const ready = (async () => {
    for (let attempt = 0; attempt < 10; attempt++) {
      const response = await fetch(url + '/realtime/trips/' + tripId, {
        headers: headers(actor),
        signal: controller.signal,
      });
      if (response.status === 503) {
        await response.arrayBuffer();
        await pause(300);
        continue;
      }
      expect(response.status).toBe(200);
      const reader = response.body.getReader();
      const consume = async () => {
        let remaining = '';
        const decoder = new TextDecoder();
        try {
          while (true) {
            const block = await reader.read();
            if (block.done) break;
            remaining += decoder.decode(block.value, { stream: true });
            const lines = remaining.split('\n\n');
            remaining = lines.pop();
            for (const line of lines)
              if (line.startsWith('data: '))
                rows.push(JSON.parse(line.slice(6)));
          }
        } catch (error) {
          if (!controller.signal.aborted) throw error;
        }
      };
      void consume();
      return;
    }
    throw new Error('Canal LISTEN no disponible');
  })();
  return {
    rows,
    ready,
    close: () => {
      controller.abort();
      streams.delete(controller);
    },
  };
}
async function waitFor(stream, kind, offset = 0) {
  for (let attempt = 0; attempt < 60; attempt++) {
    const match = stream.rows.slice(offset).find((row) => row.kind === kind);
    if (match) return match;
    await pause(100);
  }
  throw new Error('Señal no recibida: ' + kind);
}

test('SSE transmite invalidaciones tras commit, autoriza y retoma estados después de reconectar', async () => {
  const trip = await publish(582);
  const live = events('diego', trip.id);
  try {
    await live.ready;
    await waitFor(live, 'READY');
    await fetch(url + '/realtime').then((response) =>
      expect(response.status).toBe(401),
    );
    const denied = await fetch(url + '/realtime/trips/' + trip.id, {
      headers: headers('sara'),
    });
    expect(denied.status).toBe(404);
    await expect(
      db.$transaction(async (tx) => {
        await tx.trip.update({
          where: { id: trip.id },
          data: { version: { increment: 1 } },
        });
        throw new Error('rollback');
      }),
    ).rejects.toThrow('rollback');
    await pause(400);
    expect(live.rows.some((row) => row.kind === 'TRIP')).toBe(false);
    const { body: rider } = await join('ana', trip);
    expect(await waitFor(live, 'TRIP')).toEqual({
      kind: 'TRIP',
      tripId: trip.id,
    });
    expect(
      (await call('diego', 'get', '/trips/my').expect(200)).body.find(
        ({ id }) => id === trip.id,
      ).occupiedSeats,
    ).toBe(1);
    const original = events('ana', trip.id);
    try {
      await original.ready;
      await waitFor(original, 'READY');
    } finally {
      original.close();
    }
    const message = {
      body: 'Encuentro de prueba',
      clientMessageId: randomUUID(),
    };
    const chat = '/trips/' + trip.id + '/chat';
    const created = (
      await call('diego', 'post', chat + '/messages')
        .send(message)
        .expect(201)
    ).body;
    expect(await waitFor(live, 'CHAT')).toEqual({
      kind: 'CHAT',
      tripId: trip.id,
    });
    expect(
      (
        await call('diego', 'post', chat + '/messages')
          .send(message)
          .expect(201)
      ).body.id,
    ).toBe(created.id);
    const reconnect = events('ana', trip.id);
    try {
      await reconnect.ready;
      await waitFor(reconnect, 'READY');
      expect(
        (await call('ana', 'get', chat).expect(200)).body.messages,
      ).toMatchObject([{ id: created.id }]);
      const rooms = (
        await call('ana', 'get', '/chat/conversations').expect(200)
      ).body;
      expect(rooms.items).toContainEqual(
        expect.objectContaining({ tripId: trip.id, unreadCount: 1 }),
      );
      await transition(trip, 'START');
      const driving = (
        await call('diego', 'get', '/trips/' + trip.id + '/operation').expect(
          200,
        )
      ).body;
      expect(driving.manifest.awaitingHere).toBe(1);
      expect(driving.progress.next).toMatchObject({ position: 1 });
      const passenger = (
        await call('ana', 'get', '/trips/' + trip.id + '/operation').expect(200)
      ).body;
      expect(passenger.participation.id).toBe(rider.id);
      expect(passenger.manifest).toBeNull();
      await call('sara', 'get', '/trips/' + trip.id + '/operation').expect(404);
      const before = reconnect.rows.length;
      await call('diego', 'post', '/trips/' + trip.id + '/location')
        .send({
          latitude: 3.4,
          longitude: -76.5,
          capturedAt: new Date().toISOString(),
        })
        .expect(204);
      expect(await waitFor(reconnect, 'TRACKING', before)).toEqual({
        kind: 'TRACKING',
        tripId: trip.id,
      });
      await call('ana', 'post', '/auth/logout').expect(204);
      await waitFor(reconnect, 'SESSION_ENDED');
      const { body } = await request(server)
        .post('/api/v1/auth/demo/login')
        .set('x-ruteam-client', 'native')
        .send({ identity: 'ana' })
        .expect(201);
      users.set('ana', body);
    } finally {
      reconnect.close();
    }
    await transition(trip, 'INTERRUPT', {
      reason: 'SAFETY',
      confirmedSafe: true,
    });
  } finally {
    live.close();
  }
}, 45000);

test('agenda mantiene separados los previstos, publicados y reservas, y el centro consulta recursos propios', async () => {
  const startsOn = day(2),
    endsOn = day(12);
  const active = await publish(36);
  await join('ana', active);
  const schedule = (
    await call('diego', 'post', '/trip-schedules')
      .send({
        name: 'Agenda de prueba',
        startsOn,
        endsOn,
        time: '23:25',
        weekdays: [1, 2, 3, 4, 5, 6, 7],
        template,
      })
      .expect(201)
  ).body;
  schedules.add(schedule.id);
  const path = '/mobility/agenda?start=' + day() + '&days=28';
  let agenda = (await call('diego', 'get', path).expect(200)).body.entries;
  expect(agenda).toContainEqual(
    expect.objectContaining({
      kind: 'PROJECTED',
      tripId: null,
      scheduleId: schedule.id,
    }),
  );
  expect(agenda).toContainEqual(
    expect.objectContaining({
      kind: 'PENDING',
      tripId: null,
      scheduleId: schedule.id,
    }),
  );
  await worker.tick();
  agenda = (await call('diego', 'get', path).expect(200)).body.entries;
  const first = agenda.filter(
    ({ scheduleId, day }) => scheduleId === schedule.id && day === startsOn,
  );
  expect(first).toMatchObject([
    { kind: 'PUBLISHED', tripId: expect.any(String) },
  ]);
  expect(
    (await call('ana', 'get', path).expect(200)).body.entries,
  ).toContainEqual(
    expect.objectContaining({ kind: 'PARTICIPATION', tripId: active.id }),
  );
  expect(
    (await call('sara', 'get', path).expect(200)).body.entries,
  ).not.toContainEqual(expect.objectContaining({ tripId: active.id }));
  expect(
    (await call('ana', 'get', '/mobility/activity').expect(200)).body,
  ).toContainEqual(
    expect.objectContaining({
      category: 'TRIP',
      tripId: active.id,
      optional: false,
    }),
  );
  await call('diego', 'get', '/mobility/agenda?start=2026-02-30').expect(400);
  await transition(active, 'CANCEL');
}, 45000);

test('preferencias preservan cancelaciones y el outbox distingue ticket y recepción del proveedor', async () => {
  const settingsPath = '/notification-settings';
  const original = (await call('ana', 'get', settingsPath).expect(200)).body
    .preferences;
  const token = 'ExpoPushToken[' + randomUUID() + ']';
  const input = {
    platform: 'ANDROID',
    token,
    installationSecret: randomUUID(),
    consent: true,
  };
  const registered = (
    await call('ana', 'post', settingsPath + '/devices')
      .send(input)
      .expect(201)
  ).body;
  expect(registered).not.toHaveProperty('token');
  expect(
    (
      await call('ana', 'post', settingsPath + '/devices')
        .send(input)
        .expect(201)
    ).body.id,
  ).toBe(registered.id);
  await call('sara', 'post', settingsPath + '/devices')
    .send({ ...input, installationSecret: randomUUID() })
    .expect(404);
  await call(
    'sara',
    'delete',
    settingsPath + '/devices/' + registered.id,
  ).expect(404);
  try {
    await call('ana', 'put', settingsPath)
      .send({ ...original, recommendations: false, messages: false })
      .expect(200);
    const trip = await publish(585);
    const actor = users.get('ana').user.id;
    const hidden = await db.tripNotification.create({
      data: {
        recipientId: actor,
        tripId: trip.id,
        kind: 'TRIP_MATCH',
        matchType: 'DIRECT',
      },
    });
    const critical = await db.tripNotification.create({
      data: { recipientId: actor, tripId: trip.id, kind: 'TRIP_CANCELLED' },
    });
    const inbox = (await call('ana', 'get', '/notifications').expect(200)).body
      .items;
    expect(inbox).not.toContainEqual(
      expect.objectContaining({ id: hidden.id }),
    );
    expect(inbox).toContainEqual(expect.objectContaining({ id: critical.id }));
    expect(
      await db.pushDelivery.count({ where: { noticeId: critical.id } }),
    ).toBe(1);
    const savedFetch = globalThis.fetch;
    const sent = [];
    try {
      globalThis.fetch = async (destination, options) => {
        if (!String(destination).startsWith('https://exp.host/'))
          throw new Error('Destino inesperado');
        sent.push({ destination, body: JSON.parse(options.body) });
        return globalThis.Response.json({
          data: String(destination).endsWith('/send')
            ? [{ status: 'ok', id: 'fixture-ticket' }]
            : { 'fixture-ticket': { status: 'ok' } },
        });
      };
      await push.tick();
      const where = {
        noticeId_deviceId: { noticeId: critical.id, deviceId: registered.id },
      };
      expect((await db.pushDelivery.findUniqueOrThrow({ where })).stage).toBe(
        'TICKET',
      );
      expect(
        (
          await db.pushDelivery.findUniqueOrThrow({
            where: {
              noticeId_deviceId: {
                noticeId: hidden.id,
                deviceId: registered.id,
              },
            },
          })
        ).stage,
      ).toBe('FAILED');
      expect(sent).toHaveLength(1);
      expect(sent[0].body[0].data).toEqual({
        route: '/notifications',
        notificationId: critical.id,
      });
      await db.pushDelivery.update({
        where,
        data: { availableAt: new Date(0) },
      });
      await push.tick();
      expect((await db.pushDelivery.findUniqueOrThrow({ where })).stage).toBe(
        'PROVIDER_ACCEPTED',
      );
    } finally {
      globalThis.fetch = savedFetch;
    }
  } finally {
    await call('ana', 'put', settingsPath).send(original).expect(200);
    await call(
      'ana',
      'delete',
      settingsPath + '/devices/' + registered.id,
    ).expect(204);
    await db.pushDevice.deleteMany({ where: { id: registered.id } });
  }
}, 45000);
