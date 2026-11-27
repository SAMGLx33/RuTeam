import { Injectable, NotFoundException } from '@nestjs/common';
import type { TripOperation } from '@ruteam/contracts';
import { TripOperationRepository } from '../infrastructure/repositories/trip-operation.repository.js';
import {
  presentItinerary,
  presentStops,
} from '../../trips/infrastructure/repositories/trips.repository.js';

@Injectable()
export class TripOperationService {
  constructor(private readonly repository: TripOperationRepository) {}
  async context(tripId: string, actorId: string): Promise<TripOperation> {
    const trip = await this.repository.context(tripId, actorId);
    if (!trip) throw new NotFoundException('Viaje personal no disponible');
    const owner = trip.driverId === actorId;
    const stops = presentStops(trip);
    const reached = stops.filter(({ reachedAt }) => !!reachedAt);
    const current = reached.at(-1) ?? null;
    const next = stops.find(({ reachedAt }) => !reachedAt) ?? null;
    const confirmed = trip.reservations.filter(
      ({ status }) => status === 'CONFIRMED',
    );
    const reservation = owner ? null : (confirmed[0] ?? trip.reservations[0]);
    const pickup = stops.find(({ id }) => id === reservation?.pickupId) ?? null;
    const dropoff =
      stops.find(({ id }) => id === reservation?.dropoffId) ?? null;
    const sum = (rows: typeof confirmed) =>
      rows.reduce((count, row) => count + row.quantity, 0);
    const pending = confirmed.filter((row) => !row.noShowAt && !row.boardedAt);
    const awaitingHere = sum(
      pending.filter((row) => row.pickupId === current?.id),
    );
    return {
      id: trip.id,
      role: owner ? 'DRIVER' : 'PASSENGER',
      status: trip.status,
      departureAt: trip.departureAt.toISOString(),
      startedAt: trip.startedAt?.toISOString() ?? null,
      finishedAt: trip.finishedAt?.toISOString() ?? null,
      driver: trip.driver.profile?.displayName ?? null,
      vehicle: trip.vehicle,
      progress: { current, next, reached: reached.length, total: stops.length },
      itinerary: presentItinerary(trip),
      participation: reservation
        ? {
            id: reservation.id,
            status: reservation.status,
            boardedAt: reservation.boardedAt?.toISOString() ?? null,
            noShowAt: reservation.noShowAt?.toISOString() ?? null,
            pickup,
            dropoff,
            canIssuePass:
              reservation.requesterId === actorId &&
              reservation.quantity === 1 &&
              reservation.status === 'CONFIRMED' &&
              !reservation.boardedAt &&
              !reservation.noShowAt &&
              (trip.status === 'PROGRAMADO' || trip.status === 'EN_CURSO'),
            pickupEstimatedAt:
              pickup?.estimatedOffsetSeconds != null
                ? new Date(
                    +(trip.startedAt ?? trip.departureAt) +
                      pickup.estimatedOffsetSeconds * 1000,
                  ).toISOString()
                : null,
          }
        : null,
      manifest: owner
        ? {
            awaitingHere,
            boarded: sum(confirmed.filter(({ boardedAt }) => !!boardedAt)),
            noShows: sum(confirmed.filter(({ noShowAt }) => !!noShowAt)),
            awaitingLater: sum(pending) - awaitingHere,
            pendingProposals:
              trip.status === 'PROGRAMADO' && trip.departureAt > new Date()
                ? trip._count.pickupProposals
                : 0,
          }
        : null,
    };
  }
}
