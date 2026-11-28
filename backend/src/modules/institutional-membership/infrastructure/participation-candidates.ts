import type { Prisma } from '../../../generated/prisma/client.js';
import {
  declaredAccessEnabled,
  fixtureAccessEnabled,
  type AccessConfiguration,
} from '../domain/access-policy.js';

// Candidate filters for collection queries. Validate an individual actor at the use-case boundary.
export function participationCandidates(
  config: AccessConfiguration,
  now: Date,
  includeOfficial = false,
): Prisma.UserWhereInput {
  const any: Prisma.UserWhereInput[] = [];
  if (declaredAccessEnabled(config))
    any.push({
      demoIdentity: null,
      email: { endsWith: '@usc.edu.co', mode: 'insensitive' },
      OR: [
        { membership: { is: null } },
        { membership: { is: { status: { not: 'REVOKED' } } } },
      ],
    });
  const membership = {
    status: 'ACTIVE',
    group: 'STUDENT',
    validUntil: { gt: now },
  } as const;
  if (fixtureAccessEnabled(config))
    any.push({
      demoIdentity: { not: null },
      emailVerifiedAt: { not: null },
      membership: { is: { ...membership, verifiedBy: 'DEMO' } },
    });
  if (includeOfficial && config.VERIFICATION_PROVIDER === 'official')
    any.push({
      demoIdentity: null,
      emailVerifiedAt: { not: null },
      membership: { is: { ...membership, verifiedBy: { not: 'DEMO' } } },
    });
  return { disabledAt: null, OR: any };
}
