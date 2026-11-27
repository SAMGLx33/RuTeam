import { beforeEach, expect, test } from '@jest/globals';
import { ReservationsService } from '../dist/src/modules/reservations/application/reservations.service.js';

const now = () => new Date();
const hours = (n) => new Date(Date.now() + n * 3600000);
let service, unit, trip, row, calls;
const actor = 'student';
const input = { pickupId: 'pickup', dropoffId: 'dropoff' };
const membership = {
  status: 'ACTIVE',
  group: 'STUDENT',
  validUntil: hours(100),
};
const document = {
  reviewStatus: 'PENDING',
  verificationSource: 'SELF_DECLARED',
  demo: true,
  expiresAt: hours(100),
};
beforeEach(() => {
  calls = [];
  row = null;
  trip = {
    id: 'trip',
    driverId: 'driver',
    routeDescription: 'Ruta',
    status: 'PROGRAMADO',
    departureAt: hours(1),
    expectedEndAt: hours(2),
    offeredSeats: 1,
    occupiedSeats: 0,
    startedAt: null,
    finishedAt: null,
    driver: { membership, driverEligibility: { ...document, category: 'CAR' } },
    vehicle: { type: 'CAR', document },
    stops: [
      {
        id: 'pickup',
        position: 0,
        reachedAt: null,
        campus: 'USC',
        campusPointId: 'campus',
        access: 'PICKUP',
        label: 'Inicio',
        latitude: 3.4,
        longitude: -76.5,
      },
      {
        id: 'dropoff',
        position: 1,
        reachedAt: null,
        access: 'DROPOFF',
        label: 'Fin',
        latitude: 3.5,
        longitude: -76.5,
      },
    ],
  };
  const view = (status = 'CONFIRMED') => ({
    id: 'reservation',
    tripId: trip.id,
    requesterId: actor,
    quantity: 1,
    status,
    pickupId: 'pickup',
    dropoffId: 'dropoff',
    pickup: trip.stops[0],
    dropoff: trip.stops[1],
    requester: { profile: { displayName: 'Estudiante' } },
    trip: {
      status: trip.status,
      departureAt: trip.departureAt,
      suggestedContributionCop: null,
      compensationMethods: [],
      driver: { profile: { displayName: 'Conductor' } },
      vehicle: { type: 'CAR', brand: 'Marca', color: 'GRIS' },
    },
    createdAt: now(),
    confirmedAt: now(),
    boardedAt: null,
    noShowAt: null,
    members: [{ userId: actor }],
  });
  unit = {
    trip: async () => trip,
    memberships: async () => [membership],
    activeForMember: async () => row,
    find: async () => row,
    notify: async (kind, recipients, id) => {
      calls.push(['notice', kind, recipients, id]);
    },
    revokePass: async (id) => {
      calls.push(['revoke-pass', id]);
    },
    create: async (...args) => {
      calls.push(['create', ...args]);
      row = view();
      return row;
    },
    addOccupiedSeats: async (n) => {
      calls.push(['seats', n]);
      trip.occupiedSeats += n;
    },
    changeStatus: async (_id, status) => {
      calls.push(['status', status]);
      row.status = status;
      return row;
    },
    transition: async (_actorId, status, at, originId) => {
      trip.status = status;
      if (status === 'EN_CURSO') {
        trip.startedAt = at;
        trip.stops.find(({ id }) => id === originId).reachedAt = at;
      }
      if (status === 'COMPLETADO') trip.finishedAt = at;
      return trip;
    },
    reachStop: async (stopId, reachedAt) => {
      const stop = trip.stops.find(({ id }) => id === stopId);
      stop.reachedAt = reachedAt;
      return stop;
    },
    noShow: async (_id, date) => {
      calls.push(['no-show']);
      row.noShowAt = date;
      return row;
    },
    board: async (_id, date) => {
      calls.push(['board']);
      row.boardedAt = date;
      return row;
    },
  };
  service = new ReservationsService({
    withTripLock: async (_id, operation) => operation(unit),
    tripForRequest: async () => trip.id,
  });
  unit.fixture = view;
});

test('confirmación directa crea una plaza confirmada para el actor y replay no duplica', async () => {
  const confirmed = await service.confirm(actor, trip.id, input);
  expect(confirmed).toMatchObject({
    status: 'CONFIRMED',
    quantity: 1,
    boardedAt: null,
    driverName: 'Conductor',
    vehicle: { type: 'CAR', brand: 'Marca', color: 'GRIS' },
  });
  expect(calls).toEqual([
    ['seats', 1],
    ['create', actor, input.pickupId, input.dropoffId, expect.any(Date)],
    ['notice', 'PARTICIPATION_CONFIRMED', [actor], confirmed.id],
    ['notice', 'PASSENGER_JOINED', ['driver'], confirmed.id],
  ]);
  const replay = await service.confirm(actor, trip.id, input);
  expect(replay.id).toBe(confirmed.id);
  expect(trip.occupiedSeats).toBe(1);
  expect(calls.filter(([name]) => name === 'create')).toHaveLength(1);
});
test('no confirma viaje propio ni segmento invertido', async () => {
  await expect(service.confirm('driver', trip.id, input)).rejects.toMatchObject(
    { status: 403 },
  );
  await expect(
    service.confirm(actor, trip.id, { ...input, pickupId: 'dropoff' }),
  ).rejects.toMatchObject({ status: 400 });
  expect(calls).toEqual([]);
});
test('viaje lleno, pasado o cerrado y estudiante no vigente no crean plazas', async () => {
  trip.occupiedSeats = 1;
  await expect(service.confirm(actor, trip.id, input)).rejects.toMatchObject({
    status: 409,
  });
  trip.occupiedSeats = 0;
  trip.status = 'EN_CURSO';
  await expect(service.confirm(actor, trip.id, input)).rejects.toMatchObject({
    status: 409,
  });
  trip.status = 'PROGRAMADO';
  trip.departureAt = hours(-1);
  await expect(service.confirm(actor, trip.id, input)).rejects.toMatchObject({
    status: 409,
  });
  trip.departureAt = hours(1);
  unit.memberships = async () => [{ ...membership, status: 'INACTIVE' }];
  await expect(service.confirm(actor, trip.id, input)).rejects.toMatchObject({
    status: 403,
  });
  expect(calls).toEqual([]);
});
test('no reutiliza confirmación para otro segmento o grupo legacy', async () => {
  row = unit.fixture();
  row.pickupId = 'other';
  await expect(service.confirm(actor, trip.id, input)).rejects.toMatchObject({
    status: 409,
  });
  row.pickupId = input.pickupId;
  row.quantity = 2;
  await expect(service.confirm(actor, trip.id, input)).rejects.toMatchObject({
    status: 409,
  });
  expect(calls).toEqual([]);
});
test('retiro futuro libera exactamente una plaza y conserva replay e historial', async () => {
  row = unit.fixture();
  trip.occupiedSeats = 1;
  const cancelled = await service.cancel(actor, row.id);
  expect(cancelled.status).toBe('CANCELLED');
  await service.cancel(actor, row.id);
  expect(trip.occupiedSeats).toBe(0);
  expect(calls).toEqual([
    ['seats', -1],
    ['notice', 'PASSENGER_WITHDREW', ['driver'], row.id],
    ['revoke-pass', row.id],
    ['status', 'CANCELLED'],
  ]);
});
test('retirar pendiente histórico no lo promueve ni cambia ocupación', async () => {
  row = unit.fixture('PENDING');
  expect((await service.cancel(actor, row.id)).status).toBe('CANCELLED');
  expect(calls).toEqual([
    ['revoke-pass', row.id],
    ['status', 'CANCELLED'],
  ]);
});
test('no retira participación ajena, pasada o abordada', async () => {
  row = unit.fixture();
  await expect(service.cancel('other', row.id)).rejects.toMatchObject({
    status: 403,
  });
  trip.departureAt = hours(-1);
  await expect(service.cancel(actor, row.id)).rejects.toMatchObject({
    status: 409,
  });
  trip.departureAt = hours(1);
  row.boardedAt = now();
  await expect(service.cancel(actor, row.id)).rejects.toMatchObject({
    status: 409,
  });
  expect(calls).toEqual([]);
});
test('abordaje sólo por conductor en ventana y sin ocupar una segunda plaza', async () => {
  row = unit.fixture();
  trip.occupiedSeats = 1;
  await expect(service.board(actor, row.id)).rejects.toMatchObject({
    status: 403,
  });
  await expect(service.board('driver', row.id)).rejects.toMatchObject({
    status: 409,
  });
  trip.departureAt = new Date(Date.now() + 10 * 60000);
  const boarded = await service.board('driver', row.id);
  expect(boarded.boardedAt).toEqual(expect.any(String));
  await service.board('driver', row.id);
  expect(calls).toEqual([['revoke-pass', row.id], ['board']]);
  expect(trip.occupiedSeats).toBe(1);
});
test('abordaje rechaza pendiente, viaje cancelado, finalizado o sin llegada registrada', async () => {
  row = unit.fixture('PENDING');
  trip.departureAt = new Date(Date.now() + 10 * 60000);
  await expect(service.board('driver', row.id)).rejects.toMatchObject({
    status: 409,
  });
  row.status = 'CONFIRMED';
  for (const status of ['CANCELADO', 'COMPLETADO']) {
    trip.status = status;
    await expect(service.board('driver', row.id)).rejects.toMatchObject({
      status: 409,
    });
  }
  trip.status = 'EN_CURSO';
  trip.expectedEndAt = hours(-1);
  await expect(service.board('driver', row.id)).rejects.toMatchObject({
    status: 409,
  });
  expect(calls).toEqual([]);
});

test('inicio conserva pendientes y registra llegada al origen', async () => {
  row = unit.fixture();
  await service.transition('driver', trip.id, 'START');
  expect(trip.startedAt).toBeInstanceOf(Date);
  expect(trip.stops[0].reachedAt).toEqual(trip.startedAt);
  expect(row).toMatchObject({
    status: 'CONFIRMED',
    boardedAt: null,
    noShowAt: null,
  });
});

test('abordaje en curso exige que la recogida sea la parada alcanzada vigente', async () => {
  trip.status = 'EN_CURSO';
  trip.departureAt = hours(-2);
  trip.stops[0].reachedAt = hours(-2);
  row = unit.fixture();
  row.pickupId = trip.stops[1].id;
  await expect(service.board('driver', row.id)).rejects.toMatchObject({
    status: 409,
  });
  expect(calls).toEqual([]);
  trip.stops[1].reachedAt = hours(-0.5);
  trip.expectedEndAt = hours(-1);
  const boarded = await service.board('driver', row.id);
  expect(boarded.boardedAt).toEqual(expect.any(String));
});

test('avanzar conserva orden y repetir la llegada no cambia su instante', async () => {
  trip.status = 'EN_CURSO';
  trip.stops[0].reachedAt = hours(-1);
  trip.stops.push({ id: 'tail', position: 2, reachedAt: null });
  await expect(
    service.reachStop(actor, trip.id, 'dropoff'),
  ).rejects.toMatchObject({ status: 403 });
  await expect(
    service.reachStop('driver', trip.id, 'tail'),
  ).rejects.toMatchObject({ status: 409 });
  const first = await service.reachStop('driver', trip.id, 'dropoff');
  await expect(
    service.reachStop('driver', trip.id, 'dropoff'),
  ).resolves.toEqual(first);
  expect(typeof first.reachedAt).toBe('string');
});

test('ausencia explícita sólo en la recogida alcanzada y no ocupa otra plaza', async () => {
  trip.status = 'EN_CURSO';
  trip.stops[0].reachedAt = hours(-1);
  trip.occupiedSeats = 1;
  row = unit.fixture();
  row.pickupId = trip.stops[1].id;
  await expect(service.noShow('driver', row.id)).rejects.toMatchObject({
    status: 409,
  });
  row.pickupId = trip.stops[0].id;
  await expect(service.noShow('driver', row.id)).resolves.toMatchObject({
    noShowAt: expect.any(String),
  });
  await expect(service.noShow('driver', row.id)).resolves.toMatchObject({
    noShowAt: expect.any(String),
  });
  await expect(service.board('driver', row.id)).rejects.toMatchObject({
    status: 409,
  });
  expect(calls).toEqual([['no-show']]);
  expect(trip.occupiedSeats).toBe(1);
});
