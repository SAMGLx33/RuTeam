import type { RouteGeometry } from '@ruteam/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { segmentDistances } from '../domain/emission-segments.js';
import {
  calculateTrip,
  type EmissionInput,
  type EmissionRider,
} from '../domain/emissions.js';

export async function recordEmissions(
  tx: Prisma.TransactionClient,
  tripId: string,
  at: Date,
) {
  const trip = await tx.trip.findUniqueOrThrow({
    where: { id: tripId },
    select: {
      environmentInput: true,
      routeDistanceMeters: true,
      routeGeometry: true,
      stops: {
        orderBy: { position: 'asc' },
        select: { id: true, latitude: true, longitude: true },
      },
      reservations: {
        where: {
          status: 'CONFIRMED',
          boardedAt: { not: null },
          noShowAt: null,
        },
        select: {
          pickupId: true,
          dropoffId: true,
          droppedOffAt: true,
          members: { select: { userId: true } },
        },
      },
    },
  });
  const meters = trip.routeDistanceMeters;
  const indexes = new Map(trip.stops.map(({ id }, index) => [id, index]));
  const last = trip.stops.length - 1;
  const riders = new Map<string, EmissionRider>();
  for (const reservation of trip.reservations) {
    const first = indexes.get(reservation.pickupId);
    const end = indexes.get(reservation.dropoffId);
    if (first === undefined || end === undefined || first >= end) continue;
    for (const { userId } of reservation.members) {
      if (!riders.has(userId))
        riders.set(userId, {
          userId,
          first,
          last: end,
          observedDropoff: !!reservation.droppedOffAt,
        });
    }
  }
  const segments = segmentDistances(
    trip.routeGeometry as RouteGeometry | null,
    trip.stops.map(({ latitude, longitude }) => ({
      latitude: Number(latitude),
      longitude: Number(longitude),
    })),
    meters,
  );
  const snapshot = calculateTrip(
    at,
    trip.environmentInput as unknown as EmissionInput | null,
    meters,
    segments,
    last,
    [...riders.values()],
  );
  await tx.trip.update({
    where: { id: tripId },
    data: {
      environmentSnapshot: snapshot as unknown as Prisma.InputJsonObject,
    },
  });
}
