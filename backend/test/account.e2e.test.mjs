import { afterAll, beforeAll, expect, test } from '@jest/globals';
import { randomBytes } from 'node:crypto';
import request from 'supertest';
import { verifyPassword } from '../dist/src/modules/auth/domain/password.js';
let app, db, mail, userId, pendingToken, confirmedToken, emailToken, resetToken;
const outbox = [];
const address = `account-${randomBytes(8).toString('hex')}@usc.edu.co`;
const unknown = `missing-${randomBytes(8).toString('hex')}@usc.edu.co`;
const initialPassword = 'Clave inicial propia 2026';
const confirmedPassword = 'Clave elegida por dueno 2026';
const resetPassword = 'Nueva clave privada 2026';
const native = { 'x-ruteam-client': 'native' };
const originalEnv = Object.fromEntries(
  ['DATABASE_URL', 'AUTH_TOKEN_SECRET', 'AUTH_PUBLIC_URL'].map((key) => [
    key,
    process.env[key],
  ]),
);
const call = (method, path, token) => {
  const server = request(app.getHttpServer());
  const agent = server[method](`/api/v1/auth${path}`).set(native);
  return token ? agent.auth(token, { type: 'bearer' }) : agent;
};
const registration = (email = address) => ({
  email,
  name: 'Estudiante de prueba',
  password: initialPassword,
  usagePreference: 'PASSENGER',
});
const linkToken = (fragment) => {
  const email = [...outbox]
    .reverse()
    .find((message) => message.body.includes(fragment));
  const match = email?.body.match(/https?:\/\/\S+/);
  return match ? new URL(match[0]).searchParams.get('token') : null;
};
beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    process.env.TEST_DATABASE_URL === process.env.DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Cuenta HTTP exige PostgreSQL de pruebas aislado');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.AUTH_TOKEN_SECRET = randomBytes(32).toString('hex');
  process.env.AUTH_PUBLIC_URL = 'http://localhost:8082';
  const { createApp } = await import('../dist/src/bootstrap.js');
  const { PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js');
  const { EmailDelivery } =
    await import('../dist/src/modules/auth/infrastructure/email-delivery.js');
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  mail = app.get(EmailDelivery);
  // In-process test transport; no test endpoint, file capture or external email.
  mail.isReady = () => false;
  mail.send = async (to, subject, body) => {
    outbox.push({ to, subject, body });
  };
});
afterAll(async () => {
  if (db)
    await db.user.deleteMany({ where: { email: { in: [address, unknown] } } });
  await app?.close();
  for (const [key, value] of Object.entries(originalEnv)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});
test('registro normal persiste sin SMTP, no acredita matrícula y no enumera duplicados', async () => {
  const first = await call('post', '/register')
    .send(registration(`  ${address.toUpperCase()} `))
    .expect(202);
  const duplicate = await call('post', '/register')
    .send(registration())
    .expect(202);
  expect(duplicate.body).toEqual(first.body);
  expect(first.body.emailDeliveryAvailable).toBe(false);
  expect(first.body).not.toHaveProperty('token');
  const user = await db.user.findUniqueOrThrow({
    where: { email: address },
    include: { membership: true },
  });
  userId = user.id;
  expect(user.passwordHash).toMatch(/^scrypt\$32768\$8\$3\$/);
  expect(user.passwordHash).not.toContain(initialPassword);
  expect(user.demoIdentity).toBeNull();
  expect(user.emailVerifiedAt).toBeNull();
  expect(user.membership).toBeNull();
  expect(await db.user.count({ where: { email: address } })).toBe(1);
});
test('contraseña autentica cuenta pendiente pero no habilita producto o conducción', async () => {
  const login = await call('post', '/login')
    .send({ email: address, password: initialPassword })
    .expect(200);
  pendingToken = login.body.token;
  expect(login.body.account).toMatchObject({
    emailVerified: false,
    eligibility: { status: 'PENDING_VERIFICATION' },
    capabilities: { passenger: false, driver: false, driverAccess: false },
    onboarding: { step: 0, completed: false },
  });
  expect(login.body.account).not.toHaveProperty('passwordHash');
  await call('get', '/account', pendingToken).expect(200);
  await call('get', '/me', pendingToken).expect(403);
  await request(app.getHttpServer())
    .get('/api/v1/trips/my')
    .set(native)
    .auth(pendingToken, { type: 'bearer' })
    .expect(403);
  const absent = await call('post', '/login')
    .send({ email: unknown, password: initialPassword })
    .expect(401);
  const wrong = await call('post', '/login')
    .send({ email: address, password: 'Contraseña incorrecta 2026' })
    .expect(401);
  expect(absent.body).toEqual(wrong.body);
});
test('verificación pendiente informa correo indisponible y no fabrica entrega', async () => {
  const access = await call('get', '/access').expect(200);
  expect(access.body.accountEmailAvailable).toBe(false);
  await call('post', '/email/request').send({ email: address }).expect(503);
  expect(outbox).toHaveLength(0);
});
test('emisión persistente separa propósitos y limita reenvíos por cuenta entre peticiones', async () => {
  mail.isReady = () => true;
  const existing = await call('post', '/email/request')
    .send({ email: address })
    .expect(202);
  emailToken = linkToken('/verify-email');
  expect(emailToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const row = await db.accountToken.findFirstOrThrow({
    where: { userId, purpose: 'EMAIL_CONFIRMATION' },
  });
  expect(row.tokenHash).not.toBe(emailToken);
  const missing = await call('post', '/email/request')
    .send({ email: unknown })
    .expect(202);
  expect(existing.body).toEqual(missing.body);
  expect(outbox).toHaveLength(1);
  await call('post', '/email/request').send({ email: address }).expect(202);
  expect(
    await db.accountToken.count({
      where: { userId, purpose: 'EMAIL_CONFIRMATION' },
    }),
  ).toBe(1);
  expect(outbox).toHaveLength(1);
  await call('post', '/password/reset')
    .send({ token: emailToken, password: confirmedPassword })
    .expect(400);
});
test('confirmar establece contraseña del dueño del correo una vez y revoca acceso anterior', async () => {
  const results = await Promise.all([
    call('post', '/email/confirm').send({
      token: emailToken,
      password: confirmedPassword,
    }),
    call('post', '/email/confirm').send({
      token: emailToken,
      password: confirmedPassword,
    }),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
  await call('get', '/account', pendingToken).expect(401);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  expect(user.emailVerifiedAt).toBeInstanceOf(Date);
  expect(await verifyPassword(initialPassword, user.passwordHash)).toBe(false);
  expect(await verifyPassword(confirmedPassword, user.passwordHash)).toBe(true);
  const login = await call('post', '/login')
    .send({ email: address, password: confirmedPassword })
    .expect(200);
  confirmedToken = login.body.token;
  expect(login.body.account).toMatchObject({
    emailVerified: true,
    eligibility: { status: 'PENDING_VERIFICATION' },
    capabilities: { passenger: false },
  });
});
test('onboarding persiste, se retoma y preferencia de conducir no otorga autoridad', async () => {
  await call('patch', '/onboarding', confirmedToken)
    .send({ step: 4, complete: true })
    .expect(400);
  await call('patch', '/onboarding', confirmedToken)
    .send({ step: 1 })
    .expect(200);
  await call('patch', '/onboarding', confirmedToken)
    .send({ step: 2, usagePreference: 'DRIVER_AND_PASSENGER' })
    .expect(200);
  const next = await call('patch', '/onboarding', confirmedToken)
    .send({ step: 3 })
    .expect(200);
  expect(next.body).toMatchObject({
    usagePreference: 'DRIVER_AND_PASSENGER',
    capabilities: { driver: false, driverAccess: false },
    onboarding: { step: 3, completed: false },
  });
  await call('patch', '/onboarding', confirmedToken)
    .send({ step: 4, complete: true })
    .expect(403);
  const resumed = await call('get', '/account', confirmedToken).expect(200);
  expect(resumed.body.onboarding.step).toBe(3);
  await call('patch', '/onboarding', confirmedToken)
    .send({ step: 4, capabilities: { driver: true } })
    .expect(400);
});
test('recuperación por correo es de uso único y revoca todas las sesiones', async () => {
  await call('post', '/password/request').send({ email: address }).expect(202);
  resetToken = linkToken('/recover-access');
  expect(resetToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
  const results = await Promise.all([
    call('post', '/password/reset').send({
      token: resetToken,
      password: resetPassword,
    }),
    call('post', '/password/reset').send({
      token: resetToken,
      password: resetPassword,
    }),
  ]);
  expect(results.map((result) => result.status).sort()).toEqual([200, 400]);
  await call('get', '/account', confirmedToken).expect(401);
  await call('post', '/login')
    .send({ email: address, password: resetPassword })
    .expect(200);
  expect(
    await db.authSession.count({ where: { userId, revokedAt: null } }),
  ).toBe(1);
});
test('enlace vencido se rechaza sin cambiar contraseña ni revivir sesión', async () => {
  await db.accountToken.updateMany({
    where: { userId, purpose: 'PASSWORD_RESET' },
    data: { createdAt: new Date(Date.now() - 120000) },
  });
  await call('post', '/password/request').send({ email: address }).expect(202);
  const expired = linkToken('/recover-access');
  await db.accountToken.updateMany({
    where: { userId, purpose: 'PASSWORD_RESET', consumedAt: null },
    data: { expiresAt: new Date(0) },
  });
  await call('post', '/password/reset')
    .send({ token: expired, password: confirmedPassword })
    .expect(400);
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  expect(await verifyPassword(resetPassword, user.passwordHash)).toBe(true);
});
