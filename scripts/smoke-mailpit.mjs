import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { setTimeout as wait } from 'node:timers/promises';
import { isDeepStrictEqual } from 'node:util';

const productionDatabase = new URL(process.env.DATABASE_URL);
const testDatabase = new URL(process.env.TEST_DATABASE_URL);
const databaseName = decodeURIComponent(testDatabase.pathname.slice(1));
assert(
  ['postgres:', 'postgresql:'].includes(testDatabase.protocol) &&
    testDatabase.hostname === '127.0.0.1' &&
    /^[a-z][a-z0-9_]*_test$/.test(databaseName) &&
    databaseName !== decodeURIComponent(productionDatabase.pathname.slice(1)),
  'SMTP smoke requiere una base PostgreSQL de prueba local distinta a desarrollo',
);

const mailbox = 'http://127.0.0.1:8025';
const frontend = 'http://127.0.0.1:8081';
const email = `ruteam-prueba+${randomBytes(8).toString('hex')}@usc.edu.co`;
const initialPassword = randomBytes(24).toString('hex');
const verifiedPassword = randomBytes(24).toString('hex');
const recoveredPassword = randomBytes(24).toString('hex');

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: testDatabase.toString(),
  CORS_ORIGINS: frontend,
  DEMO_MODE: 'false',
  VERIFICATION_PROVIDER: 'official',
  AUTH_TOKEN_SECRET: randomBytes(32).toString('hex'),
  AUTH_PUBLIC_URL: frontend,
  SMTP_HOST: '127.0.0.1',
  SMTP_PORT: '1025',
  SMTP_SECURE: 'false',
  MAIL_FROM: 'pruebas@ruteam.invalid',
});
delete process.env.SMTP_USER;
delete process.env.SMTP_PASSWORD;

async function mailboxRequest(path) {
  return fetch(new URL(path, mailbox), {
    redirect: 'error',
    signal: AbortSignal.timeout(3000),
  });
}

async function readMailToken(page) {
  const path = `/view/latest.txt?query=${encodeURIComponent(`to:${email}`)}`;
  for (let attempt = 0; attempt < 40; attempt++) {
    const response = await mailboxRequest(path);
    if (response.ok) {
      const message = await response.text();
      const link = message
        .split(/\r?\n/)
        .find((line) => line.startsWith(`${frontend}${page}?`));
      if (link) {
        const token = new URL(link).searchParams.get('token');
        assert(
          token && /^[A-Za-z0-9_-]{43}$/.test(token),
          'El mensaje capturado debe contener un enlace de un solo uso',
        );
        return token;
      }
    } else {
      assert.equal(response.status, 404, 'Inesperado al leer buzón local');
    }
    await wait(150);
  }
  throw new Error('No llegó el enlace esperado al buzón SMTP local');
}

assert(
  (await mailboxRequest('/readyz')).ok,
  'Mailpit local no está disponible',
);
const { createApp } = await import('../backend/dist/src/bootstrap.js');
const { PrismaService } =
  await import('../backend/dist/src/infrastructure/prisma/prisma.service.js');
const app = await createApp();
const database = app.get(PrismaService);
let createdUserId;
let mayHaveRegistered = false;
try {
  await app.listen(0, '127.0.0.1');
  const api = `${await app.getUrl()}/api/v1`;
  async function request(path, status, { body, token } = {}) {
    const headers = {
      'Content-Type': 'application/json',
      'x-ruteam-client': 'native',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
    const response = await fetch(`${api}${path}`, {
      method: body ? 'POST' : 'GET',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(5000),
      redirect: 'error',
    });
    assert.equal(response.status, status, path);
    return response.json();
  }

  const login = (password, status = 200) =>
    request('/auth/login', status, { body: { email, password } });
  const access = await request('/auth/access', 200);
  assert.equal(access.accountEmailAvailable, true, 'Transporte configurable');
  assert(
    !(await database.user.findUnique({
      where: { email },
      select: { id: true },
    })),
    'El alias aleatorio de prueba ya existe',
  );
  mayHaveRegistered = true;
  const registration = {
    name: 'Estudiante de prueba local',
    email,
    password: initialPassword,
    usagePreference: 'PASSENGER',
  };
  const acknowledgement = await request('/auth/register', 202, {
    body: registration,
  });
  assert.equal(acknowledgement.emailDeliveryAvailable, true);
  assert(!('token' in acknowledgement), 'Registro debe omitir el enlace');
  assert(
    isDeepStrictEqual(
      await request('/auth/register', 202, { body: registration }),
      acknowledgement,
    ),
    'El registro duplicado debe devolver la misma confirmación genérica',
  );
  const registered = await database.user.findUnique({ where: { email } });
  assert(registered?.id, 'Registro debe persistir una cuenta de prueba');
  createdUserId = registered.id;
  const pending = await login(initialPassword);
  assert.equal(pending.account.emailVerified, false);

  const verificationToken = await readMailToken('/verify-email');
  const verification = { token: verificationToken, password: verifiedPassword };
  await request('/auth/email/confirm', 200, { body: verification });
  await request('/auth/email/confirm', 400, { body: verification });
  await request('/auth/account', 401, { token: pending.token });
  await login(initialPassword, 401);
  const verified = await login(verifiedPassword);
  assert.equal(verified.account.emailVerified, true);
  assert.equal(verified.account.eligibility.status, 'PENDING_VERIFICATION');
  await request('/trips/feed', 403, { token: verified.token });

  const resetRequest = await request('/auth/password/request', 202, {
    body: { email },
  });
  const unrelated = `ruteam-prueba+${randomBytes(8).toString('hex')}@usc.edu.co`;
  assert.deepEqual(
    await request('/auth/password/request', 202, {
      body: { email: unrelated },
    }),
    resetRequest,
  );
  assert(!('token' in resetRequest), 'Recuperación debe omitir el enlace');
  const resetToken = await readMailToken('/recover-access');
  const reset = { token: resetToken, password: recoveredPassword };
  await request('/auth/password/reset', 200, { body: reset });
  await request('/auth/password/reset', 400, { body: reset });
  await request('/auth/account', 401, { token: verified.token });
  await login(verifiedPassword, 401);
  assert.equal((await login(recoveredPassword)).account.emailVerified, true);
  console.log(
    'SMTP local aprobado: registro, confirmación, elegibilidad separada, recuperación, uso único y revocación.',
  );
} finally {
  try {
    if (createdUserId || mayHaveRegistered) {
      await database.user.deleteMany({
        where: { email, ...(createdUserId && { id: createdUserId }) },
      });
    }
  } finally {
    await app.close();
  }
}
