import { BadRequestException } from '@nestjs/common';
import type {
  CompensationMethod,
  TripEconomicTerms,
  TripEconomicsInput,
  TripEconomicsPreview,
  TripExpenseInput,
} from '@ruteam/contracts';

export const maxExpensePerConcept = 100_000_000;

export function expenseTotal(input: TripExpenseInput): number {
  return input.fuelCop + input.tollsCop + input.parkingCop;
}

export function publicEconomicTerms(row: {
  suggestedContributionCop: number | null;
  compensationMethods: CompensationMethod[];
}): TripEconomicTerms | null {
  return row.suggestedContributionCop === null
    ? null
    : {
        suggestedContributionCop: row.suggestedContributionCop,
        compensationMethods: row.compensationMethods,
      };
}

export function calculateEconomics(
  offeredSeats: number,
  input?: TripEconomicsInput,
): TripEconomicsPreview {
  if (!Number.isInteger(offeredSeats) || offeredSeats < 1 || offeredSeats > 4)
    throw new BadRequestException('Usa entre una y cuatro plazas ofertadas');
  const estimate = input?.estimate ?? null;
  if (
    estimate &&
    Object.values(estimate).some(
      (cost) =>
        !Number.isInteger(cost) || cost < 0 || cost > maxExpensePerConcept,
    )
  )
    throw new BadRequestException(
      'Indica gastos en pesos enteros no negativos',
    );
  const totalCop = estimate ? expenseTotal(estimate) : 0;
  const suggestedContributionCop = Math.floor(totalCop / (offeredSeats + 1));
  const compensationMethods = input?.compensationMethods ?? [];
  if (
    suggestedContributionCop === 0
      ? compensationMethods.length !== 0
      : compensationMethods.length < 1 ||
        compensationMethods.length > 2 ||
        new Set(compensationMethods).size !== compensationMethods.length
  )
    throw new BadRequestException(
      suggestedContributionCop
        ? 'Selecciona uno o dos métodos de compensación distintos'
        : 'Un viaje gratuito se publica sin métodos de compensación',
    );
  return {
    estimate,
    totalCop,
    offeredSeats,
    suggestedContributionCop,
    compensationMethods,
    source: estimate ? 'DRIVER_DECLARED' : null,
  };
}
