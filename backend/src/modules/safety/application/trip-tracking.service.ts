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
  TripDriverLocationStopInput,
  TripTrackingView,
} from '@ruteam/contracts';
import {
  canShareCapturedPosition,
  positionIsVisible,
  positionLifetimeMs,
  positionMinimumIntervalMs,
  positionClockAheadMs,
} from '../domain/trip-tracking.policy.js';
import { TripTrackingRepository } from '../infrastructure/repositories/trip-tracking.repository.js';

@Injectable()
export class TripTrackingService {
  constructor(private readonly repository: TripTrackingRepository) {}

  async view(tripId: string, actorId: string): Promise<TripTrackingView> {
    const trip = await this.repository.forActiveParticipant(tripId, actorId);
    if (!trip) {
      if (await this.repository.endedForParticipant(tripId, actorId))
        return { state: 'ENDED', canShare: false, sample: null, route: null };
      throw new NotFoundException(
        'No tienes acceso a un viaje en curso con ese identificador',
      );
    }
    const canShare = trip.driverId === actorId;
    const position = trip.driverPosition;
    if (!position || !positionIsVisible(new Date(), position))
      return {
        state: trip.trackingSharedAt ? 'STALE' : 'NOT_SHARED',
        canShare,
        sample: null,
        route: null,
      };
    const coordinates = (
      point: typeof position | (typeof trip.stops)[number],
    ) => ({
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    });
    return {
      state: 'AVAILABLE',
      expiresAt: new Date(
        Math.min(position.capturedAt.getTime(), position.sharedAt.getTime()) +
          positionLifetimeMs,
      ).toISOString(),
      canShare,
      sample: {
        ...coordinates(position),
        capturedAt: position.capturedAt.toISOString(),
        sharedAt: position.sharedAt.toISOString(),
        ...(position.accuracyMeters !== null && {
          accuracyMeters: Number(position.accuracyMeters),
        }),
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
        if (unit.revokedThrough && capturedAt <= unit.revokedThrough)
          throw new ConflictException(
            'La muestra se capturó antes de detener la compartición',
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
          accuracyMeters: data.accuracyMeters ?? null,
        });
      },
    );
  }

  forget(tripId: string, actorId: string, data?: TripDriverLocationStopInput) {
    return this.repository.withActiveDriverLock(tripId, actorId, (unit) => {
      if (!data?.throughCapturedAt) return unit.clear();
      const cutoff = Date.parse(data.throughCapturedAt);
      if (!Number.isFinite(cutoff))
        throw new BadRequestException('La hora de captura es inválida');
      return unit.clear(
        new Date(Math.min(cutoff, Date.now() + positionClockAheadMs)),
      );
    });
  }
}
