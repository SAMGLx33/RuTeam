import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  CompensationAction,
  CompensationDetails,
  CompensationMethod,
} from '@ruteam/contracts';
import { publicEconomicTerms } from '../domain/expense-policy.js';
import {
  ExpensesRepository,
  type CompensationUnit,
} from '../infrastructure/expenses.repository.js';

const resolution = {
  ACKNOWLEDGE: 'ACKNOWLEDGED',
  DISPUTE: 'DISPUTED',
  CANCEL: 'CANCELLED',
} as const;

function details(
  row: CompensationUnit['row'],
  actorId: string,
): CompensationDetails {
  if (actorId !== row.requesterId && actorId !== row.trip.driverId)
    throw new NotFoundException('Compensación no disponible');
  const terms = publicEconomicTerms(row.trip);
  const record = row.compensation;
  return {
    terms,
    record: record && {
      method: record.method,
      amountCop: record.amountCop,
      status: record.status,
      declaredAt: record.declaredAt.toISOString(),
      resolvedAt: record.resolvedAt?.toISOString() ?? null,
    },
    canDeclare:
      !record &&
      actorId === row.requesterId &&
      row.trip.status === 'COMPLETADO' &&
      row.status === 'CONFIRMED' &&
      row.quantity === 1 &&
      !!row.boardedAt &&
      !row.noShowAt &&
      !!terms?.suggestedContributionCop,
    actions:
      record?.status !== 'DECLARED'
        ? []
        : actorId === row.trip.driverId
          ? ['ACKNOWLEDGE', 'DISPUTE']
          : ['CANCEL'],
  };
}

@Injectable()
export class CompensationsService {
  constructor(private readonly repository: ExpensesRepository) {}

  async view(id: string, actorId: string) {
    return details(await this.repository.compensation(id, actorId), actorId);
  }

  declare(id: string, actorId: string, method: CompensationMethod) {
    return this.repository.withCompensation(id, actorId, async (unit) => {
      const available = details(unit.row, actorId);
      if (actorId !== unit.row.requesterId)
        throw new NotFoundException('Compensación no disponible');
      if (available.record?.method === method) return available;
      if (
        !available.canDeclare ||
        !available.terms?.compensationMethods.includes(method)
      )
        throw new ConflictException(
          'La declaración no se puede registrar con ese método',
        );
      await unit.declare(method, available.terms.suggestedContributionCop);
      return details(unit.row, actorId);
    });
  }

  resolve(id: string, actorId: string, action: CompensationAction) {
    return this.repository.withCompensation(id, actorId, async (unit) => {
      const current = details(unit.row, actorId);
      if ((action === 'CANCEL') !== (actorId === unit.row.requesterId))
        throw new NotFoundException('Compensación no disponible');
      if (current.record?.status === resolution[action]) return current;
      if (!current.actions.includes(action))
        throw new ConflictException('El registro ya fue resuelto o no existe');
      await unit.resolve(resolution[action]);
      return details(unit.row, actorId);
    });
  }
}
