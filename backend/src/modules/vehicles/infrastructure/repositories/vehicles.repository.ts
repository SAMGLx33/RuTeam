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
  registrar(ownerId: string, data: RegisterVehicleDto, demo: boolean) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR UPDATE`;
      return tx.vehicle.create({
        data: {
          ownerId,
          plate: data.plate,
          type: data.type,
          passengerCapacity: data.passengerCapacity,
          brand: data.brand.trim(),
          modelYear: data.modelYear,
          color: data.color,
          demo,
          document: {
            create: {
              expiresAt: new Date(data.soatExpiresAt),
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
  registrarLicencia(userId: string, data: RegisterLicenseDto, demo: boolean) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      return tx.driverEligibility.upsert({
        where: { userId },
        create: {
          userId,
          category: data.category,
          expiresAt: new Date(data.expiresAt),
          demo,
          verificationSource: 'SELF_DECLARED',
        },
        update: {
          category: data.category,
          expiresAt: new Date(data.expiresAt),
          demo,
          verificationSource: 'SELF_DECLARED',
          reviewStatus: 'PENDING',
          revision: { increment: 1 },
        },
      });
    });
  }
  actualizarSoat(
    ownerId: string,
    vehicleId: string,
    expiresAt: Date,
    demo: boolean,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR UPDATE`;
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
