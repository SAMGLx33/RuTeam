import { beforeAll, afterAll, expect, test } from '@jest/globals';
import request from 'supertest';
import { randomInt } from 'node:crypto';
let app, db, tokens, destination, vehicle, driverId, originalLicense;
const vehicleIds = [],
  tripIds = [];
const days = (n) => new Date(Date.now() + n * 86400000).toISOString();
let counter = randomInt(100, 800);
const plate = () => `ZZZ${counter++}`;
const call = (method, path, identity = 'diego') => {
  const agent = request(app.getHttpServer());
  return agent[method](`/api/v1${path}`)
    .set('x-ruteam-client', 'native')
    .auth(tokens[identity], { type: 'bearer' });
};
const vehicleInput = () => ({
  plate: plate(),
  type: 'CAR',
  passengerCapacity: 3,
  brand: 'Marca Demo',
  modelYear: 2020,
  color: 'GRIS',
  soatExpiresAt: days(400),
});
const tripInput = (offset = 1) => ({
  vehicleId: vehicle.id,
  departureAt: days(offset),
  estimatedDurationMinutes: 45,
  offeredSeats: 3,
  ruleIds: [],
  itinerary: {
    direction: 'HACIA_USC',
    publicMeetingPoints: true,
    description: 'Recorrido sintético del estudiante',
    origin: {
      label: 'Origen de prueba',
      latitude: 3.43,
      longitude: -76.52,
      instructions: 'Encuentro público',
    },
    destination: { campusPointId: destination.id },
    stops: [
      {
        label: 'Recogida uno de prueba',
        latitude: 3.42,
        longitude: -76.53,
        instructions: 'Encuentro público',
        access: 'PICKUP',
      },
      {
        label: 'Recogida dos de prueba',
        latitude: 3.41,
        longitude: -76.54,
        instructions: 'Encuentro público',
        access: 'PICKUP',
      },
    ],
  },
});
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
  app = await createApp();
  await app.init();
  db = app.get(PrismaService);
  tokens = {};
  for (const identity of ['diego', 'ana', 'sara']) {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/demo/login')
      .set('x-ruteam-client', 'native')
      .send({ identity })
      .expect(201);
    tokens[identity] = res.body.token;
    if (identity === 'diego') driverId = res.body.user.id;
  }
  destination = (await call('get', '/campus/destinations')).body[0];
});
afterAll(async () => {
  if (db?.trip) await db.trip.deleteMany({ where: { id: { in: tripIds } } });
  if (db?.vehicle)
    await db.vehicle.deleteMany({ where: { id: { in: vehicleIds } } });
  if (originalLicense && db?.driverEligibility)
    await db.driverEligibility.update({
      where: { userId: driverId },
      data: {
        expiresAt: originalLicense.expiresAt,
        reviewStatus: originalLicense.reviewStatus,
        category: originalLicense.category,
      },
    });
  await app?.close();
});

test('autogestión declara documentos sin revisión ni verificación oficial', async () => {
  const res = await call('post', '/vehicles').send(vehicleInput()).expect(201);
  vehicle = res.body;
  vehicleIds.push(vehicle.id);
  expect(vehicle).toMatchObject({
    verificationStatus: 'DECLARED',
    verificationSource: 'SELF_DECLARED',
    demo: true,
    passengerCapacity: 3,
    eligibleNow: true,
  });
  expect(vehicle).not.toHaveProperty('reviewStatus');
  await call('post', `/admin/demo/vehicles/${vehicle.id}/review`)
    .send({ decision: 'APPROVED', revision: 1 })
    .expect(404);
  originalLicense = await db.driverEligibility.findUnique({
    where: { userId: driverId },
  });
  const submitted = await call('post', '/driver-eligibility')
    .send({ category: 'BOTH', expiresAt: days(400) })
    .expect(201);
  expect(submitted.body).toMatchObject({
    verificationStatus: 'DECLARED',
    verificationSource: 'SELF_DECLARED',
  });
});
test('unicidad de placa normalizada y rechazo de autoaprobación', async () => {
  await call('post', '/vehicles')
    .send({ ...vehicleInput(), plate: vehicle.plate.toLowerCase() })
    .expect(409);
  await call('post', '/vehicles')
    .send({ ...vehicleInput(), reviewStatus: 'APPROVED' })
    .expect(400);
});
test.each([
  { plate: 'INVALID' },
  { passengerCapacity: 5 },
  { passengerCapacity: -1 },
  { modelYear: 1990 },
  { color: 'INVENTADO' },
  { soatExpiresAt: new Date(0).toISOString() },
  { type: 'MOTORCYCLE', plate: 'ZZZ12C', passengerCapacity: 2 },
])('validación vehículo servidor %j', async (patch) => {
  await call('post', '/vehicles')
    .send({ ...vehicleInput(), ...patch })
    .expect(400);
});
test('publica realmente PROGRAMADO con paradas ordenadas, sin reglas seleccionadas ni cupos ocupados', async () => {
  const res = await call('post', '/trips').send(tripInput()).expect(201);
  tripIds.push(res.body.id);
  expect(res.body).toMatchObject({
    status: 'PROGRAMADO',
    occupancy: 'DISPONIBLE',
    occupiedSeats: 0,
    availableSeats: 3,
    locationMode: 'DEMO',
  });
  expect(res.body.stops.map((stop) => stop.position)).toEqual([1, 2]);
  expect(res.body.rules).toEqual([]);
  expect(
    (
      await db.trip.findUniqueOrThrow({
        where: { id: res.body.id },
        include: { events: true },
      })
    ).events[0].type,
  ).toBe('PUBLISHED');
  const own = await call('get', '/trips/my').expect(200);
  expect(own.body.some((trip) => trip.id === res.body.id)).toBe(true);
  const other = await call('get', '/trips/my', 'ana').expect(200);
  expect(other.body.some((trip) => trip.id === res.body.id)).toBe(false);
});
test('vehículo ajeno no permite publicar ni revisar', async () => {
  await call('post', '/trips', 'ana').send(tripInput(3)).expect(403);
  await call('post', `/admin/demo/vehicles/${vehicle.id}/review`, 'ana')
    .send({ decision: 'APPROVED', revision: 1 })
    .expect(404);
});
test.each([
  { origin: [] },
  { origin: [{ label: 'DEMO', latitude: 3.4, longitude: -76.5 }] },
  { offeredSeats: 4 },
  { offeredSeats: 0 },
  { departureAt: 'invalid' },
  { departureAt: new Date(0).toISOString() },
  { departureAt: new Date(Date.now() + 20 * 60000).toISOString() },
  { destinationId: '00000000-0000-4000-8000-000000000001' },
  { ruleIds: ['00000000-0000-4000-8000-000000000002'] },
  { estimatedDurationMinutes: 0 },
  {
    stops: [
      { position: 2, label: 'Salto de orden', latitude: 3.4, longitude: -76.5 },
    ],
  },
  {
    stops: [{ position: 1, label: 'Inválida', latitude: 91, longitude: -76.5 }],
  },
  { status: 'COMPLETADO' },
])('publicación rechaza %j', async (patch) => {
  await call('post', '/trips')
    .send({ ...tripInput(4), ...patch })
    .expect(400);
});
test('destino USC deshabilitado no se acepta ni redirige', async () => {
  const disabled = await db.campusDestination.create({
    data: {
      code: `TEST-DISABLED-${counter++}`,
      name: 'Deshabilitado DEMO',
      latitude: 3.4,
      longitude: -76.5,
      active: false,
    },
  });
  try {
    await call('post', '/trips')
      .send({
        ...tripInput(5),
        itinerary: {
          ...tripInput(5).itinerary,
          destination: { campusPointId: disabled.id },
        },
      })
      .expect(400);
  } finally {
    await db.campusDestination.delete({ where: { id: disabled.id } });
  }
});
test('dos publicaciones superpuestas simultáneas confirman exactamente una', async () => {
  const before = await db.trip.count();
  const responses = await Promise.all([
    call('post', '/trips').send(tripInput(6)),
    call('post', '/trips').send(tripInput(6)),
  ]);
  responses
    .filter((res) => res.status === 201)
    .forEach((res) => tripIds.push(res.body.id));
  expect(responses.map((res) => res.status).sort()).toEqual([201, 409]);
  expect(await db.trip.count()).toBe(before + 1);
});
test('licencia vencida o que vence antes de la salida impide publicación', async () => {
  const old = await db.driverEligibility.findUniqueOrThrow({
    where: { userId: driverId },
  });
  await db.driverEligibility.update({
    where: { userId: driverId },
    data: { expiresAt: new Date(Date.now() + 3600000) },
  });
  try {
    await call('post', '/trips').send(tripInput(7)).expect(403);
  } finally {
    await db.driverEligibility.update({
      where: { userId: driverId },
      data: { expiresAt: old.expiresAt },
    });
  }
});
test('SOAT vencido impide publicación', async () => {
  const old = await db.vehicleDocument.findUniqueOrThrow({
    where: { vehicleId: vehicle.id },
  });
  await db.vehicleDocument.update({
    where: { vehicleId: vehicle.id },
    data: { expiresAt: new Date(0) },
  });
  try {
    await call('post', '/trips').send(tripInput(8)).expect(403);
  } finally {
    await db.vehicleDocument.update({
      where: { vehicleId: vehicle.id },
      data: { expiresAt: old.expiresAt },
    });
  }
});
test('baja institucional posterior impide registro/listado/publicación', async () => {
  await db.institutionalMembership.update({
    where: { userId: driverId },
    data: { status: 'INACTIVE' },
  });
  try {
    await call('post', '/vehicles').send(vehicleInput()).expect(403);
    await call('get', '/vehicles').expect(403);
    await call('post', '/trips').send(tripInput(9)).expect(403);
  } finally {
    await db.institutionalMembership.update({
      where: { userId: driverId },
      data: { status: 'ACTIVE' },
    });
  }
});

test('renovación declarada se versiona y antiguas rutas administrativas no existen', async () => {
  const original = await db.driverEligibility.findUniqueOrThrow({
    where: { userId: driverId },
  });
  try {
    const first = await call('post', '/driver-eligibility')
      .send({ category: 'CAR', expiresAt: days(400) })
      .expect(201);
    const second = await call('post', '/driver-eligibility')
      .send({ category: 'BOTH', expiresAt: days(400) })
      .expect(201);
    expect(second.body.revision).toBe(first.body.revision + 1);
    await call(
      'post',
      `/admin/demo/driver-eligibility/${driverId}/review`,
      'sara',
    )
      .send({ decision: 'APPROVED', revision: first.body.revision })
      .expect(404);
  } finally {
    await db.driverEligibility.update({
      where: { userId: driverId },
      data: {
        category: original.category,
        expiresAt: original.expiresAt,
        reviewStatus: original.reviewStatus,
        verificationSource: original.verificationSource,
      },
    });
  }
});
test('SOAT sólo puede actualizarlo el propietario y siempre queda declarado', async () => {
  await call('patch', `/vehicles/${vehicle.id}/soat`, 'ana')
    .send({ soatExpiresAt: days(500) })
    .expect(404);
  await call('patch', `/vehicles/${vehicle.id}/soat`)
    .send({ soatExpiresAt: new Date(0).toISOString() })
    .expect(400);
  await call('patch', `/vehicles/${vehicle.id}/soat`)
    .send({ soatExpiresAt: days(500), verificationSource: 'AUTHORIZED_SOURCE' })
    .expect(400);
  const updated = await call('patch', `/vehicles/${vehicle.id}/soat`)
    .send({ soatExpiresAt: days(500) })
    .expect(200);
  expect(updated.body).toMatchObject({
    verificationStatus: 'DECLARED',
    verificationSource: 'SELF_DECLARED',
  });
});
test('documento no sintético sin fuente autorizada bloquea publicación', async () => {
  await db.vehicleDocument.update({
    where: { vehicleId: vehicle.id },
    data: { demo: false },
  });
  try {
    await call('post', '/trips').send(tripInput(12)).expect(403);
  } finally {
    await db.vehicleDocument.update({
      where: { vehicleId: vehicle.id },
      data: { demo: true },
    });
  }
});

test('motocicleta exige casco declarado y una plaza, conserva etiqueta de casco propio', async () => {
  const res = await call('post', '/vehicles')
    .send({
      ...vehicleInput(),
      plate: `ZXY${randomInt(10, 99)}C`,
      type: 'MOTORCYCLE',
      passengerCapacity: 1,
    })
    .expect(201);
  vehicleIds.push(res.body.id);
  const input = { ...tripInput(13), vehicleId: res.body.id, offeredSeats: 1 };
  await call('post', '/trips').send(input).expect(400);
  const trip = await call('post', '/trips')
    .send({ ...input, providesHelmet: false })
    .expect(201);
  tripIds.push(trip.body.id);
  expect(trip.body.providesHelmet).toBe(false);
  expect(trip.body.availableSeats).toBe(1);
});
test('sin bandeja administrativa y vehículos restringidos al propietario', async () => {
  await call('get', '/admin/demo/document-reviews', 'ana').expect(404);
  await call('get', '/admin/demo/document-reviews', 'sara').expect(404);
  const own = await call('get', '/vehicles', 'ana').expect(200);
  expect(own.body.some((item) => item.id === vehicle.id)).toBe(false);
});
