import type { TripExpenseInput } from '@ruteam/contracts';

export const maxExpensePerConcept = 100_000_000;

export function expenseTotal(input: TripExpenseInput): number {
  return input.fuelCop + input.tollsCop + input.parkingCop;
}
