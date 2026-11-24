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
@Injectable()
export class ViajeService {
  constructor(
    private readonly repository: ViajeRepository,
    private readonly routing: OsrmRoutingProvider,
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
          !isActiveMembership(actor.membership, now) ||
          !VehiculoPolicy.esPublicable(actor.driverEligibility, now)
        )
          throw new ForbiddenException(
            'Se requiere afiliación activa y licencia aprobada',
          );
        return resolveRouteStops(input, unit);
      },
    );
    return this.routing.options(stops);
  }
  reglas() {
    return this.repository.reglas();
  }
  publicarViaje(driverId: string, data: PublishTripDto) {
    return this.repository.withDriverLock(driverId, async (unit) => {
      const now = new Date();
      const end = Viaje.validarPublicacion(
        { ...data, stops: data.stops ?? [] },
        now,
      );
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
      if (
        data.itinerary &&
        (data.origin !== undefined ||
          data.destinationId !== undefined ||
          data.stops !== undefined)
      )
        throw new BadRequestException(
          'Envía un itinerario o el formato anterior de publicación',
        );
      const itinerary = data.itinerary
        ? await planItinerary(data.itinerary, unit)
        : undefined;
      if (!itinerary) {
        const destination =
          data.destinationId && (await unit.destination(data.destinationId));
        if (
          !destination ||
          !destination.active ||
          destination.campus !== 'USC' ||
          destination.kind === 'CAMPUS' ||
          destination.latitude === null ||
          destination.longitude === null
        )
          throw new BadRequestException(
            'Destino debe ser un punto USC activo del catálogo',
          );
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
