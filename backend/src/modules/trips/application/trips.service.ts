import { tripWindow } from '../domain/activity-window.js';
import type { EditTripDto } from '../dto/edit-trip.dto.js';
import type { VehicleEnergyProfile } from '@ruteam/contracts';
import { snapshotEnergy } from '../../mobility/domain/emissions.js';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  ViajeRepository,
  type PublicationUnit,
} from '../infrastructure/repositories/trips.repository.js';
import { Viaje } from '../domain/models/viaje.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import { Inject } from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import {
  canSubmitDeclaredDocuments,
  locallyEligible,
} from '../../institutional-membership/domain/access-policy.js';
import { calculateEconomics } from '../../expenses/domain/expense-policy.js';
import type { PublishTripDto } from '../dto/publish-trip.dto.js';
import {
  planItinerary,
  assertPublicationCampus,
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
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  listarPropios(driverId: string) {
    return this.repository.listarPropios(driverId);
  }
  buscar(actorId: string, data: SearchTripsDto) {
    return searchTrips(this.repository, actorId, data, this.env);
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
          !locallyEligible(actor, this.env, now) ||
          !VehiculoPolicy.esPublicable(
            actor.driverEligibility,
            now,
            canSubmitDeclaredDocuments(actor, this.env),
          )
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

  edit(driverId: string, tripId: string, data: EditTripDto) {
    return this.repository.withDriverLock(driverId, async (unit) => {
      const current = await unit.editable(tripId);
      if (!current)
        throw new NotFoundException('Publicación propia inexistente');
      const now = new Date();
      if (
        current.status !== 'PROGRAMADO' ||
        current.departureAt <= now ||
        current.expiredAt
      )
        throw new ConflictException(
          'Sólo se editan publicaciones futuras sin iniciar',
        );
      if (current.version !== data.version)
        throw new ConflictException(
          'La publicación cambió. Vuelve a cargarla antes de editar',
        );
      if ((data.publication === undefined) === (data.description === undefined))
        throw new BadRequestException(
          'Envía la descripción o la publicación completa',
        );
      if (data.description !== undefined) {
        await this.publicationVehicle(
          driverId,
          current,
          unit,
          now,
          tripWindow(current).end,
        );
        const description = data.description.trim();
        if (description.length < 2)
          throw new BadRequestException('Describe el recorrido');
        return unit.describe(tripId, description);
      }
      if (Object.values(current._count).some((count) => count > 0))
        throw new ConflictException(
          'Las participaciones, grupos o propuestas existentes conservan sus condiciones. Edita la descripción o cancela y publica de nuevo',
        );
      const publication = data.publication!;
      const end = Viaje.validarPublicacion({ ...publication, stops: [] }, now);
      const { ruleIds, economics, energy } = await this.publicationTerms(
        driverId,
        publication,
        unit,
        now,
        end,
      );
      if (await unit.overlaps(new Date(publication.departureAt), end, tripId))
        throw new ConflictException(
          'El conductor ya tiene un desplazamiento superpuesto',
        );
      const itinerary = await this.prepareRoute(driverId, publication, unit);
      return unit.save(
        publication,
        end,
        ruleIds,
        itinerary,
        economics,
        energy,
        tripId,
      );
    });
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
      maneuvers: trip.maneuvers,
    }).routingSelection;
  }

  async prepareRoute(
    driverId: string,
    data: Omit<PublishTripDto, 'departureAt'>,
    unit: PublicationUnit,
  ) {
    const itinerary = await planItinerary(data.itinerary, unit);
    if (data.itinerary.maneuvers && !data.itinerary.routingSelection)
      throw new BadRequestException(
        'Selecciona una alternativa vial para publicar sus indicaciones.',
      );
    if (data.itinerary.routingSelection) {
      const selected = this.selections.verify(
        data.itinerary.routingSelection,
        driverId,
        itinerary.stops,
        itinerary.geometry,
        data.estimatedDurationMinutes,
        Date.now(),
        data.itinerary.maneuvers,
      );
      itinerary.maneuvers = selected.maneuvers;
      let elapsed = 0;
      for (const [index, stop] of itinerary.stops.entries()) {
        stop.estimatedOffsetSeconds = elapsed;
        elapsed += selected.legs[index] ?? 0;
      }
      itinerary.distanceMeters = selected.distance;
    }
    return itinerary;
  }

  private async publicationVehicle(
    driverId: string,
    data: Pick<PublishTripDto, 'vehicleId' | 'offeredSeats'> & {
      providesHelmet?: boolean | null;
    },
    unit: PublicationUnit,
    now: Date,
    end: Date,
  ) {
    const actor = await unit.actor();
    if (!actor || actor.disabledAt || !locallyEligible(actor, this.env, now))
      throw new ForbiddenException('Afiliación USC no activa');
    const vehicle = await unit.vehicle(data.vehicleId);
    if (!vehicle || vehicle.ownerId !== driverId)
      throw new ForbiddenException('El vehículo debe pertenecer al conductor');
    const declaredDocuments = canSubmitDeclaredDocuments(actor, this.env);
    if (
      (!actor.demoIdentity &&
        (vehicle.document?.demo || actor.driverEligibility?.demo)) ||
      !VehiculoPolicy.esPublicable(vehicle.document, end, declaredDocuments) ||
      !VehiculoPolicy.esPublicable(
        actor.driverEligibility,
        end,
        declaredDocuments,
      )
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
    return vehicle;
  }

  async publicationTerms(
    driverId: string,
    data: Omit<PublishTripDto, 'departureAt'>,
    unit: PublicationUnit,
    now: Date,
    end: Date,
  ) {
    const vehicle = await this.publicationVehicle(
      driverId,
      data,
      unit,
      now,
      end,
    );
    const rules = data.ruleIds.length ? await unit.rules(data.ruleIds) : [];
    if (rules.length !== data.ruleIds.length)
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
      throw new ConflictException(
        'El conductor ya tiene un desplazamiento superpuesto',
      );
    const itinerary =
      trustedRoute ?? (await this.prepareRoute(driverId, data, unit));
    await this.checkPublicationCampus(itinerary, unit);
    return unit.save(data, end, ruleIds, itinerary, economics, energy);
  }

  checkPublicationCampus(itinerary: PlannedItinerary, unit: PublicationUnit) {
    return assertPublicationCampus(itinerary.stops, unit, this.env.demo);
  }
}
