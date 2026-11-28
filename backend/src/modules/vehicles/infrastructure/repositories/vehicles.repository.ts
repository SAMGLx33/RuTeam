import type { VehicleEnergyProfile } from '@ruteam/contracts';
import { Prisma } from '../../../../generated/prisma/client.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type {
  RegisterVehicleDto,
  RegisterLicenseDto,
} from '../../dto/vehicles.dto.js';
@Injectable()
export class VehiculoRepository {
  constructor(private readonly db: PrismaService) {}
  listarPropios(ownerId: string) {
    return this.db.vehicle.findMany({
      where: { ownerId },
      include: { document: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  obtenerVehiculo(id: string) {
    return this.db.vehicle.findUnique({
      where: { id },
      include: { document: true },
    });
  }
  registrar(
    ownerId: string,
    data: RegisterVehicleDto,
    soatExpiresAt: Date,
    energy?: VehicleEnergyProfile,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR UPDATE`;
      const owner = await tx.user.findUniqueOrThrow({
        where: { id: ownerId },
        select: { demoIdentity: true },
      });
      const demo = owner.demoIdentity !== null;
      return tx.vehicle.create({
        data: {
          ownerId,
          energyProfile: energy ? { ...energy } : undefined,
          plate: data.plate,
          type: data.type,
          passengerCapacity: data.passengerCapacity,
          brand: data.brand.trim(),
          modelYear: data.modelYear,
          color: data.color,
          demo,
          document: {
            create: {
              expiresAt: soatExpiresAt,
              demo,
              verificationSource: 'SELF_DECLARED',
              kind: 'SOAT',
            },
          },
        },
        include: { document: true },
      });
    });
  }
  licencia(userId: string) {
    return this.db.driverEligibility.findUnique({ where: { userId } });
  }
  registrarLicencia(
    userId: string,
    category: RegisterLicenseDto['category'],
    expiresAt: Date,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const owner = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        select: { demoIdentity: true },
      });
      const demo = owner.demoIdentity !== null;
      return tx.driverEligibility.upsert({
        where: { userId },
        create: {
          userId,
          category,
          expiresAt,
          demo,
          verificationSource: 'SELF_DECLARED',
        },
        update: {
          category,
          expiresAt,
          demo,
          verificationSource: 'SELF_DECLARED',
          reviewStatus: 'PENDING',
          revision: { increment: 1 },
        },
      });
    });
  }
  updateEnergy(
    ownerId: string,
    id: string,
    profile: VehicleEnergyProfile | null,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR NO KEY UPDATE`;
      const updated = await tx.vehicle.updateMany({
        where: { id, ownerId },
        data: { energyProfile: profile ? { ...profile } : Prisma.DbNull },
      });
      return updated.count
        ? tx.vehicle.findUnique({ where: { id }, include: { document: true } })
        : null;
    });
  }
  actualizarSoat(ownerId: string, vehicleId: string, expiresAt: Date) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR UPDATE`;
      const owner = await tx.user.findUniqueOrThrow({
        where: { id: ownerId },
        select: { demoIdentity: true },
      });
      const demo = owner.demoIdentity !== null;
      const vehicle = await tx.vehicle.findUnique({ where: { id: vehicleId } });
      if (!vehicle || vehicle.ownerId !== ownerId) return null;
      await tx.vehicleDocument.upsert({
        where: { vehicleId },
        create: {
          vehicleId,
          expiresAt,
          demo,
          kind: 'SOAT',
          verificationSource: 'SELF_DECLARED',
        },
        update: {
          expiresAt,
          demo,
          kind: 'SOAT',
          verificationSource: 'SELF_DECLARED',
          reviewStatus: 'PENDING',
          revision: { increment: 1 },
        },
      });
      return tx.vehicle.findUniqueOrThrow({
        where: { id: vehicleId },
        include: { document: true },
      });
    });
  }
}
