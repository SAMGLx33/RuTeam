import { expect, test } from '@jest/globals';
import { OfficialUscVerificationProvider } from '../dist/src/infrastructure/verification/official-usc-verification.provider.js';
import { readEnvironment } from '../dist/src/config/environment.js';

test('proveedor USC oficial falla cerrado sin fingir verificación', async () => {
  await expect(
    new OfficialUscVerificationProvider().verify('synthetic-id'),
  ).rejects.toMatchObject({ status: 503 });
});
test('modo demo prohibido en producción', () => {
  const original = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    expect(() => readEnvironment()).toThrow('DEMO_MODE prohibido');
  } finally {
    process.env.NODE_ENV = original;
  }
});
test('sin demo no se selecciona provider sintético', () => {
  const original = process.env.DEMO_MODE;
  try {
    process.env.DEMO_MODE = 'false';
    expect(readEnvironment().VERIFICATION_PROVIDER).toBe('official');
  } finally {
    process.env.DEMO_MODE = original;
  }
});
