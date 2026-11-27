import { describe, expect, test } from '@jest/globals';
import { isActiveMembership } from '../dist/src/modules/institutional-membership/domain/membership.policy.js';
describe('afiliación activa con vigencia', () => {
  const now = new Date('2026-11-13T12:00:00Z');
  test.each([
    [null, false],
    [
      {
        status: 'ACTIVE',
        group: 'STUDENT',
        validUntil: new Date('2026-11-14T12:00:00Z'),
      },
      true,
    ],
    ...['TEACHER', 'WORKER', 'ADMINISTRATIVE', 'OTHER', undefined].map(
      (group) => [
        {
          status: 'ACTIVE',
          group,
          validUntil: new Date('2026-11-14T12:00:00Z'),
        },
        false,
      ],
    ),
    [
      { status: 'INACTIVE', validUntil: new Date('2026-11-14T12:00:00Z') },
      false,
    ],
    [{ status: 'ACTIVE', validUntil: now }, false],
    [{ status: 'ACTIVE', validUntil: new Date('2026-11-12T12:00:00Z') }, false],
  ])('%j → %s', (membership, expected) =>
    expect(isActiveMembership(membership, now)).toBe(expected),
  );
});
