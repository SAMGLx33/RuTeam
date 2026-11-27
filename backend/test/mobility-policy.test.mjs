import { expect, test } from '@jest/globals';
import {
  matchMobility,
  localSchedule,
} from '../dist/src/modules/mobility/domain/mobility.policy.js';
const departureAt = new Date('2026-11-30T13:00:00Z'); // lunes,08:00 Colombia
const profile = {
  userId: 'student',
  active: true,
  direction: 'HACIA_USC',
  campusSiteId: 'site-a',
  days: [1],
  startMinute: 450,
  endMinute: 510,
  latitude: 3.44,
  longitude: -76.52,
  radiusKm: 0.3,
  vehicleTypes: ['CAR'],
};
const point = (id, position, latitude, longitude, access, campus = null) => ({
  id,
  position,
  latitude,
  longitude,
  access,
  campus,
  campusPointId: campus ? 'institution' : null,
  campusSiteId: campus ? 'site-a' : null,
  label: 'Punto público',
  instructions: null,
});
const trip = {
  id: 'trip',
  driverId: 'driver',
  departureAt,
  vehicleType: 'CAR',
  stops: [
    point('start', 0, 3.44, -76.52, 'PICKUP'),
    point('usc', 1, 3.4, -76.55, 'DROPOFF', 'USC'),
  ],
  geometry: {
    type: 'LineString',
    coordinates: [
      [-76.52, 3.44],
      [-76.55, 3.4],
    ],
  },
};
test('horarios se interpretan en Colombia e ISO lunes1/domingo7', () => {
  expect(localSchedule(departureAt)).toEqual({ day: 1, minute: 480 });
  expect(localSchedule(new Date('2026-11-30T02:00:00Z'))).toEqual({
    day: 7,
    minute: 1260,
  });
});
test('parada autorizada cercana produce DIRECT sin modificar geometría', () => {
  const before = JSON.stringify(trip);
  expect(matchMobility(trip, profile)).toMatchObject({
    type: 'DIRECT',
    pickupId: 'start',
    dropoffId: 'usc',
    distanceKm: 0,
  });
  expect(JSON.stringify(trip)).toBe(before);
});
test.each([
  { active: false },
  { direction: 'DESDE_USC' },
  { days: [2] },
  { startMinute: 481 },
  { endMinute: 479 },
  { vehicleTypes: ['MOTORCYCLE'] },
  { userId: 'driver' },
  { latitude: null, longitude: null },
  { campusSiteId: 'site-b' },
])('incompatibilidad %j nunca es recomendación', (change) => {
  expect(matchMobility(trip, { ...profile, ...change })).toBeNull();
});
test('texto de lugar por sí solo no simula comprobación geográfica', () => {
  expect(
    matchMobility(trip, {
      ...profile,
      placeLabel: 'Punto público',
      latitude: null,
      longitude: null,
    }),
  ).toBeNull();
});
test('cercanía a geometría sin pickup autorizado es POTENTIAL sólo hacia USC', () => {
  const preference = {
    ...profile,
    latitude: 3.42,
    longitude: -76.535,
    radiusKm: 0.1,
  };
  expect(matchMobility(trip, preference)).toMatchObject({
    type: 'POTENTIAL',
    pickupId: null,
    dropoffId: 'usc',
    distanceKm: null,
  });
  expect(matchMobility({ ...trip, geometry: null }, preference)).toBeNull();
  expect(matchMobility(trip, { ...preference, latitude: 3.6 })).toBeNull();
});
test('desde USC sólo descenso autorizado cercano; no ofrece recogida intermedia', () => {
  const outbound = {
    ...trip,
    stops: [
      point('usc', 0, 3.4, -76.55, 'PICKUP', 'USC'),
      point('end', 1, 3.44, -76.52, 'DROPOFF'),
    ],
    geometry: {
      type: 'LineString',
      coordinates: [
        [-76.55, 3.4],
        [-76.52, 3.44],
      ],
    },
  };
  expect(
    matchMobility(outbound, { ...profile, direction: 'DESDE_USC' }),
  ).toMatchObject({ type: 'DIRECT', pickupId: 'usc', dropoffId: 'end' });
  expect(
    matchMobility(outbound, {
      ...profile,
      direction: 'DESDE_USC',
      latitude: 3.42,
      longitude: -76.535,
      radiusKm: 0.1,
    }),
  ).toBeNull();
});
test('trayecto externo con USC intermedia sigue siendo incompatible', () => {
  expect(
    matchMobility(
      {
        ...trip,
        stops: [...trip.stops, point('end', 2, 3.41, -76.54, 'DROPOFF')],
      },
      profile,
    ),
  ).toBeNull();
});

test('recomendaciones sólo usan actor verificado y fuente sintética explícita mientras real está bloqueada', async () => {
  const { recommendationActorEligible } =
    await import('../dist/src/modules/mobility/domain/mobility.policy.js');
  const now = new Date('2026-11-30T13:00:00Z');
  const actor = {
    demoIdentity: 'fixture',
    disabledAt: null,
    emailVerifiedAt: now,
    membership: {
      status: 'ACTIVE',
      group: 'STUDENT',
      validUntil: new Date('2030-01-01'),
      verifiedBy: 'DEMO',
    },
  };
  const access = {
    demo: true,
    NODE_ENV: 'test',
    VERIFICATION_PROVIDER: 'demo',
  };
  expect(recommendationActorEligible(actor, access, now)).toBe(true);
  for (const change of [
    { emailVerifiedAt: null },
    { disabledAt: now },
    { demoIdentity: null },
    { membership: { ...actor.membership, verifiedBy: 'UNVERIFIED' } },
    { membership: { ...actor.membership, group: 'TEACHER' } },
  ]) {
    expect(
      recommendationActorEligible({ ...actor, ...change }, access, now),
    ).toBe(false);
  }
  for (const change of [
    { NODE_ENV: 'production' },
    { demo: false },
    { VERIFICATION_PROVIDER: 'official' },
  ])
    expect(
      recommendationActorEligible(actor, { ...access, ...change }, now),
    ).toBe(false);
});

test('recogida intermedia con hora vial se evalúa en el día de Colombia en que ocurre', () => {
  const departs = new Date('2026-12-01T04:50:00Z'); // lunes 23:50
  const stop = point('pickup', 1, 3.44, -76.52, 'PICKUP');
  const inbound = {
    ...trip,
    departureAt: departs,
    geometry: null,
    stops: [
      point('start', 0, 3.45, -76.51, 'PICKUP'),
      { ...stop, estimatedOffsetSeconds: 1200 },
      { ...trip.stops.at(-1), position: 2 },
    ],
  };
  const afterMidnight = {
    ...profile,
    days: [2],
    startMinute: 0,
    endMinute: 15,
  };
  expect(matchMobility(inbound, afterMidnight)).toMatchObject({
    type: 'DIRECT',
    pickupId: 'pickup',
    pickupEstimatedAt: '2026-12-01T05:10:00.000Z',
  });
  expect(
    matchMobility(
      { ...inbound, stops: [inbound.stops[0], stop, inbound.stops[2]] },
      afterMidnight,
    ),
  ).toBeNull();
});

test('el aporte máximo es un filtro de coincidencia y admite un tope de cero', () => {
  const priced = { ...trip, suggestedContributionCop: 2700 };
  expect(
    matchMobility(priced, { ...profile, maxContributionCop: 2699 }),
  ).toBeNull();
  expect(
    matchMobility(priced, { ...profile, maxContributionCop: 2700 })?.type,
  ).toBe('DIRECT');
  expect(matchMobility(trip, { ...profile, maxContributionCop: 0 })?.type).toBe(
    'DIRECT',
  );
});
