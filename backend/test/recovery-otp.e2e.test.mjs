import { createHmac, randomInt, randomUUID } from 'node:crypto';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  expect,
  jest,
  test,
} from '@jest/globals';
import request from 'supertest';

const prefix = 'otp-' + randomUUID().slice(0, 8);
const password = randomUUID();
const replacement = randomUUID();
const root = '/auth/recovery';
const channels = { email: 'EMAIL', phone: 'PHONE' };
let app, db, log, ConsoleTransport, createApp, PrismaService;

function call(method, path, session) {
  const agent = request(app.getHttpServer());
  const req = agent[method]('/api/v1' + path).set('x-ruteam-client', 'native');
  return session ? req.auth(session, { type: 'bearer' }) : req;
}

function codeFromConsole() {
  const entry = log.mock.calls.at(-1)?.[0];
  const code = entry?.match(/Código: (\d{6})/u)?.[1];
  if (!code) throw new Error('La consola no recibió un OTP');
  return code;
}

function wrongCode(code) {
  return code === '123456' ? '654321' : '123456';
}

const login = (email, credential = password) =>
  call('post', '/auth/login').send({ email, password: credential });

function register(email, recoveryContact) {
  return call('post', '/auth/register').send({
    email,
    name: 'Prueba de recuperación',
    password,
    usagePreference: 'PASSENGER',
    recoveryContact,
  });
}
const issueReset = (email) =>
  call('post', root + '/request')
    .send({ email })
    .expect(200);
const verify = (email, code) =>
  call('post', root + '/verify').send({ email, code });
const confirm = (token, code) =>
  call('post', root + '/contact/confirm', token).send({ code });
const configure = (token, currentPassword, channel, contact) =>
  call('put', root + '/contact', token).send({
    password: currentPassword,
    channel,
    contact,
  });

// Keep this suite deterministic without sleeping through expiry and resend windows.
async function ageIssues(userId, millis) {
  await db.recoveryOtp.updateMany({
    where: { userId },
    data: { createdAt: new Date(Date.now() - millis) },
  });
}

beforeAll(async () => {
  const testURL = process.env.TEST_DATABASE_URL;
  if (
    !testURL ||
    testURL === process.env.DATABASE_URL ||
    !new URL(testURL).pathname.endsWith('_test')
  )
    throw new Error('La recuperación requiere PostgreSQL de pruebas aislado');
  process.env.DATABASE_URL = testURL;
  process.env.NODE_ENV = 'development';
  process.env.INSTITUTIONAL_ACCESS_MODE = 'DECLARED_DOMAIN';
  process.env.RECOVERY_OTP_TRANSPORT = 'console';
  process.env.RECOVERY_OTP_SECRET = randomUUID();
  process.env.DEMO_MODE = 'false';
  process.env.VERIFICATION_PROVIDER = 'official';
  log = jest.spyOn(console, 'info').mockImplementation(() => {});
  ({ createApp } = await import('../dist/src/bootstrap.js'));
  ({ PrismaService } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js'));
  ({ ConsoleRecoveryOtpTransport: ConsoleTransport } =
    await import('../dist/src/modules/auth/infrastructure/recovery-otp.transport.js'));
}, 15000);

beforeEach(async () => {
  log.mockClear();
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
}, 15000);

afterEach(async () => {
  try {
    await db?.user.deleteMany({ where: { email: { startsWith: prefix } } });
  } finally {
    await app?.close();
  }
});

afterAll(() => log?.mockRestore());

test('registro requiere contacto válido y permite acceder con el medio pendiente', async () => {
  const email = prefix + '-validation@usc.edu.co';
  await register(email).expect(400);
  await register(email, {
    channel: channels.email,
    contact: email.toUpperCase(),
  }).expect(400);
  await register(email, {
    channel: channels.email,
    contact: 'incompleto@',
  }).expect(400);
  await register(email, {
    channel: channels.phone,
    contact: '300 000 0000',
  }).expect(400);
  const registered = await register(email, {
    channel: channels.email,
    contact: '  PERSONAL@EXAMPLE.TEST ',
  }).expect(202);
  const code = codeFromConsole();
  expect(JSON.stringify(registered.body)).not.toContain(code);
  const { body } = await login(email).expect(200);
  expect(body.account.emailVerified).toBe(false);
  const status = await call('get', root + '/contact', body.token).expect(200);
  expect(status.body).toMatchObject({
    confirmed: null,
    pending: { masked: 'p***@example.test' },
  });
  expect(
    await db.recoveryContact.findFirst({ where: { userId: body.account.id } }),
  ).toMatchObject({ contact: 'personal@example.test', pending: true });
  const stored = await db.recoveryOtp.findFirst({
    where: { userId: body.account.id },
  });
  expect(stored.digest).toHaveLength(64);
  expect(stored.digest).not.toBe(code);
  const count = log.mock.calls.length;
  const ineligible = await issueReset(email);
  const unknown = await issueReset(prefix + '-unknown@usc.edu.co');
  expect(ineligible.body).toEqual(unknown.body);
  const diagnostics = log.mock.calls.slice(count).map(([entry]) => entry);
  expect(diagnostics).toHaveLength(2);
  expect(diagnostics.every((entry) => !entry.includes('Código:'))).toBe(true);
  expect(diagnostics[0]).toContain('CONTACT_NOT_CONFIRMED');
  expect(diagnostics[1]).toContain('ACCOUNT_NOT_FOUND');
  await verify(email, code).expect(400);
  await confirm(body.token, wrongCode(code)).expect(400);
  await confirm(body.token, code).expect(200);
  await confirm(body.token, code).expect(400);
});

test('verifica límites de emisión, reenvío, expiración y cinco intentos', async () => {
  const email = prefix + '-limits@usc.edu.co';
  const phone = '+1 (202) 555-0123';
  await register(email, { channel: channels.phone, contact: phone }).expect(
    202,
  );
  const initial = codeFromConsole();
  const {
    body: { token, account },
  } = await login(email).expect(200);
  expect(
    await db.recoveryContact.findFirst({ where: { userId: account.id } }),
  ).toMatchObject({ contact: '+12025550123' });
  const resend = () => call('post', root + '/contact/request', token);
  await resend().expect(429);
  await ageIssues(account.id, 61_000);
  await resend().expect(200);
  expect(
    await db.recoveryOtp.count({
      where: { userId: account.id, consumedAt: { not: null } },
    }),
  ).toBe(1);
  const current = codeFromConsole();
  expect(current).not.toBe(initial);
  await confirm(token, initial).expect(400);
  for (let i = 1; i < 5; i++) {
    const result = await confirm(token, wrongCode(current)).expect(400);
    if (i === 4) expect(result.body.code).toBe('OTP_ATTEMPTS_EXHAUSTED');
  }
  await confirm(token, current).expect(400);
  await ageIssues(account.id, 61_000);
  await resend().expect(200);
  const expired = codeFromConsole();
  await db.recoveryOtp.updateMany({
    where: { userId: account.id, consumedAt: null },
    data: { expiresAt: new Date(0) },
  });
  expect((await confirm(token, expired).expect(400)).body.code).toBe(
    'OTP_EXPIRED',
  );
  for (let i = 0; i < 2; i++) {
    await ageIssues(account.id, 61_000);
    await resend().expect(200);
  }
  await ageIssues(account.id, 61_000);
  const limited = await resend().expect(429);
  expect(limited.body.code).toBe('OTP_EMISSION_LIMIT');
  const other = prefix + '-shared-phone@usc.edu.co';
  const count = log.mock.calls.length;
  await register(other, { channel: channels.phone, contact: phone }).expect(
    202,
  );
  expect(log.mock.calls).toHaveLength(count);
});

test('restablece una sola vez y revoca todas las sesiones previas', async () => {
  const email = prefix + '-reset@usc.edu.co';
  await register(email, {
    channel: channels.email,
    contact: prefix + '@example.test',
  }).expect(202);
  const confirmation = codeFromConsole();
  const {
    body: { token },
  } = await login(email).expect(200);
  const second = (await login(email).expect(200)).body.token;
  await confirm(token, confirmation).expect(200);
  await issueReset(email);
  const code = codeFromConsole();
  await verify(email, confirmation).expect(400);
  const validations = await Promise.all([
    verify(email, code),
    verify(email, code),
  ]);
  expect(validations.map((response) => response.status).sort()).toEqual([
    200, 400,
  ]);
  const grant = validations.find((response) => response.status === 200).body
    .token;
  expect(grant).toHaveLength(43);
  const reset = () =>
    call('post', root + '/reset').send({ token: grant, password: replacement });
  const resets = await Promise.all([reset(), reset()]);
  expect(resets.map((response) => response.status).sort()).toEqual([200, 400]);
  await call('get', root + '/contact', token).expect(401);
  await call('get', root + '/contact', second).expect(401);
  await login(email, replacement).expect(200);
  await login(email).expect(401);
});

test('cambiar medio requiere contraseña y reemplaza e invalida sólo al confirmar', async () => {
  const email = prefix + '-change@usc.edu.co';
  await register(email, {
    channel: channels.email,
    contact: prefix + '-change@example.test',
  }).expect(202);
  const first = codeFromConsole();
  const {
    body: { token, account },
  } = await login(email).expect(200);
  await confirm(token, first).expect(200);
  await issueReset(email);
  const code = codeFromConsole();
  const { body: grant } = await verify(email, code).expect(200);
  await configure(
    token,
    replacement,
    channels.phone,
    '+57 300 000 0000',
  ).expect(403);
  const staged = await configure(
    token,
    password,
    channels.phone,
    '+57 300 000 0000',
  ).expect(200);
  expect(staged.body.confirmed.channel).toBe('EMAIL');
  expect(staged.body.pending).toEqual({ channel: 'PHONE', masked: '••••0000' });
  await ageIssues(account.id, 61_000);
  await call('post', root + '/contact/request', token).expect(200);
  const second = codeFromConsole();
  const accepted = await confirm(token, second).expect(200);
  expect(accepted.body.confirmed).toMatchObject({
    channel: 'PHONE',
    transport: 'CONSOLE',
  });
  expect(accepted.body.pending).toBeNull();
  await call('post', root + '/reset')
    .send({ token: grant.token, password: replacement })
    .expect(400);
});

test('el transporte nunca imprime en producción ni en modo OFFICIAL', () => {
  const before = log.mock.calls.length;
  for (const env of [
    { NODE_ENV: 'production', INSTITUTIONAL_ACCESS_MODE: 'DECLARED_DOMAIN' },
    { NODE_ENV: 'development', INSTITUTIONAL_ACCESS_MODE: 'OFFICIAL' },
  ]) {
    const transport = new ConsoleTransport({
      ...env,
      RECOVERY_OTP_SECRET: randomUUID(),
      RECOVERY_OTP_TRANSPORT: 'console',
    });
    expect(transport.available).toBe(false);
    transport.deliver(
      'PASSWORD_RESET',
      'EMAIL',
      'private@example.test',
      '000000',
    );
  }
  expect(log.mock.calls).toHaveLength(before);
});

test.each([
  {
    channel: 'PHONE',
    contact: '+57 (300) 555-0191',
    equivalent: '+573005550191',
  },
  {
    channel: 'EMAIL',
    contact: '  OTP-SAVE@EXAMPLE.TEST ',
    equivalent: 'otp-save@example.test',
  },
])(
  'guardar de nuevo el mismo $channel conserva su OTP y permite recuperar tras reenviar',
  async ({ channel, contact, equivalent }) => {
    const email = prefix + '-save@usc.edu.co';
    await register(email, { channel, contact }).expect(202);
    const initial = codeFromConsole();
    const {
      body: { token, account },
    } = await login(email).expect(200);
    const staged = await configure(token, password, channel, equivalent).expect(
      200,
    );
    const resend = () => call('post', root + '/contact/request', token);
    const early = await resend().expect(429);
    expect(log.mock.calls).toHaveLength(1);
    const stored = await db.recoveryOtp.findFirstOrThrow({
      where: { userId: account.id },
    });
    const firstConfirmation = await confirm(token, initial);
    expect({
      active: stored.consumedAt === null,
      clock: Boolean(staged.body.confirmationTiming),
      confirmation: firstConfirmation.status,
      earlyCode: early.body.code,
    }).toEqual({
      active: true,
      clock: true,
      confirmation: 200,
      earlyCode: 'OTP_RESEND_COOLDOWN',
    });

    const nextContact =
      channel === 'PHONE' ? '+57 300 555 0192' : 'otp-next@example.test';
    const changed = await configure(
      token,
      password,
      channel,
      nextContact,
    ).expect(200);
    expect(changed.body.confirmationTiming.expiresAt).toBeNull();
    expect(
      Date.parse(changed.body.confirmationTiming.resendAt),
    ).toBeGreaterThan(Date.parse(changed.body.confirmationTiming.serverTime));
    expect((await confirm(token, initial).expect(400)).body.code).toBe(
      'OTP_UNAVAILABLE',
    );
    await ageIssues(account.id, 61_000);
    await resend().expect(200);
    const previous = codeFromConsole();
    await ageIssues(account.id, 61_000);
    await resend().expect(200);
    const next = codeFromConsole();
    expect(next === previous).toBe(false);
    expect(log.mock.calls).toHaveLength(3);
    await confirm(token, previous).expect(400);
    await confirm(token, next).expect(200);
    await confirm(token, next).expect(400);

    await issueReset(email);
    expect(log.mock.calls).toHaveLength(4);
    const { body: grant } = await verify(email, codeFromConsole()).expect(200);
    await call('post', root + '/reset')
      .send({ token: grant.token, password: replacement })
      .expect(200);
    await call('get', root + '/contact', token).expect(401);
    await login(email).expect(401);
    await login(email, replacement).expect(200);
  },
);

test('valida un OTP de seis caracteres con cero inicial', async () => {
  const email = prefix + '-leading-zero@usc.edu.co';
  await register(email, {
    channel: 'PHONE',
    contact: '+57 300 555 0193',
  }).expect(202);
  const {
    body: { token, account },
  } = await login(email).expect(200);
  const otp = await db.recoveryOtp.findFirstOrThrow({
    where: { userId: account.id },
  });
  const code = '0' + String(randomInt(10000, 100000));
  const digest = createHmac('sha256', process.env.RECOVERY_OTP_SECRET)
    .update(
      JSON.stringify(['otp', otp.id, account.id, 'CONTACT_CONFIRMATION', code]),
    )
    .digest('hex');
  await db.recoveryOtp.update({ where: { id: otp.id }, data: { digest } });
  await confirm(token, Number(code)).expect(400);
  expect(
    (await db.recoveryOtp.findUniqueOrThrow({ where: { id: otp.id } }))
      .attempts,
  ).toBe(0);
  await confirm(token, code).expect(200);
});

test('cuenta académica anterior sin contacto retoma la confirmación y recupera acceso', async () => {
  const email = prefix + '-legacy@usc.edu.co';
  const { hashPassword } =
    await import('../dist/src/modules/auth/domain/password.js');
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      profile: { create: { displayName: 'Cuenta anterior OTP' } },
    },
  });
  const {
    body: { token },
  } = await login(email).expect(200);
  const noContact = await issueReset(email);
  expect(log.mock.calls.at(-1)?.[0]).toContain('CONTACT_NOT_FOUND');
  await configure(token, password, 'PHONE', '+57 300 555 0194').expect(200);
  const pending = await issueReset(email);
  expect(pending.body).toEqual(noContact.body);
  expect(log.mock.calls.at(-1)?.[0]).toContain('CONTACT_NOT_CONFIRMED');
  await call('post', root + '/contact/request', token).expect(200);
  await confirm(token, codeFromConsole()).expect(200);
  await call('post', '/auth/logout', token).expect(204);
  expect(
    await db.recoveryContact.count({
      where: {
        userId: user.id,
        pending: false,
        transport: 'CONSOLE',
        confirmedAt: { not: null },
      },
    }),
  ).toBe(1);
  const issued = await issueReset(email.toUpperCase());
  expect(issued.body).toEqual(noContact.body);
  expect(log.mock.calls.at(-1)?.[0]).toContain('Resultado: ISSUED');
  const code = codeFromConsole();
  await issueReset(email);
  expect(log.mock.calls.at(-1)?.[0]).toContain('Motivo: COOLDOWN');
  const { body: grant } = await verify(email, code).expect(200);
  await call('post', root + '/reset')
    .send({ token: grant.token, password: replacement })
    .expect(200);
  await login(email, replacement).expect(200);
});
