import { expect, test } from '@jest/globals';
import {
  calculateEconomics,
  expenseTotal,
} from '../dist/src/modules/expenses/domain/expense-policy.js';

test('el total privado suma pesos enteros sin redondeo ni reparto', () => {
  expect(
    expenseTotal({ fuelCop: 12001, tollsCop: 7002, parkingCop: 4003 }),
  ).toBe(23006);
  expect(expenseTotal({ fuelCop: 0, tollsCop: 0, parkingCop: 0 })).toBe(0);
});

test('incluye al conductor y redondea hacia abajo en COP', () => {
  const estimate = { fuelCop: 1001, tollsCop: 1000, parkingCop: 9000 };
  const input = { estimate, compensationMethods: ['NEQUI', 'CASH'] };
  expect(calculateEconomics(1, input)).toMatchObject({
    totalCop: 11001,
    suggestedContributionCop: 5500,
    source: 'DRIVER_DECLARED',
  });
  expect(calculateEconomics(4, input).suggestedContributionCop).toBe(2200);
  expect(calculateEconomics(1).suggestedContributionCop).toBe(0);
  expect(
    calculateEconomics(2, {
      estimate: { fuelCop: 0, tollsCop: 0, parkingCop: 0 },
      compensationMethods: [],
    }),
  ).toMatchObject({
    totalCop: 0,
    suggestedContributionCop: 0,
    source: 'DRIVER_DECLARED',
  });
});

test('rechaza gastos, plazas y métodos inconsistentes', () => {
  const valid = {
    estimate: { fuelCop: 1000, tollsCop: 0, parkingCop: 0 },
    compensationMethods: ['CASH'],
  };
  for (const seats of [0, 1.5, 5])
    expect(() => calculateEconomics(seats, valid)).toThrow();
  for (const fuelCop of [-1, 0.5, 100000001])
    expect(() =>
      calculateEconomics(1, {
        ...valid,
        estimate: { ...valid.estimate, fuelCop },
      }),
    ).toThrow();
  for (const compensationMethods of [
    [],
    ['CASH', 'CASH'],
    ['CASH', 'NEQUI', 'DAVIPLATA'],
  ])
    expect(() =>
      calculateEconomics(2, { ...valid, compensationMethods }),
    ).toThrow();
});
