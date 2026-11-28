import { expect, test } from '@jest/globals';
import { AccountService } from '../dist/src/modules/auth/application/account.service.js';
import { AuthService } from '../dist/src/modules/auth/application/auth.service.js';
import {
  hashPassword,
  verifyPassword,
} from '../dist/src/modules/auth/domain/password.js';
import {
  normalizeAccountEmail,
  validateOnboardingTransition,
} from '../dist/src/modules/auth/domain/account-policy.js';
test('correo institucional se normaliza y otros estamentos no se acreditan por dominio', () => {
  expect(normalizeAccountEmail('  Student.Name@USC.EDU.CO ')).toBe(
    'student.name@usc.edu.co',
  );
  expect(() =>
    normalizeAccountEmail('student@usc.edu.co.attacker.invalid'),
  ).toThrow();
  for (const malformed of [
    'uno..dos@usc.edu.co',
    '.inicio@usc.edu.co',
    'fin.@usc.edu.co',
    'user@@usc.edu.co',
    '@usc.edu.co',
    'alias@correo.usc.edu.co',
    'estudiante@fakeusc.edu.co',
  ])
    expect(() => normalizeAccountEmail(malformed)).toThrow();
  expect(() => normalizeAccountEmail('student@another.invalid')).toThrow();
  expect(() =>
    normalizeAccountEmail('ana@student-fixtures.ruteam.invalid'),
  ).toThrow();
  expect(
    normalizeAccountEmail('ana@student-fixtures.ruteam.invalid', true),
  ).toBe('ana@student-fixtures.ruteam.invalid');
});
test('scrypt usa sal aleatoria, resiste contraseña equivocada y no almacena texto', async () => {
  const password = 'Una frase larga propia';
  const first = await hashPassword(password),
    second = await hashPassword(password);
  expect(first).not.toBe(second);
  expect(first).toMatch(/^scrypt\$32768\$8\$3\$/);
  expect(first).not.toContain(password);
  expect(await verifyPassword(password, first)).toBe(true);
  expect(await verifyPassword('Contraseña equivocada', first)).toBe(false);
  expect(await verifyPassword(password, 'hash-invalido')).toBe(false);
});
test('onboarding persistente no permite saltos ni completar sin elegibilidad', () => {
  expect(() => validateOnboardingTransition(0, 4, null, false, true)).toThrow();
  expect(() => validateOnboardingTransition(1, 2, null, true, false)).toThrow();
  expect(() =>
    validateOnboardingTransition(3, 4, 'PASSENGER', false, true),
  ).toThrow();
  expect(validateOnboardingTransition(3, 4, 'PASSENGER', true, true)).toBe(4);
  expect(
    validateOnboardingTransition(4, 1, 'DRIVER_AND_PASSENGER', true, false),
  ).toBe(4);
});
const fixtureEnv = {
  NODE_ENV: 'test',
  demo: true,
  VERIFICATION_PROVIDER: 'demo',
  SESSION_TTL_SECONDS: 3600,
};
const future = new Date('2030-12-31T23:59:59Z');
const declared = {
  demo: true,
  verificationSource: 'SELF_DECLARED',
  reviewStatus: 'PENDING',
  expiresAt: future,
};
const ordinaryAccount = {
  id: 'ordinary',
  demoIdentity: null,
  disabledAt: null,
  emailVerifiedAt: new Date(),
  email: 'student@usc.edu.co',
  profile: { displayName: 'Estudiante' },
  usagePreference: 'DRIVER_AND_PASSENGER',
  onboardingStep: 0,
  onboardingCompletedAt: null,
  membership: {
    status: 'ACTIVE',
    group: 'STUDENT',
    verifiedBy: 'DEMO',
    validUntil: future,
  },
  driverEligibility: { ...declared, category: 'CAR' },
  vehicles: [{ type: 'CAR', document: declared }],
};
const accountService = (user, environment = fixtureEnv) => {
  const repository = {
    findUser: async () => user,
    observeEligibility: async () => {},
  };
  const provider = { verify: async () => true };
  const auth = new AuthService(repository, provider, environment);
  return new AccountService(
    repository,
    auth,
    { isReady: () => false },
    environment,
  );
};
test('una cuenta real no utiliza acreditación sintética aunque el proveedor responda true', async () => {
  const account = await accountService(ordinaryAccount).account('ordinary');
  expect(account.eligibility.status).toBe('PENDING_VERIFICATION');
  expect(account.capabilities).toEqual({
    passenger: false,
    driver: false,
    driverAccess: false,
  });
});
test('preferencia conductor no valida documentos declarados de una cuenta real', async () => {
  const account = await accountService(
    {
      ...ordinaryAccount,
      membership: {
        ...ordinaryAccount.membership,
        verifiedBy: 'AUTHORIZED_TEST_SOURCE',
      },
    },
    { ...fixtureEnv, VERIFICATION_PROVIDER: 'official' },
  ).account('ordinary');
  expect(account.capabilities).toEqual({
    passenger: true,
    driverAccess: true,
    driver: false,
  });
});
test.each([
  [{ status: 'INACTIVE' }, 'INELIGIBLE'],
  [{ status: 'REVOKED' }, 'REVOKED'],
  [{ group: 'TEACHER' }, 'INELIGIBLE'],
  [{ validUntil: new Date(0) }, 'EXPIRED'],
])('estado de elegibilidad derivado %j → %s', async (patch, expected) => {
  const service = accountService({
    ...ordinaryAccount,
    membership: { ...ordinaryAccount.membership, ...patch },
  });
  expect((await service.account('ordinary')).eligibility.status).toBe(expected);
});
