import type { InstitutionalAccessMode } from '@ruteam/contracts';
import { isActiveMembership } from './membership.policy.js';

export const uscDomain = 'usc.edu.co';
export const fixtureDomain = 'student-fixtures.ruteam.invalid';
const localAtom = "[a-z0-9!#$%&'*+/=?^_`{|}~-]+";
const localPart = new RegExp('^' + localAtom + '(\\.' + localAtom + ')*$');
export const declaredEmailPattern =
  '^' + localAtom + '(\\.' + localAtom + ')*@usc\\.edu\\.co$';

export function normalizeInstitutionalEmail(
  email: string,
  allowFixture = false,
): string | null {
  const normalized = email.trim().toLowerCase();
  const [local, domain, ...rest] = normalized.split('@');
  if (
    normalized.length > 254 ||
    local.length > 64 ||
    rest.length ||
    !localPart.test(local)
  )
    return null;
  if (domain !== uscDomain && !(allowFixture && domain === fixtureDomain))
    return null;
  return normalized;
}

export interface AccessConfiguration {
  NODE_ENV: string;
  INSTITUTIONAL_ACCESS_MODE?: InstitutionalAccessMode;
  demo: boolean;
  VERIFICATION_PROVIDER: string;
}

export interface AccessActor {
  email?: string;
  demoIdentity: string | null;
  emailVerifiedAt: Date | null;
  disabledAt: Date | null;
  membership:
    | ({ verifiedBy?: string } & NonNullable<
        Parameters<typeof isActiveMembership>[0]
      >)
    | null;
}

export function declaredAccessEnabled(config: AccessConfiguration): boolean {
  return (
    config.NODE_ENV !== 'production' &&
    config.INSTITUTIONAL_ACCESS_MODE === 'DECLARED_DOMAIN'
  );
}

export function fixtureAccessEnabled(config: AccessConfiguration): boolean {
  return (
    config.NODE_ENV !== 'production' &&
    config.demo &&
    config.VERIFICATION_PROVIDER === 'demo'
  );
}

export function usesDeclaredDomain(
  actor: AccessActor,
  config: AccessConfiguration,
): boolean {
  return (
    declaredAccessEnabled(config) &&
    actor.demoIdentity === null &&
    !!actor.email &&
    normalizeInstitutionalEmail(actor.email) !== null &&
    !actor.disabledAt &&
    actor.membership?.status !== 'REVOKED'
  );
}

export function canSubmitDeclaredDocuments(
  actor: Pick<AccessActor, 'demoIdentity'>,
  config: AccessConfiguration,
): boolean {
  return actor.demoIdentity === null && declaredAccessEnabled(config);
}

export function matchesInstitutionalSource(
  actor: AccessActor,
  config: AccessConfiguration,
): boolean {
  return actor.demoIdentity !== null
    ? fixtureAccessEnabled(config) && actor.membership?.verifiedBy === 'DEMO'
    : config.VERIFICATION_PROVIDER === 'official' &&
        actor.membership?.verifiedBy !== 'DEMO';
}

export function locallyEligible(
  actor: AccessActor,
  config: AccessConfiguration,
  now: Date,
): boolean {
  if (usesDeclaredDomain(actor, config)) return true;
  return (
    !actor.disabledAt &&
    !!actor.emailVerifiedAt &&
    isActiveMembership(actor.membership, now) &&
    matchesInstitutionalSource(actor, config)
  );
}
