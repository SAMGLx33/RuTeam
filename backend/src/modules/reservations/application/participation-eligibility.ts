import { ConflictException, ForbiddenException } from '@nestjs/common';
import type { ReservationUnit } from '../infrastructure/repositories/reservations.repository.js';
import {
  canSubmitDeclaredDocuments,
  locallyEligible,
  type AccessConfiguration,
} from '../../institutional-membership/domain/access-policy.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import { tripWindow } from '../../trips/domain/activity-window.js';
import { tripDirection } from '../../trips/domain/models/driver-route.js';
import { presentStops } from '../../trips/infrastructure/repositories/trips.repository.js';

export type BookableTrip = Awaited<ReturnType<ReservationUnit['trip']>>;
export function checkDriver(
  trip: BookableTrip,
  now: Date,
  access: AccessConfiguration,
): void {
  const documents = canSubmitDeclaredDocuments(trip.driver, access);
  if (
    !locallyEligible(trip.driver, access, now) ||
    (!trip.driver.demoIdentity &&
      (trip.vehicle.document?.demo || trip.driver.driverEligibility?.demo)) ||
    !VehiculoPolicy.esPublicable(
      trip.vehicle.document,
      tripWindow(trip).end,
      documents,
    ) ||
    !VehiculoPolicy.esPublicable(
      trip.driver.driverEligibility,
      tripWindow(trip).end,
      documents,
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
    trip.expiredAt ||
    trip.departureAt <= now
  )
    throw new ConflictException('El viaje ya no admite participaciones');
}
export async function checkMembers(
  unit: ReservationUnit,
  memberIds: string[],
  now: Date,
) {
  const eligible = await unit.eligibleMembers(memberIds, now);
  if (eligible.length !== memberIds.length)
    throw new ForbiddenException(
      'Una cuenta no reúne las condiciones de acceso a RuTeam',
    );
}
