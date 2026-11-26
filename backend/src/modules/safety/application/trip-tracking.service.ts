import {
  BadRequestException,
  ConflictException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  RouteGeometry,
  TripDriverLocationInput,
  TripTrackingView,
} from '@ruteam/contracts';
import {
  canShareCapturedPosition,
  positionIsVisible,
  positionMinimumIntervalMs,
} from '../domain/trip-tracking.policy.js';
import { TripTrackingRepository } from '../infrastructure/repositories/trip-tracking.repository.js';

@Injectable()
export class TripTrackingService {
  constructor(private readonly repository: TripTrackingRepository) {}

  async view(tripId: string, actorId: string): Promise<TripTrackingView> {
    const trip = await this.repository.forActiveParticipant(tripId, actorId);
    if (!trip)
      throw new NotFoundException(
        'No tienes acceso a un viaje en curso con ese identificador',
      );
    const canShare = trip.driverId === actorId;
    const position = trip.driverPosition;
    if (!position || !positionIsVisible(new Date(), position))
      return { canShare, sample: null, route: null };
    const coordinates = (
      point: typeof position | (typeof trip.stops)[number],
    ) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    });
    return {
      canShare,
      sample: {
        ...coordinates(position),
        capturedAt: position.capturedAt.toISOString(),
        sharedAt: position.sharedAt.toISOString(),
      },
      route: {
        geometry: trip.routeGeometry as RouteGeometry | null,
        stops: trip.stops.map(coordinates),
      },
    };
  }

  share(tripId: string, actorId: string, data: TripDriverLocationInput) {
    return this.repository.withActiveDriverLock(
      tripId,
      actorId,
      async (unit) => {
        const now = new Date();
        const capturedAt = new Date(data.capturedAt);
        if (!canShareCapturedPosition(now, capturedAt))
          throw new BadRequestException(
            'La ubicación debe haberse capturado en este momento',
          );
        const last = await unit.last();
        if (
          last &&
          now.getTime() - last.sharedAt.getTime() < positionMinimumIntervalMs
        )
          throw new HttpException(
            'Espera un momento antes de actualizar la ubicación',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        if (last && capturedAt < last.capturedAt)
          throw new ConflictException(
            'La ubicación es anterior al último punto compartido',
          );
        return unit.save({
          latitude: data.latitude,
          longitude: data.longitude,
          capturedAt,
          sharedAt: now,
        });
      },
    );
  }

  forget(tripId: string, actorId: string) {
    return this.repository.withActiveDriverLock(tripId, actorId, (unit) =>
      unit.clear(),
    );
  }
}
