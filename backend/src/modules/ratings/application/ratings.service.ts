import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  SubmitRatingInput,
  TripRatingDetail,
  TripRatingsPage,
  TripRatingsView,
} from '@ruteam/contracts';
import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
import { ratingTargetRole } from '../domain/rating-policy.js';
import {
  presentSubmitted,
  RatingsRepository,
  type RatedTrip,
} from '../infrastructure/ratings.repository.js';

function presentTrip(trip: RatedTrip, actorId: string): TripRatingsView {
  const candidates =
    trip.driverId === actorId
      ? trip.reservations.map((row) => ({
          rateeId: row.requesterId,
          name: row.requester.profile?.displayName ?? null,
          capacity: 'PASSENGER' as const,
        }))
      : [
          {
            rateeId: trip.driverId,
            name: trip.driver.profile?.displayName ?? null,
            capacity: 'DRIVER' as const,
          },
        ];
  const completedAt = trip.finishedAt ?? trip.events[0]?.createdAt;
  const submitted = new Map(
    trip.ratings.map((rating) => [rating.rateeId, presentSubmitted(rating)]),
  );
  return {
    tripId: trip.id,
    origin: trip.originLabel,
    destination: trip.stops[0]?.label ?? 'Destino del viaje',
    completedAt: completedAt?.toISOString() ?? null,
    targets: candidates.map((target) => ({
      ...target,
      submitted: submitted.get(target.rateeId) ?? null,
    })),
  };
}

function requireCompleted(trip: RatedTrip, actorId: string) {
  const passengers = new Set(
    trip.reservations.map(({ requesterId }) => requesterId),
  );
  if (trip.driverId !== actorId && !passengers.has(actorId))
    throw new NotFoundException('Evaluaciones de viaje no disponibles');
  if (trip.status !== 'COMPLETADO')
    throw new ConflictException('Sólo puedes evaluar un viaje completado');
  return passengers;
}

@Injectable()
export class RatingsService {
  constructor(private readonly repository: RatingsRepository) {}

  reputation(actorId: string) {
    return this.repository.summaries(actorId);
  }

  async history(actorId: string, cursor?: string): Promise<TripRatingsPage> {
    const [rows, reputations] = await Promise.all([
      this.repository.completedTrips(actorId, cursor),
      this.repository.summaries(actorId),
    ]);
    return {
      items: rows.slice(0, 20).map((trip) => presentTrip(trip, actorId)),
      nextCursor: rows.length > 20 ? rows[19].id : null,
      reputations,
    };
  }

  async detail(actorId: string, tripId: string): Promise<TripRatingDetail> {
    const trip = await this.repository.findTrip(tripId, actorId);
    if (!trip)
      throw new NotFoundException('Evaluaciones de viaje no disponibles');
    requireCompleted(trip, actorId);
    return {
      ...presentTrip(trip, actorId),
      reputations: await this.repository.summaries(actorId),
    };
  }

  submit(actorId: string, tripId: string, input: SubmitRatingInput) {
    return this.repository.withTrip(tripId, actorId, async (trip, unit) => {
      const [membership] = await unit.membership();
      if (!isActiveMembership(membership ?? null, new Date()))
        throw new ForbiddenException('Afiliación USC no activa');
      const passengers = requireCompleted(trip, actorId);
      const rateeId = input.rateeId.toLowerCase();
      if (rateeId === actorId)
        throw new BadRequestException('No puedes evaluarte');
      const capacity = ratingTargetRole(
        trip.driverId,
        passengers,
        actorId,
        rateeId,
      );
      if (!capacity)
        throw new ForbiddenException(
          'Puedes evaluar a quien compartió el viaje en la otra capacidad',
        );
      const saved = await unit.submit(
        rateeId,
        capacity,
        input.stars,
        input.comment?.trim() || null,
      );
      if (!saved) throw new ConflictException('Ya enviaste esta calificación');
      return saved;
    });
  }
}
