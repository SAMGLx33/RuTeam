import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
config({ path: '../.env', quiet: true });
if (process.env.DEMO_MODE !== 'true' || process.env.NODE_ENV === 'production') {
  throw new Error(
    'El seed sintético exige DEMO_MODE=true y entorno no productivo',
  );
}
if (!process.env.DATABASE_URL) throw new Error('Falta DATABASE_URL');
const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
try {
  const identities = [
    {
      key: 'ana',
      name: 'Ana Demo',
      group: 'STUDENT',
      status: 'ACTIVE',
      role: 'MEMBER',
      driver: false,
    },
    {
      key: 'diego',
      name: 'Diego Demo',
      group: 'TEACHER',
      status: 'ACTIVE',
      role: 'MEMBER',
      driver: true,
    },
    {
      key: 'laura',
      name: 'Laura Demo',
      group: 'WORKER',
      status: 'INACTIVE',
      role: 'MEMBER',
      driver: false,
    },
    {
      key: 'admin',
      name: 'Administración Demo',
      group: 'ADMINISTRATIVE',
      status: 'ACTIVE',
      role: 'ADMIN',
      driver: false,
    },
  ] as const;
  await db.$transaction(async (tx) => {
    for (const identity of identities) {
      const user = await tx.user.upsert({
        where: { demoIdentity: identity.key },
        update: {},
        create: {
          demoIdentity: identity.key,
          email: `${identity.key}@demo.ruteam.invalid`,
          role: identity.role,
          driverDemoApproved: identity.driver,
        },
      });
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
    const admin = await tx.user.findUniqueOrThrow({
      where: { demoIdentity: 'admin' },
    });
    await tx.driverEligibility.upsert({
      where: { userId: driver.id },
      update: {},
      create: {
        userId: driver.id,
        category: 'BOTH',
        expiresAt: new Date('2030-12-31T23:59:59Z'),
        reviewStatus: 'APPROVED',
        reviewedById: admin.id,
        reviewedAt: new Date('2026-11-13T12:00:00Z'),
      },
    });
    await tx.vehicle.upsert({
      where: { plate: 'DEM123' },
      update: {},
      create: {
        ownerId: driver.id,
        plate: 'DEM123',
        type: 'CAR',
        passengerCapacity: 3,
        brand: 'Marca Demo',
        modelYear: 2020,
        color: 'GRIS',
        document: {
          create: {
            expiresAt: new Date('2030-12-31T23:59:59Z'),
            reviewStatus: 'APPROVED',
            reviewedById: admin.id,
            reviewedAt: new Date('2026-11-13T12:00:00Z'),
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
  });
  console.log(
    'Seed idempotente: cuatro identidades, licencia/vehículo sintéticos y catálogo USC/reglas DEMO; conserva registros existentes.',
  );
} finally {
  await db.$disconnect();
}
