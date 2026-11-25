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
    driver: { membership, driverEligibility: { ...document, category: 'CAR' } },
    vehicle: { type: 'CAR', document },
    stops: [
      {
        id: 'pickup',
        position: 0,
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
    trip: { status: trip.status, departureAt: trip.departureAt },
    createdAt: now(),
    confirmedAt: now(),
    boardedAt: null,
    members: [{ userId: actor }],
  });
  unit = {
    trip: async () => trip,
    memberships: async () => [membership],
    activeForMember: async () => row,
    find: async () => row,
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
  });
  expect(calls).toEqual([
    ['seats', 1],
    ['create', actor, input.pickupId, input.dropoffId, expect.any(Date)],
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
    ['status', 'CANCELLED'],
  ]);
});
test('retirar pendiente histórico no lo promueve ni cambia ocupación', async () => {
  row = unit.fixture('PENDING');
  expect((await service.cancel(actor, row.id)).status).toBe('CANCELLED');
  expect(calls).toEqual([['status', 'CANCELLED']]);
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
  expect(calls).toEqual([['board']]);
  expect(trip.occupiedSeats).toBe(1);
});
test('abordaje rechaza pendiente, viaje cancelado, finalizado y ventana vencida', async () => {
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
