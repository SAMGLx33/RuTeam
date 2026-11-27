import type { VehicleEnergyProfile } from '@ruteam/contracts';
import { snapshotEnergy } from '../../mobility/domain/emissions.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import {
  ViajeRepository,
  type PublicationUnit,
} from '../infrastructure/repositories/trips.repository.js';
import { Viaje } from '../domain/models/viaje.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
import { calculateEconomics } from '../../expenses/domain/expense-policy.js';
import type { PublishTripDto } from '../dto/publish-trip.dto.js';
import {
  planItinerary,
  resolveRouteStops,
  type PlannedItinerary,
} from './plan-itinerary.js';
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
    return this.repository.withDriverLock(driverId, (unit) =>
      this.publishWithinLock(driverId, data, unit, new Date()),
    );
  }

  signSavedRoute(driverId: string, trip: PlannedItinerary, minutes: number) {
    if (!trip.geometry || !trip.distanceMeters) return undefined;
    const offsets = trip.stops.map(
      ({ estimatedOffsetSeconds }) => estimatedOffsetSeconds,
    );
    if (offsets.some((offset) => offset == null)) return undefined;
    const legDurationsSeconds = offsets
      .slice(1)
      .map((offset, index) => offset! - offsets[index]!);
    if (legDurationsSeconds.some((value) => value < 0)) return undefined;
    return this.selections.offer(driverId, trip.stops, {
      distanceMeters: trip.distanceMeters,
      geometry: trip.geometry,
      durationMinutes: minutes,
      legDurationsSeconds,
    }).routingSelection;
  }

  async prepareRoute(
    driverId: string,
    data: Omit<PublishTripDto, 'departureAt'>,
    unit: PublicationUnit,
  ) {
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
    return itinerary;
  }

  async publicationTerms(
    driverId: string,
    data: Omit<PublishTripDto, 'departureAt'>,
    unit: PublicationUnit,
    now: Date,
    end: Date,
  ) {
    const actor = await unit.actor();
    if (
      !actor ||
      actor.disabledAt ||
      !isActiveMembership(actor.membership, now)
    )
      throw new ForbiddenException('Afiliación USC no activa');
    const vehicle = await unit.vehicle(data.vehicleId);
    if (!vehicle || vehicle.ownerId !== driverId)
      throw new ForbiddenException('El vehículo debe pertenecer al conductor');
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
    const rules = await unit.rules(data.ruleIds);
    if (rules.length !== (data.ruleIds.length || 1))
      throw new BadRequestException('Reglas inexistentes o deshabilitadas');
    return {
      energy: snapshotEnergy(
        vehicle.energyProfile as unknown as VehicleEnergyProfile | null,
      ),
      ruleIds: rules.map(({ id }) => id),
      economics: calculateEconomics(data.offeredSeats, data.economics),
    };
  }

  async publishWithinLock(
    driverId: string,
    data: PublishTripDto,
    unit: PublicationUnit,
    now: Date,
    trustedRoute?: PlannedItinerary,
  ) {
    const end = Viaje.validarPublicacion({ ...data, stops: [] }, now);
    const { ruleIds, economics, energy } = await this.publicationTerms(
      driverId,
      data,
      unit,
      now,
      end,
    );
    if (await unit.overlaps(new Date(data.departureAt), end))
      throw new ConflictException('El conductor ya tiene un viaje superpuesto');
    const itinerary =
      trustedRoute ?? (await this.prepareRoute(driverId, data, unit));
    return unit.save(data, end, ruleIds, itinerary, economics, energy);
  }
}
