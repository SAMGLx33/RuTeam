import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ViajeRepository } from '../infrastructure/repositories/trips.repository.js';
import { Viaje } from '../domain/models/viaje.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
import type { PublishTripDto } from '../dto/publish-trip.dto.js';
@Injectable()
export class ViajeService {
  constructor(private readonly repository: ViajeRepository) {}
  listarPropios(driverId: string) {
    return this.repository.listarPropios(driverId);
  }
  reglas() {
    return this.repository.reglas();
  }
  publicarViaje(driverId: string, data: PublishTripDto) {
    return this.repository.withDriverLock(driverId, async (unit) => {
      const now = new Date();
      const end = Viaje.validarPublicacion(data, now);
      const actor = await unit.actor();
      if (!actor || !isActiveMembership(actor.membership, now))
        throw new ForbiddenException('Afiliación USC no activa');
      const vehicle = await unit.vehicle(data.vehicleId);
      if (!vehicle || vehicle.ownerId !== driverId)
        throw new ForbiddenException(
          'El vehículo debe pertenecer al conductor',
        );
      if (
        !VehiculoPolicy.esPublicable(vehicle.document, end) ||
        !VehiculoPolicy.esPublicable(actor.driverEligibility, end)
      )
        throw new ForbiddenException(
          'SOAT o licencia DEMO pendientes, rechazados o sin vigencia para el viaje',
        );
      if (
        actor.driverEligibility?.category !== 'BOTH' &&
        actor.driverEligibility?.category !== vehicle.type
      )
        throw new ForbiddenException(
          'Licencia DEMO no habilita este tipo de vehículo',
        );
      if (data.offeredSeats > vehicle.passengerCapacity)
        throw new BadRequestException(
          'Cupos exceden la capacidad autorizada del vehículo',
        );
      VehiculoPolicy.validarCapacidad(vehicle.type, data.offeredSeats);
      if (
        (vehicle.type === 'MOTORCYCLE' &&
          typeof data.providesHelmet !== 'boolean') ||
        (vehicle.type === 'CAR' && data.providesHelmet != null)
      )
        throw new BadRequestException(
          'Casco debe declararse sólo para motocicleta',
        );
      const destination = await unit.destination(data.destinationId);
      if (!destination || !destination.active || destination.campus !== 'USC')
        throw new BadRequestException(
          'Destino debe ser un punto USC activo del catálogo',
        );
      const rules = await unit.rules(data.ruleIds);
      if (rules.length !== (data.ruleIds.length || 1))
        throw new BadRequestException('Reglas inexistentes o deshabilitadas');
      if (await unit.overlaps(new Date(data.departureAt), end))
        throw new ConflictException(
          'El conductor ya tiene un viaje superpuesto',
        );
      return unit.save(
        data,
        end,
        rules.map((rule) => rule.id),
      );
    });
  }
}
