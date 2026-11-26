import { expect, test } from '@jest/globals';
import { ratingTargetRole } from '../dist/src/modules/ratings/domain/rating-policy.js';

test('determina la capacidad histórica y excluye a terceros, pares y autocalificaciones', () => {
  const people = new Set(['passenger', 'another']);
  expect(ratingTargetRole('driver', people, 'driver', 'passenger')).toBe(
    'PASSENGER',
  );
  expect(ratingTargetRole('driver', people, 'passenger', 'driver')).toBe(
    'DRIVER',
  );
  expect(ratingTargetRole('driver', people, 'passenger', 'another')).toBeNull();
  expect(
    ratingTargetRole('driver', people, 'passenger', 'passenger'),
  ).toBeNull();
  expect(ratingTargetRole('driver', people, 'outsider', 'driver')).toBeNull();
  expect(ratingTargetRole('driver', people, 'driver', 'outsider')).toBeNull();
});
