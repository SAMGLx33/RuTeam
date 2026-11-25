import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RouteGeometry } from '@ruteam/contracts';
import {
  pickupInsertionPosition,
  tripDirection,
} from '../domain/models/driver-route.js';
import type {
  PickupDecisionDto,
  PickupProposalDto,
} from '../dto/pickup-proposal.dto.js';
import {
  PickupProposalsRepository,
  proposalView,
  type ProposalUnit,
} from '../infrastructure/repositories/pickup-proposals.repository.js';
import { presentStops } from '../infrastructure/repositories/trips.repository.js';

async function openRoute(unit: ProposalUnit) {
  const trip = await unit.trip();
  const stops = presentStops(trip);
  if (tripDirection(stops) !== 'HACIA_USC')
    throw new BadRequestException(
      'Las propuestas se admiten en viajes hacia la USC',
    );
  if (trip.status !== 'PROGRAMADO' || trip.departureAt <= new Date())
    throw new ConflictException('El viaje está cerrado a propuestas');
  return { trip, stops, geometry: trip.routeGeometry as RouteGeometry | null };
}

@Injectable()
export class PickupProposalsService {
  constructor(private readonly repository: PickupProposalsRepository) {}

  list(actorId: string, tripId: string) {
    return this.repository.list(actorId, tripId);
  }

  propose(actorId: string, tripId: string, input: PickupProposalDto) {
    const point = {
      ...input,
      label: input.label.trim(),
      instructions: input.instructions?.trim() || undefined,
    };
    if (point.label.length < 2)
      throw new BadRequestException('Escribe una referencia pública');
    return this.repository.withTrip(tripId, async (unit) => {
      const { trip, stops, geometry } = await openRoute(unit);
      if (trip.driverId === actorId)
        throw new ForbiddenException('El conductor ya define sus paradas');
      if (!geometry)
        throw new ConflictException(
          'Hace falta geometría publicada para comprobar la propuesta',
        );
      pickupInsertionPosition(geometry, stops, point);
      if (await unit.pendingFor(actorId))
        throw new ConflictException(
          'Ya tienes una propuesta pendiente en este viaje',
        );
      if ((await unit.pendingCount()) >= 50)
        throw new ConflictException(
          'El viaje alcanzó su límite de propuestas pendientes',
        );
      return proposalView(await unit.create(actorId, point));
    });
  }

  decide(
    actorId: string,
    tripId: string,
    proposalId: string,
    decision: PickupDecisionDto['decision'],
  ) {
    return this.repository.withTrip(tripId, async (unit) => {
      const { trip, stops, geometry } = await openRoute(unit);
      if (trip.driverId !== actorId)
        throw new ForbiddenException(
          'Sólo el conductor decide sobre esta propuesta',
        );
      const row = await unit.find(proposalId);
      if (!row) throw new NotFoundException('Propuesta inexistente');
      const next = decision === 'ACCEPT' ? 'ACCEPTED' : 'REJECTED';
      if (row.status === next) return proposalView(row);
      if (row.status !== 'PENDING')
        throw new ConflictException('La propuesta ya fue resuelta');
      const now = new Date();
      if (decision === 'REJECT')
        return proposalView(await unit.reject(proposalId, now));
      if (!geometry)
        throw new ConflictException(
          'Hace falta geometría publicada para incorporar la propuesta',
        );
      const position = pickupInsertionPosition(geometry, stops, {
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
      });
      return proposalView(await unit.accept(row, position, now, actorId));
    });
  }
}
