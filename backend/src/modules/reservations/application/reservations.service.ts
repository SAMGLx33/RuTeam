import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  BoardingPass,
  CancellationReason,
  TripAction,
} from '@ruteam/contracts';

import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { departureState } from '../../trips/domain/departure-state.js';
import { tripWindow } from '../../trips/domain/activity-window.js';
import { hasActivityConflict } from '../../trips/infrastructure/student-schedule.js';
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
  env: Environment,
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
      departureState(trip, now, env.TRIP_EXPIRATION_GRACE_MINUTES) ===
        'EXPIRED' ||
      !originBoardingWindow(tripWindow(trip).start, tripWindow(trip).end, now)
    )
      throw new ConflictException(
        'Antes de iniciar sólo se registra abordaje en el origen dentro de la ventana de salida',
      );
    checkDriver(trip, now, env);
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
  INTERRUPT: { from: 'EN_CURSO', to: 'INTERRUMPIDO' },
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
  constructor(
    private readonly repository: ReservationsRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  delay(actorId: string, tripId: string, estimate: string) {
    return this.repository.withTripLock(
      tripId,
      async (unit, tx) => {
        const trip = await unit.trip();
        if (trip.driverId !== actorId)
          throw new ForbiddenException(
            'Sólo el conductor puede reportar una demora',
          );
        const now = new Date();
        if (
          trip.status !== 'PROGRAMADO' ||
          departureState(trip, now, this.env.TRIP_EXPIRATION_GRACE_MINUTES) ===
            'EXPIRED'
        )
          throw new ConflictException('El viaje ya no admite una demora');
        const at = new Date(estimate);
        if (trip.estimatedDepartureAt?.getTime() === +at)
          return { estimatedDepartureAt: at.toISOString() };
        if (
          at <= now ||
          at <= trip.departureAt ||
          +at > +trip.departureAt + 180 * 60_000
        )
          throw new BadRequestException(
            'La nueva estimación debe ser futura y hasta tres horas después de la salida programada',
          );
        const delayed = { ...trip, estimatedDepartureAt: at };
        checkDriver(delayed, now, this.env);
        if (await hasActivityConflict(tx, actorId, tripWindow(delayed), tripId))
          throw new ConflictException(
            'La demora coincide con otro desplazamiento del conductor',
          );
        if (await unit.delayedPassengerConflict(delayed))
          throw new ConflictException(
            'La demora coincide con otro desplazamiento de una persona confirmada',
          );
        await unit.shiftDeparture(actorId, at);
        return { estimatedDepartureAt: at.toISOString() };
      },
      true,
    );
  }

  async expireDue(now = new Date()) {
    const grace = this.env.TRIP_EXPIRATION_GRACE_MINUTES;
    const due = await this.repository.dueToExpire(
      new Date(+now - grace * 60_000),
    );
    for (const { id } of due) {
      await this.repository.withTripLock(id, async (unit) => {
        const trip = await unit.trip();
        if (!trip.expiredAt && departureState(trip, now, grace) === 'EXPIRED')
          await unit.expire(trip.driverId, now);
      });
    }
  }

  confirm(actorId: string, tripId: string, input: ConfirmParticipationDto) {
    return this.repository.withTripLock(
      tripId,
      async (unit) => {
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
        checkDriver(trip, now, this.env);
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
        if (await unit.conflictFor(actorId, trip, pickupId, dropoffId))
          throw new ConflictException(
            'Este tramo coincide con uno de tus desplazamientos confirmados',
          );
        if (trip.offeredSeats - trip.occupiedSeats < 1)
          throw new ConflictException('No hay plazas disponibles');
        await unit.addOccupiedSeats(1);
        const created = await unit.create(actorId, pickupId, dropoffId, now);
        await unit.notify('PARTICIPATION_CONFIRMED', [actorId], created.id);
        await unit.notify('PASSENGER_JOINED', [trip.driverId], created.id);
        return reservationView(created, actorId);
      },
      true,
    );
  }

  async cancel(actorId: string, id: string, reason?: CancellationReason) {
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
        row.boardedAt
      )
        throw new ConflictException(
          'Sólo puedes retirarte de un viaje programado que aún no ha iniciado y antes de abordar',
        );
      if (row.status === 'CONFIRMED') {
        await unit.addOccupiedSeats(-row.quantity);
        await unit.notify('PASSENGER_WITHDREW', [trip.driverId], id);
      }
      await unit.revokePass(id);
      return reservationView(
        await unit.changeStatus(id, 'CANCELLED', undefined, reason),
        actorId,
      );
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
      await checkBoarding(unit, trip, row, now, this.env);
      if (row.boardedAt) return reservationView(row, actorId);
      await unit.revokePass(id);
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
      await checkBoarding(unit, trip, row, now, this.env);
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
      await checkBoarding(unit, trip, row, now, this.env);
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

  async dropOff(actorId: string, id: string) {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId !== actorId)
        throw new ForbiddenException('Sólo el conductor registra el descenso');
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Participación inexistente');
      if (row.droppedOffAt) return reservationView(row, actorId);
      if (
        trip.status !== 'EN_CURSO' ||
        row.status !== 'CONFIRMED' ||
        row.quantity !== 1 ||
        !row.boardedAt ||
        row.noShowAt
      )
        throw new ConflictException(
          'El descenso requiere un abordaje en el viaje activo',
        );
      if (currentReachedStop(trip.stops)?.id !== row.dropoffId)
        throw new ConflictException(
          'Registra primero la llegada a la parada de descenso autorizada',
        );
      return reservationView(
        await unit.dropOff(id, new Date(), actorId, row.requesterId),
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
  transition(
    actorId: string,
    tripId: string,
    action: TripAction,
    reason?: CancellationReason,
    confirmedSafe?: boolean,
    confirmMissingDropoffs?: boolean,
  ) {
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId !== actorId)
        throw new ForbiddenException(
          'Sólo el conductor del viaje puede cambiar su estado',
        );
      if (action === 'INTERRUPT' && (!reason || !confirmedSafe))
        throw new BadRequestException(
          'Confirma que el viaje está detenido en un lugar seguro e indica el motivo',
        );
      if (
        (reason && action !== 'CANCEL' && action !== 'INTERRUPT') ||
        (confirmedSafe && action !== 'INTERRUPT') ||
        (confirmMissingDropoffs && action !== 'FINISH')
      )
        throw new BadRequestException(
          'Los datos de cierre no corresponden a esta transición',
        );
      const { from, to } = transitions[action];
      if (trip.status === to) return presentTransition(trip);
      if (trip.status !== from)
        throw new ConflictException(
          'El estado actual no permite esa transición',
        );
      const now = new Date();
      if (action === 'START') {
        if (
          departureState(trip, now, this.env.TRIP_EXPIRATION_GRACE_MINUTES) ===
          'EXPIRED'
        )
          throw new ConflictException(
            'La ventana para iniciar el viaje venció',
          );
        checkDriver(trip, now, this.env);
        const origin = trip.stops[0];
        if (!origin)
          throw new ConflictException('El viaje no tiene un origen registrado');
        return presentTransition(
          await unit.transition(actorId, to, now, origin.id),
        );
      }
      if (
        action === 'FINISH' &&
        !confirmMissingDropoffs &&
        (await unit.awaitingDropoff())
      )
        throw new ConflictException({
          code: 'TRIP_CLOSE_REQUIRES_CONFIRMATION',
          message: 'Confirma el cierre sin todos los descensos registrados',
        });
      return presentTransition(
        await unit.transition(actorId, to, now, undefined, reason),
      );
    });
  }
}
