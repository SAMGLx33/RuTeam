import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
config({ path: '../../.env', quiet: true });
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
    await tx.campusDestination.upsert({
      where: { code: 'USC-DEMO-ENTRADA' },
      update: {},
      create: {
        code: 'USC-DEMO-ENTRADA',
        name: 'Entrada USC · punto de ejemplo no verificado',
        latitude: '3.403800',
        longitude: '-76.548800',
        campus: 'USC',
        demo: true,
      },
    });
  });
  console.log(
    'Seed idempotente: cuatro identidades sintéticas y un destino DEMO; conserva registros existentes.',
  );
} finally {
  await db.$disconnect();
}
