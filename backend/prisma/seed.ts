import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import {
  hashPassword,
  verifyPassword,
} from '../src/modules/auth/domain/password.js';
config({ path: '../.env', quiet: true });
if (process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') {
  throw new Error(
    'El seed sintético exige DEMO_MODE=true y entorno no productivo',
  );
}
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
const fixturePassword = process.env.AUTH_FIXTURE_PASSWORD;
if (
  fixturePassword &&
  (fixturePassword.length < 12 || fixturePassword.length > 128)
)
  throw new Error('AUTH_FIXTURE_PASSWORD debe tener entre 12 y 128 caracteres');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const identities = [
    { key: 'ana', name: 'Ana Desarrollo', group: 'STUDENT', status: 'ACTIVE' },
    {
      key: 'diego',
      name: 'Diego Desarrollo',
      group: 'STUDENT',
      status: 'ACTIVE',
    },
    {
      key: 'sara',
      name: 'Sara Desarrollo',
      group: 'STUDENT',
      status: 'ACTIVE',
    },
    {
      key: 'laura',
      name: 'Laura Desarrollo',
      group: 'STUDENT',
      status: 'INACTIVE',
    },
  ] as const;
  await db.$transaction(async (tx) => {
    for (const identity of identities) {
      const email = `${identity.key}@student-fixtures.ruteam.invalid`;
      const user = await tx.user.upsert({
        where: { demoIdentity: identity.key },
        update: {},
        create: {
          demoIdentity: identity.key,
          email,
        },
      });
      if (user.email === `${identity.key}@demo.ruteam.invalid`) {
        await tx.user.update({ where: { id: user.id }, data: { email } });
      }
      const account = {
        emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
        usagePreference:
          user.usagePreference ??
          (identity.key === 'diego' ? 'DRIVER_AND_PASSENGER' : 'PASSENGER'),
        onboardingStep: 4,
        onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
      } as const;
      const passwordHash =
        fixturePassword &&
        !(await verifyPassword(fixturePassword, user.passwordHash))
          ? await hashPassword(fixturePassword)
          : undefined;
      if (
        !user.emailVerifiedAt ||
        !user.onboardingCompletedAt ||
        passwordHash
      ) {
        await tx.user.update({
          where: { id: user.id },
          data: { ...account, ...(passwordHash ? { passwordHash } : {}) },
        });
        if (passwordHash) {
          await tx.authSession.updateMany({
            where: { userId: user.id, revokedAt: null },
            data: { revokedAt: new Date() },
          });
        }
      }
      await tx.profile.upsert({
        where: { userId: user.id },
        update: {},
        create: { userId: user.id, displayName: identity.name },
      });
      await tx.institutionalMembership.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          group: identity.group,
          status: identity.status,
          verifiedBy: 'DEMO',
          validUntil: new Date('2030-12-31T23:59:59Z'),
        },
      });
    }
    const driver = await tx.user.findUniqueOrThrow({
      where: { demoIdentity: 'diego' },
    });
    await tx.driverEligibility.upsert({
      where: { userId: driver.id },
      update: {},
      create: {
        userId: driver.id,
        category: 'BOTH',
        expiresAt: new Date('2030-12-31T23:59:59Z'),
        reviewStatus: 'PENDING',
        verificationSource: 'SELF_DECLARED',
        demo: true,
      },
    });
    await tx.vehicle.upsert({
      where: { plate: 'STU123' },
      update: {},
      create: {
        ownerId: driver.id,
        plate: 'STU123',
        type: 'CAR',
        passengerCapacity: 3,
        brand: 'Marca sintética',
        modelYear: 2020,
        color: 'GRIS',
        demo: true,
        document: {
          create: {
            expiresAt: new Date('2030-12-31T23:59:59Z'),
            reviewStatus: 'PENDING',
            verificationSource: 'SELF_DECLARED',
            kind: 'SOAT',
            demo: true,
          },
        },
      },
    });
    for (const rule of [
      { code: 'DEFAULT', description: 'Acuerdo general de convivencia DEMO' },
      { code: 'NO_SMOKING', description: 'No fumar durante el viaje' },
      { code: 'NO_PETS', description: 'Sin mascotas en este viaje' },
    ]) {
      await tx.tripRuleDefinition.upsert({
        where: { code: rule.code },
        update: {},
        create: rule,
      });
    }
    await tx.campusDestination.upsert({
      where: { code: 'USC-DEMO-PARQUEADERO' },
      update: {},
      create: {
        code: 'USC-DEMO-PARQUEADERO',
        kind: 'PARKING',
        name: 'Parqueadero USC · ejemplo no certificado',
        latitude: '3.403900',
        longitude: '-76.548900',
        demo: true,
      },
    });
    await tx.campusDestination.upsert({
      where: { code: 'USC-DEMO-ENTRADA' },
      update: {},
      create: {
        code: 'USC-DEMO-ENTRADA',
        kind: 'ENTRANCE',
        name: 'Entrada USC · punto de ejemplo no verificado',
        latitude: '3.403800',
        longitude: '-76.548800',
        campus: 'USC',
        demo: true,
      },
    });
    for (const point of [
      {
        code: 'USC-DEMO-CAMPUS',
        name: 'Universidad Santiago de Cali',
        kind: 'CAMPUS',
        description:
          'Referencia general. Elige un punto de encuentro específico.',
      },
      {
        code: 'USC-DEMO-SABIOS',
        name: 'Plazoleta de los Sabios',
        kind: 'PLAZA',
        latitude: '3.403700',
        longitude: '-76.548750',
        description: 'Ejemplo sintético de punto en plazoleta',
        accessReference: 'Acordar el encuentro junto al acceso DEMO',
      },
      {
        code: 'USC-DEMO-SOTANO-1',
        name: 'Parqueadero · sótano 1',
        kind: 'BASEMENT',
        latitude: '3.403900',
        longitude: '-76.548900',
        level: '-1',
        description: 'Ejemplo de primer nivel de parqueadero',
      },
      {
        code: 'USC-DEMO-SOTANO-2',
        name: 'Parqueadero · sótano 2',
        kind: 'BASEMENT',
        latitude: '3.403900',
        longitude: '-76.548900',
        level: '-2',
        description: 'Ejemplo de segundo nivel de parqueadero',
        accessReference: 'Encuentro en acceso peatonal DEMO del nivel -2',
      },
    ] as const) {
      await tx.campusDestination.upsert({
        where: { code: point.code },
        update: {},
        create: { ...point, demo: true },
      });
    }
    const testSite = await tx.campusDestination.findUniqueOrThrow({
      where: { code: 'USC-DEMO-CAMPUS' },
    });
    await tx.campusDestination.updateMany({
      where: {
        campusSiteId: null,
        demo: true,
        code: {
          in: [
            'USC-DEMO-PARQUEADERO',
            'USC-DEMO-ENTRADA',
            'USC-DEMO-SABIOS',
            'USC-DEMO-SOTANO-1',
            'USC-DEMO-SOTANO-2',
          ],
        },
      },
      data: { campusSiteId: testSite.id },
    });
  });
  console.log(
    'Seed idempotente: cuatro estudiantes sintéticos, licencia/vehículo declarados de desarrollo y catálogo USC/reglas DEMO; conserva registros existentes.',
  );
} finally {
  await db.$disconnect();
}
