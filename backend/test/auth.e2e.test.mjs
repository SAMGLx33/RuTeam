import { afterAll, beforeAll, describe, expect, test } from '@jest/globals';
import request from 'supertest';

let app, db, createApp;
const header = { 'x-ruteam-client': 'native' };
const tokenFor = async (identity) => {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/demo/login')
    .set(header)
    .send({ identity })
    .expect(201);
  return res.body.token;
};
beforeAll(async () => {
  if (
    !process.env.TEST_DATABASE_URL ||
    process.env.TEST_DATABASE_URL === process.env.DATABASE_URL ||
    !new URL(process.env.TEST_DATABASE_URL).pathname.endsWith('_test')
  )
    throw new Error('Se requiere TEST_DATABASE_URL aislada con sufijo _test');
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
  process.env.SESSION_TTL_SECONDS = '3600';
  ({ createApp } = await import('../dist/src/bootstrap.js'));
  ({ PrismaService: db } =
    await import('../dist/src/infrastructure/prisma/prisma.service.js'));
  app = await createApp();
  await app.init();
  db = app.get(db);
});
afterAll(async () => {
  await app?.close();
});

describe('API y PostgreSQL reales', () => {
  test('health comprueba PostgreSQL', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);
    expect(res.body).toMatchObject({
      status: 'ok',
      database: 'up',
      demo: true,
    });
  });
  test.each(['ana', 'diego', 'admin'])(
    'login activo %s, perfil y logout revocable',
    async (identity) => {
      const token = await tokenFor(identity);
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(200);
      expect(res.body.membership.status).toBe('ACTIVE');
      expect(res.body.demo).toBe(true);
      expect(res.body).not.toHaveProperty('sessions');
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set(header)
        .auth(token, { type: 'bearer' })
        .expect(204);
      await request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    },
  );
  test('inactivo no crea sesión y deja intento auditable', async () => {
    const before = await db.authSession.count();
    await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set(header)
      .send({ identity: 'laura' })
      .expect(403);
    expect(await db.authSession.count()).toBe(before);
    expect(
      await db.verificationAttempt.count({ where: { outcome: 'DENIED' } }),
    ).toBeGreaterThan(0);
  });
  test('rechaza identidad desconocida y campos extra', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set(header)
      .send({ identity: 'unknown', role: 'ADMIN' })
      .expect(400);
  });
  test('sesión ausente o malformada', async () => {
    await request(app.getHttpServer()).get('/api/v1/me').expect(401);
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .auth('fake', { type: 'bearer' })
      .expect(401);
  });
  test('consulta afiliación vigente en cada petición y deniega baja posterior', async () => {
    const token = await tokenFor('ana');
    const user = await db.user.findUniqueOrThrow({
      where: { demoIdentity: 'ana' },
    });
    await db.institutionalMembership.update({
      where: { userId: user.id },
      data: { status: 'INACTIVE' },
    });
    try {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .expect(403);
    } finally {
      await db.institutionalMembership.update({
        where: { userId: user.id },
        data: { status: 'ACTIVE' },
      });
    }
  });
  test('usuario dado de baja puede revocar sesión sin acceder al perfil', async () => {
    const token = await tokenFor('ana');
    const user = await db.user.findUniqueOrThrow({
      where: { demoIdentity: 'ana' },
    });
    await db.institutionalMembership.update({
      where: { userId: user.id },
      data: { status: 'INACTIVE' },
    });
    try {
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set(header)
        .auth(token, { type: 'bearer' })
        .expect(204);
      await request(app.getHttpServer())
        .get('/api/v1/me')
        .auth(token, { type: 'bearer' })
        .expect(401);
    } finally {
      await db.institutionalMembership.update({
        where: { userId: user.id },
        data: { status: 'ACTIVE' },
      });
    }
  });
  test('expiración y almacenamiento únicamente del hash', async () => {
    const token = await tokenFor('ana');
    const { createHash } = await import('node:crypto');
    const tokenHash = createHash('sha256').update(token).digest('hex');
    const session = await db.authSession.findUniqueOrThrow({
      where: { tokenHash },
    });
    expect(JSON.stringify(session)).not.toContain(token);
    await db.authSession.update({
      where: { id: session.id },
      data: { expiresAt: new Date(0) },
    });
    await request(app.getHttpServer())
      .get('/api/v1/me')
      .auth(token, { type: 'bearer' })
      .expect(401);
  });
  test('perfil persiste y no permite escalar rol', async () => {
    const token = await tokenFor('ana');
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(header)
      .auth(token, { type: 'bearer' })
      .send({ displayName: 'Ana Prueba' })
      .expect(200);
    const res = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(res.body.profile.displayName).toBe('Ana Prueba');
    expect(
      (
        await db.user.findUniqueOrThrow({
          where: { demoIdentity: 'ana' },
          include: { profile: true },
        })
      ).profile.displayName,
    ).toBe('Ana Prueba');
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(header)
      .auth(token, { type: 'bearer' })
      .send({ displayName: 'Admin', role: 'ADMIN' })
      .expect(400);
    await request(app.getHttpServer())
      .patch('/api/v1/me/profile')
      .set(header)
      .auth(token, { type: 'bearer' })
      .send({ displayName: '  ' })
      .expect(400);
  });
  test('web recibe cookie HttpOnly y no token JSON', async () => {
    const agent = request.agent(app.getHttpServer());
    const res = await agent
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'web')
      .set('Origin', 'http://localhost:8081')
      .send({ identity: 'diego' })
      .expect(201);
    expect(res.body).not.toHaveProperty('token');
    expect(res.headers['set-cookie'][0]).toContain('HttpOnly');
    expect(res.headers['set-cookie'][0]).toContain('SameSite=Strict');
    await agent.get('/api/v1/auth/me').expect(200);
    await agent
      .post('/api/v1/auth/logout')
      .set('x-ruteam-client', 'web')
      .set('Origin', 'http://localhost:8081')
      .expect(204);
    await agent.get('/api/v1/auth/me').expect(401);
  });
  test('CSRF: sin cabecera u origen ajeno no muta', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .send({ identity: 'ana' })
      .expect(403);
    await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set(header)
      .set('Origin', 'https://untrusted.invalid')
      .send({ identity: 'ana' })
      .expect(403);
  });
  test('catálogo USC protegido y de muestra', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/campus/destinations')
      .expect(401);
    const token = await tokenFor('diego');
    const res = await request(app.getHttpServer())
      .get('/api/v1/campus/destinations')
      .auth(token, { type: 'bearer' })
      .expect(200);
    expect(res.body.length).toBeGreaterThan(0);
    expect(
      res.body.every(
        (point) => point.demo && point.active && point.campus === 'USC',
      ),
    ).toBe(true);
  });
  test('rutas futuras no devuelven éxito ficticio', async () => {
    await request(app.getHttpServer()).get('/api/v1/trips').expect(404);
  });
  test('modo demo deshabilitado oculta login', async () => {
    process.env.DEMO_MODE = 'false';
    let disabled;
    try {
      disabled = await createApp();
      await disabled.init();
      await request(disabled.getHttpServer())
        .post('/api/v1/auth/demo/login')
        .set(header)
        .send({ identity: 'ana' })
        .expect(404);
    } finally {
      await disabled?.close();
      process.env.DEMO_MODE = 'true';
    }
  });
});

test.each([
  { latitude: '91', longitude: '0', campus: 'USC' },
  { latitude: '0', longitude: '181', campus: 'USC' },
  { latitude: '0', longitude: '0', campus: 'EXTERNAL' },
])('PostgreSQL rechaza catálogo inválido %j', async (point) => {
  const { randomUUID } = await import('node:crypto');
  await expect(
    db.campusDestination.create({
      data: { code: randomUUID(), name: 'Inválido sintético', ...point },
    }),
  ).rejects.toThrow();
});
