import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { ReservationUnit } from '../infrastructure/repositories/reservations.repository.js';
import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import { tripDirection } from '../../trips/domain/models/driver-route.js';
import { presentStops } from '../../trips/infrastructure/repositories/trips.repository.js';

export type BookableTrip = Awaited<ReturnType<ReservationUnit['trip']>>;
export function checkDriver(trip: BookableTrip, now: Date): void {
  if (
    trip.driver.disabledAt ||
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
export function checkOpen(trip: BookableTrip, now: Date): void {
  if (
    !trip.routeDescription ||
    !tripDirection(presentStops(trip)) ||
    trip.status !== 'PROGRAMADO' ||
    trip.departureAt <= now
  )
    throw new ConflictException('El viaje ya no admite participaciones');
}
export async function checkMembers(
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
