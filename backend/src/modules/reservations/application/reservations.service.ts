import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { BoardingPass, TripAction } from '@ruteam/contracts';

import { allowsSegment } from '../../trips/domain/models/driver-route.js';
import { presentStops } from '../../trips/infrastructure/repositories/trips.repository.js';
import {
  checkDriver,
  checkMembers,
  checkOpen,
  type BookableTrip,
} from './participation-eligibility.js';
import type { ConfirmParticipationDto } from '../dto/reservation.dto.js';
import {
  currentReachedStop,
  isNextStop,
  originBoardingWindow,
} from '../domain/trip-progress.js';
import {
  ReservationsRepository,
  reservationView,
  type ReservationUnit,
} from '../infrastructure/repositories/reservations.repository.js';

import {
  createBoardingPass,
  hashBoardingPass,
} from '../infrastructure/boarding-pass-token.js';

type BoardableReservation = NonNullable<
  Awaited<ReturnType<ReservationUnit['find']>>
>;

async function checkBoarding(
  unit: ReservationUnit,
  trip: BookableTrip,
  row: BoardableReservation,
  now: Date,
): Promise<void> {
  if (
    row.status !== 'CONFIRMED' ||
    row.quantity !== 1 ||
    row.noShowAt ||
    (trip.status !== 'PROGRAMADO' && trip.status !== 'EN_CURSO')
  )
    throw new ConflictException(
      'El abordaje requiere una participación individual confirmada',
    );
  if (trip.status === 'PROGRAMADO') {
    if (
      row.pickupId !== trip.stops[0]?.id ||
      !originBoardingWindow(trip.departureAt, trip.expectedEndAt, now)
    )
      throw new ConflictException(
        'Antes de iniciar sólo se registra abordaje en el origen dentro de la ventana de salida',
      );
    checkDriver(trip, now);
  }
  await checkMembers(
    unit,
    row.members.map(({ userId }) => userId),
    now,
  );
  if (
    !row.boardedAt &&
    trip.status === 'EN_CURSO' &&
    currentReachedStop(trip.stops)?.id !== row.pickupId
  )
    throw new ConflictException(
      'Registra la llegada a la recogida antes del abordaje',
    );
}

function requireBoardingDriver(trip: BookableTrip, actorId: string): void {
  if (trip.driverId !== actorId)
    throw new ForbiddenException(
      'Sólo el conductor del viaje confirma el abordaje',
    );
}

const transitions = {
  START: { from: 'PROGRAMADO', to: 'EN_CURSO' },
  FINISH: { from: 'EN_CURSO', to: 'COMPLETADO' },
  CANCEL: { from: 'PROGRAMADO', to: 'CANCELADO' },
} as const;

function presentTransition(trip: {
  id: string;
  status: BookableTrip['status'];
  occupiedSeats: number;
  startedAt: Date | null;
  finishedAt: Date | null;
}) {
  return {
    id: trip.id,
    status: trip.status,
    occupiedSeats: trip.occupiedSeats,
    startedAt: trip.startedAt?.toISOString() ?? null,
    finishedAt: trip.finishedAt?.toISOString() ?? null,
  };
}

@Injectable()
export class ReservationsService {
  constructor(private readonly repository: ReservationsRepository) {}

  confirm(actorId: string, tripId: string, input: ConfirmParticipationDto) {
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId === actorId)
        throw new ForbiddenException(
          'El conductor no puede participar en su propio viaje',
        );
      const pickupId = input.pickupId.toLowerCase();
      const dropoffId = input.dropoffId.toLowerCase();
      if (!allowsSegment(presentStops(trip), pickupId, dropoffId))
        throw new BadRequestException(
          'Usa un encuentro y un descenso autorizados en el sentido del trayecto',
        );
      const now = new Date();
      checkOpen(trip, now);
      checkDriver(trip, now);
      await checkMembers(unit, [actorId], now);
      const existing = await unit.activeForMember(actorId);
      if (existing) {
        if (
          existing.requesterId === actorId &&
          existing.quantity === 1 &&
          existing.pickupId === pickupId &&
          existing.dropoffId === dropoffId
        )
          return reservationView(existing, actorId);
        throw new ConflictException(
          'Ya tienes una participación confirmada en este viaje',
        );
      }
      if (trip.offeredSeats - trip.occupiedSeats < 1)
        throw new ConflictException('No hay plazas disponibles');
      await unit.addOccupiedSeats(1);
      return reservationView(
        await unit.create(actorId, pickupId, dropoffId, now),
        actorId,
      );
    });
  }

  async cancel(actorId: string, id: string) {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Participación inexistente');
      if (row.requesterId !== actorId)
        throw new ForbiddenException(
          'Sólo el titular puede retirar su participación',
        );
      if (row.status === 'CANCELLED') return reservationView(row, actorId);
      const trip = await unit.trip();
      if (
        (row.status !== 'PENDING' && row.status !== 'CONFIRMED') ||
        trip.status !== 'PROGRAMADO' ||
        trip.departureAt <= new Date() ||
        row.boardedAt
      )
        throw new ConflictException(
          'Sólo puedes retirarte de un viaje futuro programado antes de abordar',
        );
      if (row.status === 'CONFIRMED')
        await unit.addOccupiedSeats(-row.quantity);
      return reservationView(await unit.changeStatus(id, 'CANCELLED'), actorId);
    });
  }

  async board(actorId: string, id: string) {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      requireBoardingDriver(trip, actorId);
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Participación inexistente');
      const now = new Date();
      await checkBoarding(unit, trip, row, now);
      if (row.boardedAt) return reservationView(row, actorId);
      return reservationView(await unit.board(id, now, actorId), actorId);
    });
  }

  async issueBoardingPass(actorId: string, id: string): Promise<BoardingPass> {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      const row = await unit.find(id);
      if (
        !row ||
        row.requesterId !== actorId ||
        !row.members.some(({ userId }) => userId === actorId)
      )
        throw new NotFoundException('Participación inexistente');
      const now = new Date();
      await checkBoarding(unit, trip, row, now);
      if (row.boardedAt)
        throw new ConflictException('El abordaje ya está registrado');
      const pass = createBoardingPass(now);
      await unit.issueBoardingPass(
        row.id,
        row.pickupId,
        pass.hash,
        pass.expiresAt,
      );
      return { code: pass.code, expiresAt: pass.expiresAt.toISOString() };
    });
  }

  redeemBoardingPass(actorId: string, tripId: string, code: string) {
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      requireBoardingDriver(trip, actorId);
      const now = new Date();
      const pass = await unit.boardingPass(hashBoardingPass(code));
      if (!pass || pass.consumedAt || pass.expiresAt <= now)
        throw new ConflictException(
          'El QR venció, ya se usó o no corresponde a este viaje',
        );
      const row = await unit.find(pass.reservationId);
      if (
        !row ||
        row.pickupId !== pass.pickupId ||
        row.boardedAt ||
        !row.members.some(({ userId }) => userId === row.requesterId)
      )
        throw new ConflictException(
          'El QR ya no corresponde a un abordaje pendiente',
        );
      await checkBoarding(unit, trip, row, now);
      const boarded = await unit.board(row.id, now, actorId);
      await unit.consumeBoardingPass(row.id, now);
      return reservationView(boarded, actorId);
    });
  }

  async noShow(actorId: string, id: string) {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId !== actorId)
        throw new ForbiddenException('Sólo el conductor registra la ausencia');
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Participación inexistente');
      if (
        trip.status !== 'EN_CURSO' ||
        row.status !== 'CONFIRMED' ||
        row.quantity !== 1 ||
        row.boardedAt
      )
        throw new ConflictException(
          'La participación no admite registrar ausencia',
        );
      if (row.noShowAt) return reservationView(row, actorId);
      if (currentReachedStop(trip.stops)?.id !== row.pickupId)
        throw new ConflictException(
          'Sólo se registra ausencia en la recogida alcanzada',
        );
      return reservationView(
        await unit.noShow(id, new Date(), actorId),
        actorId,
      );
    });
  }

  reachStop(actorId: string, tripId: string, stopId: string) {
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId !== actorId)
        throw new ForbiddenException('Sólo el conductor registra la llegada');
      if (trip.status !== 'EN_CURSO')
        throw new ConflictException(
          'Sólo se registran llegadas en un viaje en curso',
        );
      const stop = trip.stops.find(({ id }) => id === stopId.toLowerCase());
      if (!stop) throw new NotFoundException('Parada inexistente en el viaje');
      if (stop.reachedAt)
        return {
          id: stop.id,
          position: stop.position,
          reachedAt: stop.reachedAt.toISOString(),
        };
      if (!isNextStop(trip.stops, stop.id))
        throw new ConflictException(
          'Registra las paradas en el orden del recorrido',
        );
      const reachedAt = new Date();
      await unit.reachStop(stop.id, reachedAt, actorId);
      return {
        id: stop.id,
        position: stop.position,
        reachedAt: reachedAt.toISOString(),
      };
    });
  }

  forMember(actorId: string) {
    return this.repository.forMember(actorId);
  }
  async forDriver(actorId: string, tripId: string) {
    const rows = await this.repository.forDriver(actorId, tripId);
    if (rows === null)
      throw new ForbiddenException('Se requiere ser conductor del viaje');
    return rows;
  }
  transition(actorId: string, tripId: string, action: TripAction) {
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId !== actorId)
        throw new ForbiddenException(
          'Sólo el conductor del viaje puede cambiar su estado',
        );
      const { from, to } = transitions[action];
      if (trip.status === to) return presentTransition(trip);
      if (trip.status !== from)
        throw new ConflictException(
          'El estado actual no permite esa transición',
        );
      const now = new Date();
      if (action === 'START') {
        checkDriver(trip, now);
        const origin = trip.stops[0];
        if (!origin)
          throw new ConflictException('El viaje no tiene un origen registrado');
        return presentTransition(
          await unit.transition(actorId, to, now, origin.id),
        );
      }
      return presentTransition(await unit.transition(actorId, to, now));
    });
  }
}
