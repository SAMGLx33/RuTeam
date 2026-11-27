import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { randomBytes, randomUUID } from 'node:crypto';
import request from 'supertest';

let app, db, vehicle, campus;
let hours = 45;
const testPassword = randomBytes(24).toString('base64url');
const tokens = new Map();
const users = new Map();
const trips = [];
const extraUsers = [];
const extraVehicles = [];

function call(actor, method, path) {
  const client = request(app.getHttpServer());
  return client[method]('/api/v1' + path)
    .set('x-ruteam-client', 'native')
    .auth(tokens.get(actor), { type: 'bearer' });
}

async function login(actor, email) {
  const response = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .set('x-ruteam-client', 'native')
    .send({ email, password: testPassword })
    .expect(200);
  tokens.set(actor, response.body.token);
}

async function publish(offeredSeats = 2, options = {}) {
  const draft = {
    vehicleId: options.vehicleId ?? vehicle.id,
    departureAt:
      options.departureAt ??
      new Date(Date.now() + hours++ * 3600000).toISOString(),
    offeredSeats,
    estimatedDurationMinutes: 20,
    ruleIds: [],
    itinerary: {
      publicMeetingPoints: true,
      description: 'Trayecto aislado de grupos',
      origin: { campusPointId: campus.id, label: 'Entrada de prueba USC' },
      destination: {
        label: 'Encuentro público',
        latitude: 3.43,
        longitude: -76.515,
        instructions: 'Junto al comercio',
      },
      stops: [],
    },
  };
  const { body: trip } = await call(options.driver ?? 'diego', 'post', '/trips')
    .send(draft)
    .expect(201);
  trips.push(trip.id);
  const [pickup, dropoff] = trip.itinerary.stops;
  return {
    id: trip.id,
    version: trip.version,
    draft,
    input: { pickupId: pickup.id, dropoffId: dropoff.id },
  };
}

const open = (trip, actor, expectedMembers = 2) =>
  call(actor, 'post', `/trips/${trip.id}/groups`).send({
    ...trip.input,
    expectedMembers,
  });

const join = (actor, code) =>
  call(actor, 'post', '/trip-groups/join').send({ code });

const confirm = (actor, group) =>
  call(actor, 'post', `/trip-groups/${group.id}/confirm`);

async function confirmed(tripId, occupiedSeats, requesterIds) {
  expect(await db.trip.findUnique({ where: { id: tripId } })).toMatchObject({
    occupiedSeats,
  });
  const reservations = await db.reservation.findMany({
    where: { tripId, status: 'CONFIRMED' },
    include: { members: { select: { userId: true } } },
  });
  expect(reservations.map(({ requesterId }) => requesterId).sort()).toEqual(
    [...requesterIds].sort(),
  );
  for (const row of reservations) {
    expect(row.quantity).toBe(1);
    expect(row.members).toEqual([{ userId: row.requesterId }]);
  }
}

beforeAll(async () => {
  const { DATABASE_URL, TEST_DATABASE_URL } = process.env;
  if (
    !TEST_DATABASE_URL ||
    DATABASE_URL === TEST_DATABASE_URL ||
    !new URL(TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error(
      'Grupos requiere una base independiente y fixtures de prueba',
    );
  process.env.DATABASE_URL = TEST_DATABASE_URL;
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  for (const name of ['ana', 'diego', 'sara']) {
    const email = name + '@student-fixtures.ruteam.invalid';
    const user = await db.user.findUniqueOrThrow({ where: { email } });
    users.set(name, user.id);
    const session = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity: name })
      .expect(201);
    tokens.set(name, session.body.token);
  }
  const { hashPassword } =
    await import('../dist/src/modules/auth/domain/password.js');
  const passwordHash = await hashPassword(testPassword);
  for (const name of ['juan', 'luz']) {
    const email = `group-${name}-${randomUUID()}@student-fixtures.ruteam.invalid`;
    const user = await db.user.create({
      data: {
        email,
        demoIdentity: `groups-${name}-${randomUUID().slice(0, 8)}`,
        passwordHash,
        emailVerifiedAt: new Date(),
        profile: { create: { displayName: name } },
        membership: {
          create: {
            status: 'ACTIVE',
            group: 'STUDENT',
            validUntil: new Date(Date.now() + 100 * 86400000),
          },
        },
      },
    });
    extraUsers.push(user.id);
    users.set(name, user.id);
    await login(name, email);
  }
  campus = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-ENTRADA' },
  });
  vehicle = await db.vehicle.findUniqueOrThrow({ where: { plate: 'STU123' } });
}, 15000);

afterAll(async () => {
  try {
    if (db && trips.length) {
      await db.tripGroup?.deleteMany({ where: { tripId: { in: trips } } });
      await db.reservation.deleteMany({ where: { tripId: { in: trips } } });
      await db.trip.deleteMany({ where: { id: { in: trips } } });
    }
    if (extraVehicles.length)
      await db.vehicle.deleteMany({ where: { id: { in: extraVehicles } } });
    if (extraUsers.length) {
      await db.driverEligibility.deleteMany({
        where: { userId: { in: extraUsers } },
      });
      await db.user.deleteMany({ where: { id: { in: extraUsers } } });
    }
  } finally {
    await app?.close();
  }
});

test('consentir no ocupa plazas, y confirmar dos veces crea una participación individual y un aviso por persona', async () => {
  const trip = await publish();
  await open(trip, 'ana', 1).expect(400);
  await open(trip, 'diego').expect(403);
  const { body: invitation } = await open(trip, 'ana').expect(201);
  const { group, invitationCode } = invitation;
  expect(invitationCode).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(group).toMatchObject({ status: 'OPEN', consentedMembers: 1 });
  const stored = await db.tripGroup.findUniqueOrThrow({
    where: { id: group.id },
  });
  expect(stored.inviteHash).toMatch(/^[0-9a-f]{64}$/);
  expect(stored.inviteHash).not.toBe(invitationCode);
  await call('sara', 'post', '/trip-groups/preview')
    .send({ code: invitationCode })
    .expect(200)
    .expect(({ body }) => {
      expect(body).toMatchObject({
        tripId: trip.id,
        pickupLabel: 'Entrada de prueba USC',
        dropoffLabel: 'Encuentro público',
        expectedMembers: 2,
      });
      expect(body).not.toHaveProperty('members');
    });
  await confirm('ana', group).expect(409);
  await confirm('juan', group).expect(403);
  await confirmed(trip.id, 0, []);
  await join('sara', invitationCode).expect(200);
  await join('sara', invitationCode).expect(200);
  await call('sara', 'post', `/trip-groups/${group.id}/invitation`).expect(403);
  const rotated = await call(
    'ana',
    'post',
    `/trip-groups/${group.id}/invitation`,
  ).expect(200);
  expect(rotated.body.invitationCode).not.toBe(invitationCode);
  expect(rotated.body.group).toMatchObject({
    consentedMembers: 2,
    expiresAt: group.expiresAt,
  });
  await join('luz', invitationCode).expect(404);
  await join('luz', rotated.body.invitationCode).expect(409);
  await call('sara', 'get', '/trip-groups')
    .expect(200)
    .expect(({ body }) => {
      expect(body).toEqual([
        expect.objectContaining({
          id: group.id,
          consentedMembers: 2,
          isOrganizer: false,
        }),
      ]);
      expect(body[0]).not.toHaveProperty('invitationCode');
    });
  await confirmed(trip.id, 0, []);
  const responses = await Promise.all([
    confirm('ana', group),
    confirm('ana', group),
  ]);
  expect(responses.map(({ status }) => status)).toEqual([200, 200]);
  expect(responses[0].body).toEqual(responses[1].body);
  await confirmed(trip.id, 2, [users.get('ana'), users.get('sara')]);
  const notices = await db.tripNotification.findMany({
    where: { tripId: trip.id, kind: 'GROUP_CONFIRMED' },
    select: { recipientId: true },
  });
  expect(notices.map(({ recipientId }) => recipientId).sort()).toEqual(
    [users.get('ana'), users.get('sara')].sort(),
  );
  await call('sara', 'get', `/trips/${trip.id}/chat`).expect(200);
  await call('luz', 'get', `/trips/${trip.id}/chat`).expect(404);
  const own = await db.reservation.findFirstOrThrow({
    where: { tripId: trip.id, requesterId: users.get('sara') },
  });
  await call('sara', 'post', `/participations/${own.id}/cancel`).expect(200);
  await call('sara', 'get', `/trips/${trip.id}/chat`).expect(404);
  await confirmed(trip.id, 1, [users.get('ana')]);
});

test('grupo e individual compiten por la misma capacidad sin sobreventa', async () => {
  const trip = await publish();
  const { body: invitation } = await open(trip, 'ana').expect(201);
  await join('sara', invitation.invitationCode).expect(200);
  const [group, individual] = await Promise.all([
    confirm('ana', invitation.group),
    call('juan', 'post', `/trips/${trip.id}/participations`).send(trip.input),
  ]);
  expect([
    [200, 409],
    [409, 201],
  ]).toContainEqual([group.status, individual.status]);
  await confirmed(
    trip.id,
    group.status === 200 ? 2 : 1,
    group.status === 200
      ? [users.get('ana'), users.get('sara')]
      : [users.get('juan')],
  );
});

test('dos grupos completos compiten y el perdedor no crea filas parciales', async () => {
  const trip = await publish(3);
  const { body: first } = await open(trip, 'ana').expect(201);
  const { body: second } = await open(trip, 'juan').expect(201);
  await join('sara', first.invitationCode).expect(200);
  await join('luz', second.invitationCode).expect(200);
  const results = await Promise.all([
    confirm('ana', first.group),
    confirm('juan', second.group),
  ]);
  expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
  const actors = results[0].status === 200 ? ['ana', 'sara'] : ['juan', 'luz'];
  await confirmed(
    trip.id,
    2,
    actors.map((actor) => users.get(actor)),
  );
});

test('un mismo estudiante sólo mantiene un consentimiento abierto por viaje y un código vencido o revocado no se acepta', async () => {
  const trip = await publish(3);
  const { body: first } = await open(trip, 'ana').expect(201);
  const { body: second } = await open(trip, 'juan').expect(201);
  const results = await Promise.all([
    join('sara', first.invitationCode),
    join('sara', second.invitationCode),
  ]);
  expect(results.map(({ status }) => status).sort()).toEqual([200, 409]);
  const winner = results[0].status === 200 ? first : second;
  const loser = results[0].status === 200 ? second : first;
  await call(
    'sara',
    'delete',
    `/trip-groups/${winner.group.id}/membership`,
  ).expect(200);
  await join('sara', loser.invitationCode).expect(200);
  await db.tripGroup.update({
    where: { id: winner.group.id },
    data: {
      createdAt: new Date(Date.now() - 120000),
      expiresAt: new Date(Date.now() - 60000),
    },
  });
  await join('luz', winner.invitationCode).expect(409);
  const organizer = loser === first ? 'ana' : 'juan';
  await call(organizer, 'delete', `/trip-groups/${loser.group.id}/membership`)
    .expect(200)
    .expect(({ body }) => expect(body.status).toBe('REVOKED'));
  await join('luz', loser.invitationCode).expect(409);
  await confirmed(trip.id, 0, []);
});

test('revalida vigencia y rechaza confirmaciones tras cancelar o iniciar el viaje', async () => {
  const trip = await publish();
  const { body: invitation } = await open(trip, 'ana').expect(201);
  await join('luz', invitation.invitationCode).expect(200);
  const userId = users.get('luz');
  const prior = await db.institutionalMembership.findUniqueOrThrow({
    where: { userId },
  });
  await db.institutionalMembership.update({
    where: { userId },
    data: { status: 'INACTIVE' },
  });
  try {
    await confirm('ana', invitation.group).expect(403);
    await confirmed(trip.id, 0, []);
  } finally {
    await db.institutionalMembership.update({
      where: { userId },
      data: { status: prior.status },
    });
  }
  await call('diego', 'post', `/trips/${trip.id}/transition`)
    .send({ action: 'CANCEL' })
    .expect(200);
  await confirm('ana', invitation.group).expect(409);
  await confirmed(trip.id, 0, []);

  const another = await publish();
  const { body: ready } = await open(another, 'ana').expect(201);
  await join('sara', ready.invitationCode).expect(200);
  const [group, started] = await Promise.all([
    confirm('ana', ready.group),
    call('diego', 'post', `/trips/${another.id}/transition`).send({
      action: 'START',
    }),
  ]);
  expect(started.status).toBe(200);
  expect([200, 409]).toContain(group.status);
  await confirmed(
    another.id,
    group.status === 200 ? 2 : 0,
    group.status === 200 ? [users.get('ana'), users.get('sara')] : [],
  );
});

test('un conflicto horario de un integrante conserva el grupo sin plazas y desaparece con el retiro', async () => {
  const expiresAt = new Date(Date.now() + 30 * 86400000);
  await db.driverEligibility.create({
    data: {
      userId: users.get('juan'),
      category: 'CAR',
      expiresAt,
      reviewStatus: 'APPROVED',
    },
  });
  const alternate = await db.vehicle.create({
    data: {
      ownerId: users.get('juan'),
      plate: 'GRP273',
      type: 'CAR',
      passengerCapacity: 2,
      brand: 'Marca sintética',
      color: 'GRIS',
      modelYear: 2021,
      document: { create: { expiresAt, reviewStatus: 'APPROVED' } },
    },
  });
  extraVehicles.push(alternate.id);
  const target = await publish();
  const other = await publish(2, {
    driver: 'juan',
    vehicleId: alternate.id,
    departureAt: target.draft.departureAt,
  });
  const existing = (
    await call('sara', 'post', `/trips/${other.id}/participations`)
      .send(other.input)
      .expect(201)
  ).body;
  const { body: invitation } = await open(target, 'ana').expect(201);
  await join('sara', invitation.invitationCode).expect(200);
  await call('diego', 'patch', `/trips/${target.id}`)
    .send({
      version: target.version,
      publication: { ...target.draft, offeredSeats: 1 },
    })
    .expect(409);
  await confirm('ana', invitation.group)
    .expect(409)
    .expect(({ body }) => {
      expect(body.message).toMatch(/conflicto de horario/);
    });
  await confirmed(target.id, 0, []);
  await call('sara', 'post', `/participations/${existing.id}/cancel`).expect(
    200,
  );
  await confirm('ana', invitation.group).expect(200);
  await confirmed(target.id, 2, [users.get('ana'), users.get('sara')]);
});
