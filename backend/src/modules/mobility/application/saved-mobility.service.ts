import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  FrequentPlaceInput,
  FrequentPlaceView,
  SavedTripView,
} from '@ruteam/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import {
  presentStops,
  searchableInclude,
  type SearchableTrip,
} from '../../trips/infrastructure/repositories/trips.repository.js';
import {
  allowsSegment,
  tripDirection,
} from '../../trips/domain/models/driver-route.js';
import { segmentWindow } from '../../trips/domain/activity-window.js';
import { hasActivityConflict } from '../../trips/infrastructure/student-schedule.js';
import { recommendationActorEligible } from '../domain/mobility.policy.js';
import { recordTripNotice } from '../infrastructure/trip-notices.js';
import {
  SavedMobilityRepository,
  type SavedTripRow,
} from '../infrastructure/repositories/saved-mobility.repository.js';
import { candidateAvailable, marketOpen } from './mobility.service.js';

function placeView(row: {
  id: string;
  kind: string;
  name: string;
  placeLabel: string;
  latitude: Prisma.Decimal;
  longitude: Prisma.Decimal;
}): FrequentPlaceView {
  return {
    ...row,
    kind: row.kind as FrequentPlaceView['kind'],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
  };
}

function placeData(input: FrequentPlaceInput): FrequentPlaceInput {
  const name = input.name.trim();
  const placeLabel = input.placeLabel.trim();
  if (name.length < 2 || placeLabel.length < 2)
    throw new BadRequestException(
      'Indica un nombre y una referencia para tu lugar',
    );
  return { ...input, name, placeLabel };
}

async function confirmed(
  tx: Prisma.TransactionClient,
  userId: string,
  tripId: string,
) {
  return !!(await tx.reservationMember.findFirst({
    where: { userId, reservation: { tripId, status: 'CONFIRMED' } },
    select: { userId: true },
  }));
}

async function hasConfirmableSegment(
  tx: Prisma.TransactionClient,
  userId: string,
  trip: SearchableTrip,
) {
  const stops = presentStops(trip);
  const checked = new Set<string>();
  for (const pickup of stops) {
    for (const dropoff of stops) {
      if (!allowsSegment(stops, pickup.id, dropoff.id)) continue;
      const window = segmentWindow(
        trip,
        { estimatedOffsetSeconds: pickup.estimatedOffsetSeconds ?? null },
        { estimatedOffsetSeconds: dropoff.estimatedOffsetSeconds ?? null },
      );
      const key = `${+window.start}:${+window.end}`;
      if (checked.has(key)) continue;
      checked.add(key);
      if (!(await hasActivityConflict(tx, userId, window, trip.id)))
        return true;
    }
  }
  return false;
}

@Injectable()
export class SavedMobilityService {
  constructor(
    private readonly repository: SavedMobilityRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  private view(row: SavedTripRow, booked: boolean, now: Date): SavedTripView {
    const { trip } = row;
    const canJoin = marketOpen(trip, now, this.env);
    const availability =
      trip.status === 'CANCELADO'
        ? 'CANCELLED'
        : trip.status === 'EN_CURSO'
          ? 'IN_PROGRESS'
          : trip.status === 'COMPLETADO'
            ? 'COMPLETED'
            : trip.status === 'INTERRUMPIDO'
              ? 'INTERRUPTED'
              : trip.expiredAt || trip.departureAt <= now
                ? 'EXPIRED'
                : !canJoin
                  ? 'UNAVAILABLE'
                  : trip.occupiedSeats >= trip.offeredSeats
                    ? 'FULL'
                    : 'AVAILABLE';
    return {
      tripId: trip.id,
      departureAt: trip.departureAt.toISOString(),
      estimatedDepartureAt: trip.estimatedDepartureAt?.toISOString() ?? null,
      direction: tripDirection(presentStops(trip)),
      availability,
      availableSeats:
        availability === 'AVAILABLE'
          ? trip.offeredSeats - trip.occupiedSeats
          : 0,
      alertRequested: canJoin && !booked && row.alertRequestedAt !== null,
      canRequestAlert: !booked && availability === 'FULL',
      createdAt: row.createdAt.toISOString(),
    };
  }

  async saved(userId: string) {
    const { rows, confirmed } = await this.repository.saved(userId);
    const now = new Date();
    return rows.map((row) => this.view(row, confirmed.has(row.tripId), now));
  }

  save(userId: string, tripId: string, requestAlert = false) {
    return this.repository.withTrip(tripId, async (tx) => {
      const now = new Date();
      const existing = await this.repository.findSaved(tx, userId, tripId);
      const trip =
        existing?.trip ??
        (await tx.trip.findUniqueOrThrow({
          where: { id: tripId },
          include: searchableInclude,
        }));
      const booked = await confirmed(tx, userId, tripId);
      if (existing && !requestAlert) return this.view(existing, booked, now);
      if (trip.driverId === userId || !marketOpen(trip, now, this.env))
        throw new ConflictException('El viaje ya no permite guardar interés');
      if (requestAlert && (booked || trip.offeredSeats > trip.occupiedSeats))
        throw new ConflictException(
          'El aviso está disponible para viajes llenos sin participación confirmada',
        );
      const alertRequestedAt = requestAlert
        ? (existing?.alertRequestedAt ?? now)
        : null;
      const saved = await tx.savedTrip.upsert({
        where: { userId_tripId: { userId, tripId } },
        create: { userId, tripId, alertRequestedAt },
        update: { alertRequestedAt },
        include: { trip: { include: searchableInclude } },
      });
      return this.view(saved, booked, now);
    });
  }

  async deliverAlerts(now: Date) {
    for (const { userId, tripId } of await this.repository.alertCandidates(
      now,
    )) {
      try {
        await this.repository.withTrip(tripId, async (tx) => {
          const row = await this.repository.findSaved(tx, userId, tripId);
          if (
            !row?.alertRequestedAt ||
            row.trip.offeredSeats <= row.trip.occupiedSeats
          )
            return;
          const actor = await tx.user.findUnique({
            where: { id: userId },
            include: { membership: true },
          });
          const eligible =
            candidateAvailable(row.trip, now, this.env) &&
            actor &&
            recommendationActorEligible(actor, this.env, now) &&
            row.trip.driverId !== userId &&
            !(await confirmed(tx, userId, tripId)) &&
            (await hasConfirmableSegment(tx, userId, row.trip));
          const claimed = await tx.savedTrip.updateMany({
            where: { tripId, userId, alertRequestedAt: row.alertRequestedAt },
            data: { alertRequestedAt: null },
          });
          if (claimed.count && eligible)
            await recordTripNotice(
              tx,
              tripId,
              'SEAT_AVAILABLE',
              [userId],
              row.alertRequestedAt.toISOString(),
            );
        });
      } catch (error) {
        if (!(error instanceof NotFoundException)) throw error;
      }
    }
  }

  remove(userId: string, tripId: string) {
    return this.repository.remove(userId, tripId);
  }

  cancelAlert(userId: string, tripId: string) {
    return this.repository.cancelAlert(userId, tripId);
  }

  async places(userId: string) {
    return (await this.repository.places(userId)).map(placeView);
  }

  async createPlace(userId: string, input: FrequentPlaceInput) {
    return placeView(
      await this.repository.createPlace(userId, placeData(input)),
    );
  }

  async updatePlace(userId: string, id: string, input: FrequentPlaceInput) {
    const [row] = await this.repository.updatePlace(
      userId,
      id,
      placeData(input),
    );
    if (!row) throw new NotFoundException('Lugar inexistente');
    return placeView(row);
  }

  async removePlace(userId: string, id: string) {
    if (!(await this.repository.removePlace(userId, id)).count)
      throw new NotFoundException('Lugar inexistente');
  }
}
