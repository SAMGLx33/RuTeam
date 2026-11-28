import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, expect, test } from '@jest/globals';
import request from 'supertest';

const prefix = 'ruteam-fixture-' + randomUUID();
const email = (n) => prefix + n + '@usc.edu.co';
const password = 'Solo pruebas RuTeam ' + randomUUID();
const users = new Set();
const trips = new Set();
let app, db;

function call(method, path, token) {
  const agent = request(app.getHttpServer());
  const response = agent[method]('/api/v1' + path).set(
    'x-ruteam-client',
    'native',
  );
  return token ? response.auth(token, { type: 'bearer' }) : response;
}

const register = (address, role = 'PASSENGER') =>
  call('post', '/auth/register').send({
    email: address,
    name: 'Cuenta de prueba',
    password,
    usagePreference: role,
    recoveryContact: {
      channel: 'EMAIL',
      contact: address.split('@')[0] + '@example.test',
    },
  });

async function login(address) {
  const response = await call('post', '/auth/login')
    .send({ email: address, password })
    .expect(200);
  users.add(response.body.account.id);
  return response.body;
}
async function onboarding(token, usagePreference) {
  for (const step of [1, 2, 3, 4]) {
    await call('patch', '/auth/onboarding', token)
      .send({
        step,
        usagePreference,
        ...(step === 4 && { complete: true }),
      })
      .expect(200);
  }
}

beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    process.env.TEST_DATABASE_URL === process.env.DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Registro requiere PostgreSQL aislado');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.INSTITUTIONAL_ACCESS_MODE = 'DECLARED_DOMAIN';
  process.env.DEMO_MODE = 'false';
  process.env.VERIFICATION_PROVIDER = 'official';
  for (const name of [
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'AUTH_TOKEN_SECRET',
    'AUTH_PUBLIC_URL',
  ])
    delete process.env[name];
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
}, 15000);

afterAll(async () => {
  try {
    if (db)
      await db.$transaction(async (tx) => {
        await tx.reservation.deleteMany({
          where: { tripId: { in: [...trips] } },
        });
        await tx.trip.deleteMany({ where: { id: { in: [...trips] } } });
        await tx.vehicle.deleteMany({ where: { ownerId: { in: [...users] } } });
        await tx.driverEligibility.deleteMany({
          where: { userId: { in: [...users] } },
        });
        const candidates = await tx.user.findMany({
          where: { email: { startsWith: prefix } },
          select: { id: true },
        });
        for (const { id } of candidates) users.add(id);
        await tx.institutionalMembership.deleteMany({
          where: { userId: { in: [...users] } },
        });
        await tx.user.deleteMany({ where: { id: { in: [...users] } } });
      });
  } finally {
    await app?.close();
  }
});

test('registra, inicia sesión y participa sin correo acreditado ni matrícula', async () => {
  const results = await Promise.all([
    register(email('a')),
    register(email('a').toUpperCase()),
  ]);
  for (const response of results) {
    expect(response.status).toBe(202);
    expect(response.body).toMatchObject({
      institutionalAccess: 'DECLARED_DOMAIN',
      emailDeliveryAvailable: false,
    });
  }
  expect(await db.user.count({ where: { email: email('a') } })).toBe(1);
  const account = await login(email('a'));
  expect(account.account).toMatchObject({
    institutionalAccess: 'DECLARED_DOMAIN',
    emailVerified: false,
    eligibility: { status: 'DECLARED', source: null, validUntil: null },
    capabilities: { passenger: true, driver: false },
    synthetic: false,
  });
  await onboarding(account.token, 'PASSENGER');
  await call('get', '/trips/feed', account.token).expect(200);
  await call('get', '/auth/me', account.token)
    .expect(200)
    .expect(({ body }) => expect(body.membership).toBeNull());
  expect(
    await db.institutionalMembership.count({
      where: { userId: account.account.id },
    }),
  ).toBe(0);
  expect(
    await db.accountToken.count({ where: { userId: account.account.id } }),
  ).toBe(0);
  await call('post', '/auth/password/request')
    .send({ email: email('a') })
    .expect(503);
  await call('post', '/auth/logout', account.token).expect(204);
  await call('get', '/trips/feed', account.token).expect(401);
}, 15000);

test('rechaza dominios por sufijo, subdominio y partes locales inválidas', async () => {
  for (const address of [
    'alias@usc.edu.co.ejemplo.com',
    'alias@correo.usc.edu.co',
  ]) {
    await register(address).expect(400);
  }
});

test('dos cuentas ordinarias publican, encuentran y operan un viaje con documentos declarados', async () => {
  await register(email('driver'), 'DRIVER_AND_PASSENGER').expect(202);
  await register(email('rider')).expect(202);
  const driver = await login(email('driver'));
  const rider = await login(email('rider'));
  await onboarding(driver.token, 'DRIVER_AND_PASSENGER');
  await onboarding(rider.token, 'PASSENGER');
  expect(driver.account.capabilities.driver).toBe(false);
  await call('get', '/driver-eligibility', driver.token)
    .expect(200)
    .expect('Content-Type', /json/)
    .expect('null');
  const expiry = new Date(Date.now() + 15 * 24 * 3600_000).toISOString();
  const day = expiry.slice(0, 10);
  for (const expiresAt of ['31/02/2099', '2099-02-29', '2000-01-01'])
    await call('post', '/driver-eligibility', driver.token)
      .send({ category: 'CAR', expiresAt })
      .expect(400);
  const { body: license } = await call(
    'post',
    '/driver-eligibility',
    driver.token,
  )
    .send({ category: 'CAR', expiresAt: day })
    .expect(201);
  expect(license).toMatchObject({
    demo: false,
    verificationStatus: 'DECLARED',
    expiresAt: new Date(day + 'T23:59:59.999-05:00').toISOString(),
  });
  const { body: vehicle } = await call('post', '/vehicles', driver.token)
    .send({
      plate: 'RUT727',
      type: 'CAR',
      passengerCapacity: 2,
      brand: 'Marca de prueba',
      modelYear: 2020,
      color: 'GRIS',
      soatExpiresAt: day,
    })
    .expect(201);
  expect(vehicle).toMatchObject({
    demo: false,
    eligibleNow: true,
    soatExpiresAt: license.expiresAt,
    verificationStatus: 'DECLARED',
  });
  const { body: campus } = await call(
    'get',
    '/campus/publication-point',
    driver.token,
  ).expect(200);
  expect(campus).toMatchObject({
    name: 'Ciudadela Pampalinda',
    latitude: 3.403412,
    longitude: -76.547719,
  });
  const other = await db.campusDestination.findUniqueOrThrow({
    where: { code: 'USC-DEMO-ENTRADA' },
  });
  const publication = {
    vehicleId: vehicle.id,
    offeredSeats: 1,
    departureAt: new Date(Date.now() + 50 * 60_000).toISOString(),
    estimatedDurationMinutes: 35,
    ruleIds: [],
    itinerary: {
      publicMeetingPoints: true,
      description: 'Recorrido sintético de validación',
      origin: { campusPointId: campus.id, label: 'Plazoleta de los Sabios' },
      destination: {
        label: 'Local público de prueba',
        latitude: 3.45,
        longitude: -76.51,
      },
      stops: [],
    },
  };
  await call('post', '/trips', driver.token)
    .send({
      ...publication,
      itinerary: {
        ...publication.itinerary,
        origin: { campusPointId: other.id },
      },
    })
    .expect(400)
    .expect(({ body }) =>
      expect(body.message).toContain('Ciudadela Pampalinda'),
    );
  const { body: trip } = await call('post', '/trips', driver.token)
    .send(publication)
    .expect(201);
  trips.add(trip.id);
  const root = '/trips/' + trip.id;
  await call('get', '/trips/feed?tab=ALL', rider.token)
    .expect(200)
    .expect(({ body }) =>
      expect(body.items.map(({ id }) => id)).toContain(trip.id),
    );
  const [pickup, dropoff] = trip.itinerary.stops;
  const { body: seat } = await call(
    'post',
    root + '/participations',
    rider.token,
  )
    .send({ pickupId: pickup.id, dropoffId: dropoff.id })
    .expect(201);
  await call('post', root + '/chat/messages', driver.token)
    .send({ clientMessageId: randomUUID(), body: 'Encuentro de prueba' })
    .expect(201);
  expect(
    await db.tripNotification.count({
      where: {
        tripId: trip.id,
        recipientId: rider.account.id,
        kind: 'CHAT_MESSAGE',
      },
    }),
  ).toBe(1);
  const { DailyMobilityWorker } =
    await import('../dist/src/modules/mobility/application/daily-mobility.worker.js');
  await app
    .get(DailyMobilityWorker)
    .tick(new Date(Date.parse(trip.departureAt) - 15 * 60_000));
  expect(
    await db.tripNotification.count({
      where: {
        tripId: trip.id,
        recipientId: rider.account.id,
        kind: 'TRIP_PICKUP_REMINDER',
      },
    }),
  ).toBe(1);
  await call('post', root + '/transition', driver.token)
    .send({ action: 'START' })
    .expect(200);
  await call(
    'post',
    '/participations/' + seat.id + '/board',
    driver.token,
  ).expect(200);
  await call(
    'post',
    root + '/stops/' + dropoff.id + '/reach',
    driver.token,
  ).expect(200);
  await call(
    'post',
    '/participations/' + seat.id + '/drop-off',
    driver.token,
  ).expect(200);
  await call('post', root + '/transition', driver.token)
    .send({ action: 'FINISH' })
    .expect(200);
  await call('post', root + '/ratings', rider.token)
    .send({ rateeId: driver.account.id, stars: 5 })
    .expect(201);
}, 20000);

test('una cuenta previa usa su contraseña y el dominio no reabre accesos revocados ni admite enlaces tardíos', async () => {
  const { hashPassword } =
    await import('../dist/src/modules/auth/domain/password.js');
  const hash = await hashPassword(password);
  const existing = await db.user.create({
    data: {
      email: email('historic'),
      passwordHash: hash,
      profile: { create: { displayName: 'Cuenta previa de prueba' } },
      usagePreference: 'PASSENGER',
    },
  });
  const tokenHashes = ['PASSWORD_RESET', 'EMAIL_CONFIRMATION'].map(
    (purpose) => ({
      userId: existing.id,
      purpose,
      tokenHash: randomUUID().replaceAll('-', '').repeat(2),
      expiresAt: new Date(Date.now() + 60_000),
    }),
  );
  await db.accountToken.createMany({ data: tokenHashes });
  const active = await login(email('historic'));
  await call('get', '/trips/feed', active.token).expect(200);
  const { AuthRepository } =
    await import('../dist/src/modules/auth/infrastructure/repositories/auth.repository.js');
  const repo = app.get(AuthRepository);
  for (const { tokenHash, purpose } of tokenHashes)
    expect(
      await repo.consumeAccountToken(tokenHash, purpose, 'hash-no-aplicable'),
    ).toBe(false);
  const unchanged = await db.user.findUniqueOrThrow({
    where: { id: existing.id },
  });
  expect(unchanged).toMatchObject({
    emailVerifiedAt: null,
    passwordHash: hash,
    declaredDomainAccessAt: expect.any(Date),
  });
  await db.institutionalMembership.create({
    data: {
      userId: existing.id,
      status: 'REVOKED',
      group: 'STUDENT',
      verifiedBy: 'TEST_FIXTURE',
      validUntil: new Date(Date.now() + 3600_000),
    },
  });
  await call('get', '/trips/feed', active.token).expect(403);
  await db.institutionalMembership.delete({ where: { userId: existing.id } });
  await db.user.update({
    where: { id: existing.id },
    data: { disabledAt: new Date() },
  });
  await call('get', '/trips/feed', active.token).expect(403);
}, 15000);
