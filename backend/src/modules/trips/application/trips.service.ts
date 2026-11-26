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
import { planItinerary, resolveRouteStops } from './plan-itinerary.js';
import { searchTrips } from './search-trips.js';
import type { SearchTripsDto } from '../dto/search-trips.dto.js';
import type { RouteOptionsDto } from '../dto/itinerary.dto.js';
import { OsrmRoutingProvider } from '../infrastructure/routing/osrm-routing.provider.js';
import { RoutingSelections } from './routing-selections.js';
@Injectable()
export class ViajeService {
  constructor(
    private readonly repository: ViajeRepository,
    private readonly routing: OsrmRoutingProvider,
    private readonly selections: RoutingSelections,
  ) {}
  listarPropios(driverId: string) {
    return this.repository.listarPropios(driverId);
  }
  buscar(actorId: string, data: SearchTripsDto) {
    return searchTrips(this.repository, actorId, data);
  }
  async opcionesDeRuta(driverId: string, input: RouteOptionsDto) {
    const stops = await this.repository.withDriverLock(
      driverId,
      async (unit) => {
        const actor = await unit.actor();
        const now = new Date();
        if (
          !actor ||
          !!actor.disabledAt ||
          !isActiveMembership(actor.membership, now) ||
          !VehiculoPolicy.esPublicable(actor.driverEligibility, now)
        )
          throw new ForbiddenException(
            'Se requiere afiliación activa y documentación habilitada',
          );
        return resolveRouteStops(input, unit);
      },
    );
    const options = await this.routing.options(stops);
    return options.map((option) =>
      this.selections.offer(driverId, stops, option),
    );
  }
  reglas() {
    return this.repository.reglas();
  }
  publicarViaje(driverId: string, data: PublishTripDto) {
    return this.repository.withDriverLock(driverId, async (unit) => {
      const now = new Date();
      const end = Viaje.validarPublicacion({ ...data, stops: [] }, now);
      const actor = await unit.actor();
      if (
        !actor ||
        actor.disabledAt ||
        !isActiveMembership(actor.membership, now)
      )
        throw new ForbiddenException('Afiliación USC no activa');
      const vehicle = await unit.vehicle(data.vehicleId);
      if (!vehicle || vehicle.ownerId !== driverId)
        throw new ForbiddenException(
          'El vehículo debe pertenecer al conductor',
        );
      if (
        (!actor.demoIdentity &&
          (vehicle.document?.demo || actor.driverEligibility?.demo)) ||
        !VehiculoPolicy.esPublicable(vehicle.document, end) ||
        !VehiculoPolicy.esPublicable(actor.driverEligibility, end)
      )
        throw new ForbiddenException(
          'SOAT o licencia sin elegibilidad o vigencia para el viaje',
        );
      if (
        actor.driverEligibility?.category !== 'BOTH' &&
        actor.driverEligibility?.category !== vehicle.type
      )
        throw new ForbiddenException(
          'La licencia no habilita este tipo de vehículo',
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
      const itinerary = await planItinerary(data.itinerary, unit);
      if (data.itinerary.routingSelection) {
        const selected = this.selections.verify(
          data.itinerary.routingSelection,
          driverId,
          itinerary.stops,
          itinerary.geometry,
          data.estimatedDurationMinutes,
        );
        let elapsed = 0;
        for (const [index, stop] of itinerary.stops.entries()) {
          stop.estimatedOffsetSeconds = elapsed;
          elapsed += selected.legs[index] ?? 0;
        }
        itinerary.distanceMeters = selected.distance;
      }
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
        itinerary,
      );
    });
  }
}
