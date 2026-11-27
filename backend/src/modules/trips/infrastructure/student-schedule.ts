import type { Prisma } from '../../../generated/prisma/client.js';
import {
  overlap,
  segmentWindow,
  tripWindow,
  type ActivityWindow,
} from '../domain/activity-window.js';

export async function hasActivityConflict(
  tx: Pick<Prisma.TransactionClient, 'trip'>,
  userId: string,
  requested: ActivityWindow,
  excludedTripId?: string,
) {
  const memberReservation = {
    status: 'CONFIRMED',
    noShowAt: null,
    droppedOffAt: null,
    members: { some: { userId } },
  } as const;
  const trips = await tx.trip.findMany({
    where: {
      id: { not: excludedTripId },
      status: { in: ['PROGRAMADO', 'EN_CURSO'] },
      expiredAt: null,
      AND: [
        {
          OR: [
            { departureAt: { lt: requested.end } },
            { startedAt: { lt: requested.end } },
          ],
        },
        {
          OR: [
            { driverId: userId },
            { reservations: { some: memberReservation } },
          ],
        },
      ],
    },
    select: {
      driverId: true,
      status: true,
      departureAt: true,
      expectedEndAt: true,
      estimatedDepartureAt: true,
      startedAt: true,
      estimatedDurationMinutes: true,
      reservations: {
        where: memberReservation,
        select: {
          pickup: { select: { estimatedOffsetSeconds: true } },
          dropoff: { select: { estimatedOffsetSeconds: true } },
        },
      },
    },
  });
  return trips.some((trip) =>
    trip.driverId === userId
      ? overlap(tripWindow(trip), requested)
      : trip.reservations.some((reservation) =>
          overlap(
            segmentWindow(trip, reservation.pickup, reservation.dropoff),
            requested,
          ),
        ),
  );
}
