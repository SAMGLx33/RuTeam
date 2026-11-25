import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { TripAction } from '@ruteam/contracts';
import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import {
  allowsSegment,
  tripDirection,
} from '../../trips/domain/models/driver-route.js';
import { presentStops } from '../../trips/infrastructure/repositories/trips.repository.js';
import type { ConfirmParticipationDto } from '../dto/reservation.dto.js';
import {
  ReservationsRepository,
  reservationView,
  type ReservationUnit,
} from '../infrastructure/repositories/reservations.repository.js';

type BookableTrip = Awaited<ReturnType<ReservationUnit['trip']>>;
function checkDriver(trip: BookableTrip, now: Date): void {
  if (
    !isActiveMembership(trip.driver.membership, now) ||
    !VehiculoPolicy.esPublicable(trip.vehicle.document, trip.expectedEndAt) ||
    !VehiculoPolicy.esPublicable(
      trip.driver.driverEligibility,
      trip.expectedEndAt,
    ) ||
    (trip.driver.driverEligibility?.category !== 'BOTH' &&
      trip.driver.driverEligibility?.category !== trip.vehicle.type)
  )
    throw new ConflictException(
      'El conductor o el vehículo ya no están habilitados',
    );
}
function checkOpen(trip: BookableTrip, now: Date): void {
  if (
    !trip.routeDescription ||
    !tripDirection(presentStops(trip)) ||
    trip.status !== 'PROGRAMADO' ||
    trip.departureAt <= now
  )
    throw new ConflictException('El viaje ya no admite participaciones');
}
async function checkMembers(
  unit: ReservationUnit,
  memberIds: string[],
  now: Date,
) {
  const memberships = await unit.memberships(memberIds);
  if (
    memberships.length !== memberIds.length ||
    memberships.some((membership) => !isActiveMembership(membership, now))
  )
    throw new ForbiddenException('Se requiere condición de estudiante vigente');
}
const transitions = {
  START: { from: 'PROGRAMADO', to: 'EN_CURSO' },
  FINISH: { from: 'EN_CURSO', to: 'COMPLETADO' },
  CANCEL: { from: 'PROGRAMADO', to: 'CANCELADO' },
} as const;

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
      if (trip.driverId !== actorId)
        throw new ForbiddenException(
          'Sólo el conductor del viaje confirma el abordaje',
        );
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Participación inexistente');
      const now = new Date();
      // Ventana de presencia: 30 minutos antes de la salida hasta el final declarado.
      if (
        row.status !== 'CONFIRMED' ||
        row.quantity !== 1 ||
        (trip.status !== 'PROGRAMADO' && trip.status !== 'EN_CURSO') ||
        now.getTime() < trip.departureAt.getTime() - 30 * 60000 ||
        now >= trip.expectedEndAt
      )
        throw new ConflictException(
          'Abordaje disponible para participación individual confirmada desde 30 minutos antes de salir y hasta el final declarado',
        );
      checkDriver(trip, now);
      await checkMembers(
        unit,
        row.members.map(({ userId }) => userId),
        now,
      );
      if (row.boardedAt) return reservationView(row, actorId);
      return reservationView(await unit.board(id, now, actorId), actorId);
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
      if (trip.status === to)
        return { id: trip.id, status: to, occupiedSeats: trip.occupiedSeats };
      if (trip.status !== from)
        throw new ConflictException(
          'El estado actual no permite esa transición',
        );
      return unit.transition(actorId, to);
    });
  }
}
