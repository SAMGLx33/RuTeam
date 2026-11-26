import { expect, test } from '@jest/globals';
import { expenseTotal } from '../dist/src/modules/expenses/domain/expense-policy.js';

test('el total privado suma pesos enteros sin redondeo ni reparto', () => {
  expect(
    expenseTotal({ fuelCop: 12001, tollsCop: 7002, parkingCop: 4003 }),
  ).toBe(23006);
  expect(expenseTotal({ fuelCop: 0, tollsCop: 0, parkingCop: 0 })).toBe(0);
});
