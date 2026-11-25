import { expect, test } from '@jest/globals';
import { VehiculoPolicy } from '../dist/src/modules/vehicles/domain/policies/vehiculo.policy.js';
const now = new Date('2026-11-25T12:00:00Z');
const declared = {
  reviewStatus: 'PENDING',
  demo: true,
  verificationSource: 'SELF_DECLARED',
  expiresAt: new Date('2030-01-01T00:00:00Z'),
};
test('declaración vigente de desarrollo no requiere aprobación administrativa', () => {
  expect(VehiculoPolicy.esPublicable(declared, now)).toBe(true);
  expect(VehiculoPolicy.estadoDocumental(declared, now)).toBe('DECLARED');
});
test('declaración real no se convierte en verificación autorizada', () => {
  expect(VehiculoPolicy.esPublicable({ ...declared, demo: false }, now)).toBe(
    false,
  );
  expect(
    VehiculoPolicy.estadoDocumental({ ...declared, demo: false }, now),
  ).toBe('UNVERIFIED');
});
test('aprobación administrativa histórica no equivale a fuente autorizada', () => {
  expect(
    VehiculoPolicy.esPublicable(
      { ...declared, demo: false, reviewStatus: 'APPROVED' },
      now,
    ),
  ).toBe(false);
  expect(
    VehiculoPolicy.esPublicable(
      { ...declared, verificationSource: 'LEGACY_REVIEW' },
      now,
    ),
  ).toBe(false);
});
test('fuente autorizada exige estado verificado y vigencia hasta fin de viaje', () => {
  const verified = {
    ...declared,
    demo: false,
    reviewStatus: 'APPROVED',
    verificationSource: 'AUTHORIZED_SOURCE',
  };
  expect(VehiculoPolicy.esPublicable(verified, now)).toBe(true);
  expect(VehiculoPolicy.estadoDocumental(verified, now)).toBe('VERIFIED');
  expect(
    VehiculoPolicy.esPublicable({ ...verified, reviewStatus: 'PENDING' }, now),
  ).toBe(false);
  expect(VehiculoPolicy.esPublicable(verified, verified.expiresAt)).toBe(false);
  expect(
    VehiculoPolicy.estadoDocumental({ ...declared, expiresAt: now }, now),
  ).toBe('EXPIRED');
  expect(
    VehiculoPolicy.esPublicable(
      { ...declared, expiresAt: new Date('invalid') },
      now,
    ),
  ).toBe(false);
});
