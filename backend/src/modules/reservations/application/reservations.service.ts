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
import { allowsSegment } from '../../trips/domain/models/driver-route.js';
import { presentStops } from '../../trips/infrastructure/repositories/trips.repository.js';
import type {
  RequestReservationDto,
  ReservationDecisionDto,
} from '../dto/reservation.dto.js';
import {
  ReservationsRepository,
  reservationView,
  type ReservationUnit,
} from '../infrastructure/repositories/reservations.repository.js';

type BookableTrip = Awaited<ReturnType<ReservationUnit['trip']>>;
function checkAvailability(
  trip: BookableTrip,
  quantity: number,
  now: Date,
): void {
  if (
    !trip.routeDescription ||
    trip.status !== 'PROGRAMADO' ||
    trip.departureAt <= now
  )
    throw new ConflictException('El viaje ya no admite solicitudes');
  if (trip.offeredSeats - trip.occupiedSeats < quantity)
    throw new ConflictException('No hay cupos suficientes');
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
    throw new ForbiddenException('El grupo requiere afiliaciones activas');
}

const transitions = {
  START: { from: 'PROGRAMADO', to: 'EN_CURSO' },
  FINISH: { from: 'EN_CURSO', to: 'COMPLETADO' },
  CANCEL: { from: 'PROGRAMADO', to: 'CANCELADO' },
} as const;

@Injectable()
export class ReservationsService {
  constructor(private readonly repository: ReservationsRepository) {}

  request(actorId: string, tripId: string, input: RequestReservationDto) {
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      const memberIds = input.memberIds.map((id) => id.toLowerCase());
      if (
        new Set(memberIds).size !== memberIds.length ||
        !memberIds.includes(actorId) ||
        memberIds.includes(trip.driverId)
      )
        throw new BadRequestException(
          'Incluye al solicitante una vez y excluye al conductor del grupo',
        );
      const pickupId = input.pickupId.toLowerCase();
      const dropoffId = input.dropoffId.toLowerCase();
      if (!allowsSegment(presentStops(trip), pickupId, dropoffId))
        throw new BadRequestException(
          'Usa un abordaje y un descenso autorizados en el sentido del trayecto',
        );
      const now = new Date();
      checkAvailability(trip, memberIds.length, now);
      await checkMembers(unit, memberIds, now);
      if (await unit.hasActiveMembers(memberIds))
        throw new ConflictException(
          'El grupo incluye a un participante con solicitud activa en el viaje',
        );
      return reservationView(
        await unit.create(actorId, memberIds, pickupId, dropoffId),
        actorId,
      );
    });
  }

  async decide(
    actorId: string,
    id: string,
    decision: ReservationDecisionDto['decision'],
  ) {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const trip = await unit.trip();
      if (trip.driverId !== actorId)
        throw new ForbiddenException('Sólo el conductor del viaje decide');
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Solicitud inexistente');
      const target = decision === 'ACCEPT' ? 'CONFIRMED' : 'REJECTED';
      if (row.status === target) return reservationView(row, actorId);
      if (row.status !== 'PENDING')
        throw new ConflictException('La solicitud ya fue resuelta');
      if (target === 'REJECTED')
        return reservationView(await unit.changeStatus(id, target), actorId);
      const now = new Date();
      checkAvailability(trip, row.quantity, now);
      if (!allowsSegment(presentStops(trip), row.pickupId, row.dropoffId))
        throw new ConflictException(
          'Las paradas de la solicitud ya no están habilitadas',
        );
      await checkMembers(
        unit,
        row.members.map(({ userId }) => userId),
        now,
      );
      await unit.addOccupiedSeats(row.quantity);
      return reservationView(await unit.changeStatus(id, target, now), actorId);
    });
  }

  async cancel(actorId: string, id: string) {
    const tripId = await this.repository.tripForRequest(id);
    return this.repository.withTripLock(tripId, async (unit) => {
      const row = await unit.find(id);
      if (!row) throw new NotFoundException('Solicitud inexistente');
      if (row.requesterId !== actorId)
        throw new ForbiddenException(
          'Sólo el solicitante puede retirar su solicitud',
        );
      if (row.status === 'CANCELLED') return reservationView(row, actorId);
      if (row.status !== 'PENDING')
        throw new ConflictException(
          'El retiro está disponible para solicitudes pendientes',
        );
      return reservationView(await unit.changeStatus(id, 'CANCELLED'), actorId);
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
