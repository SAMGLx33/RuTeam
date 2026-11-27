import { Injectable, NotFoundException } from '@nestjs/common';
import { activeTripSafetyContext } from '../domain/trip-safety-context.js';
import { TripSafetyRepository } from '../infrastructure/repositories/trip-safety.repository.js';

@Injectable()
export class TripSafetyService {
  constructor(private readonly repository: TripSafetyRepository) {}

  async context(tripId: string, actorId: string) {
    const trip = await this.repository.activeTripVisibleTo(tripId, actorId);
    if (!trip)
      throw new NotFoundException(
        'No tienes acceso a un viaje en curso con ese identificador',
      );
    return activeTripSafetyContext(trip);
  }
}
