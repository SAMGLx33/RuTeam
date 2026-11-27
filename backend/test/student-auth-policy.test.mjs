import { expect, test, jest } from '@jest/globals';
import { AuthService } from '../dist/src/modules/auth/application/auth.service.js';
const validUntil = new Date('2030-12-31T23:59:59Z');
const declaration = {
  verificationSource: 'SELF_DECLARED',
  reviewStatus: 'PENDING',
  expiresAt: validUntil,
  demo: true,
};
const student = {
  id: 'student',
  disabledAt: null,
  email: 'ana@student-fixtures.ruteam.invalid',
  demoIdentity: 'ana',
  emailVerifiedAt: new Date('2026-11-25T00:00:00Z'),
  profile: { displayName: 'Estudiante sintético' },
  membership: {
    status: 'ACTIVE',
    group: 'STUDENT',
    validUntil,
    verifiedBy: 'DEMO',
  },
  driverEligibility: { ...declaration, category: 'CAR' },
  vehicles: [{ type: 'CAR', document: declaration }],
};
const fixturesEnv = {
  demo: true,
  NODE_ENV: 'test',
  VERIFICATION_PROVIDER: 'demo',
  SESSION_TTL_SECONDS: 3600,
};
const setup = (user = student, env = fixturesEnv) => {
  const repository = {
    findIdentity: jest.fn(async () => user),
    recordVerification: jest.fn(),
    createSession: jest.fn(),
    findUser: jest.fn(async () => user),
    findSession: jest.fn(async () => ({
      id: 'session',
      userId: 'student',
      revokedAt: null,
      expiresAt: validUntil,
    })),
  };
  return {
    service: new AuthService(repository, { verify: async () => true }, env),
    repository,
  };
};
test('una identidad estudiantil puede conducir y ser pasajera sin rol asignable', async () => {
  const { service } = setup();
  const response = await service.loginDemo('ana');
  expect(response.user.capabilities).toEqual({ driver: true, passenger: true });
  expect(response.user).not.toHaveProperty('role');
});
test.each(['TEACHER', 'WORKER', 'ADMINISTRATIVE', 'OTHER'])(
  'estamento %s nunca adquiere sesión aunque proveedor responda true',
  async (group) => {
    const { service, repository } = setup({
      ...student,
      membership: { ...student.membership, group },
    });
    await expect(service.loginDemo('ana')).rejects.toMatchObject({
      status: 403,
    });
    expect(repository.createSession).not.toHaveBeenCalled();
    await expect(service.authenticate('a'.repeat(43))).rejects.toMatchObject({
      status: 403,
    });
  },
);
test('cuenta histórica deshabilitada no puede iniciar ni usar sesión', async () => {
  const { service, repository } = setup({ ...student, disabledAt: new Date() });
  await expect(service.loginDemo('ana')).rejects.toMatchObject({ status: 401 });
  await expect(service.authenticate('a'.repeat(43))).rejects.toMatchObject({
    status: 403,
  });
  expect(repository.createSession).not.toHaveBeenCalled();
});
test('licencia sin vehículo compatible no otorga capacidad de conductor', async () => {
  const { service } = setup({
    ...student,
    vehicles: [{ type: 'MOTORCYCLE', document: declaration }],
  });
  expect((await service.currentUser('student')).capabilities.driver).toBe(
    false,
  );
});
test('vencer la licencia bloquea publicación y conserva pasajero y renovación', () => {
  const { service } = setup();
  const expired = {
    ...student,
    driverEligibility: { ...student.driverEligibility, expiresAt: new Date(0) },
  };
  expect(service.capabilitiesFor(expired, true)).toEqual({
    passenger: true,
    driverAccess: true,
    driver: false,
  });
  expect(service.capabilitiesFor(expired, false)).toEqual({
    passenger: false,
    driverAccess: false,
    driver: false,
  });
});
test('producción publica indisponibilidad institucional y nunca ofrece fixtures', async () => {
  const { service } = setup(student, {
    ...fixturesEnv,
    demo: false,
    NODE_ENV: 'production',
    VERIFICATION_PROVIDER: 'official',
  });
  expect(service.accessConfiguration()).toMatchObject({
    fixturesAvailable: false,
    institutionalAuthentication: 'UNAVAILABLE',
    studentEligibilityVerification: 'UNAVAILABLE',
  });
  await expect(service.loginDemo('ana')).rejects.toMatchObject({ status: 404 });
});
