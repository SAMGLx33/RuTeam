import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { tripDirection } from '../domain/models/driver-route.js';
import type { PickupDecisionDto } from '../dto/pickup-proposal.dto.js';
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
  return trip;
}

@Injectable()
export class PickupProposalsService {
  constructor(private readonly repository: PickupProposalsRepository) {}

  list(actorId: string, tripId: string) {
    return this.repository.list(actorId, tripId);
  }

  propose(): never {
    throw new ConflictException(
      'La recogida se realiza en el origen publicado del viaje.',
    );
  }

  decide(
    actorId: string,
    tripId: string,
    proposalId: string,
    decision: PickupDecisionDto['decision'],
  ) {
    return this.repository.withTrip(tripId, async (unit) => {
      const trip = await openRoute(unit);
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
      if (decision === 'ACCEPT')
        throw new ConflictException(
          'La recogida se realiza en el origen publicado del viaje.',
        );
      return proposalView(await unit.reject(proposalId, new Date()));
    });
  }
}
