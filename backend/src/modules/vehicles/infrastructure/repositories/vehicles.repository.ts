import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type {
  RegisterVehicleDto,
  RegisterLicenseDto,
} from '../../dto/vehicles.dto.js';
@Injectable()
export class VehiculoRepository {
  constructor(private readonly db: PrismaService) {}
  actor(id: string) {
    return this.db.user.findUnique({ where: { id }, select: { role: true } });
  }
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
  registrar(ownerId: string, data: RegisterVehicleDto) {
    return this.db.vehicle.create({
      data: {
        ownerId,
        plate: data.plate,
        type: data.type,
        passengerCapacity: data.passengerCapacity,
        brand: data.brand.trim(),
        modelYear: data.modelYear,
        color: data.color,
        document: { create: { expiresAt: new Date(data.soatExpiresAt) } },
      },
      include: { document: true },
    });
  }
  pendientes() {
    return Promise.all([
      this.db.vehicle.findMany({
        where: { document: { reviewStatus: 'PENDING' } },
        select: {
          id: true,
          plate: true,
          document: { select: { expiresAt: true, revision: true } },
        },
      }),
      this.db.driverEligibility.findMany({
        where: { reviewStatus: 'PENDING' },
        select: {
          userId: true,
          category: true,
          expiresAt: true,
          revision: true,
          user: { select: { profile: { select: { displayName: true } } } },
        },
      }),
    ]);
  }
  licencia(userId: string) {
    return this.db.driverEligibility.findUnique({ where: { userId } });
  }
  registrarLicencia(userId: string, data: RegisterLicenseDto) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      return tx.driverEligibility.upsert({
        where: { userId },
        create: {
          userId,
          category: data.category,
          expiresAt: new Date(data.expiresAt),
        },
        update: {
          category: data.category,
          expiresAt: new Date(data.expiresAt),
          reviewStatus: 'PENDING',
          revision: { increment: 1 },
          reviewedAt: null,
          reviewedById: null,
        },
      });
    });
  }
  revisarLicencia(
    userId: string,
    reviewer: string,
    decision: 'APPROVED' | 'REJECTED',
    revision: number,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const current = await tx.driverEligibility.findUnique({
        where: { userId },
      });
      if (!current) return { outcome: 'MISSING' as const };
      if (current.revision !== revision || current.reviewStatus !== 'PENDING')
        return { outcome: 'STALE' as const };
      if (decision === 'APPROVED' && current.expiresAt.getTime() <= Date.now())
        return { outcome: 'EXPIRED' as const };
      const license = await tx.driverEligibility.update({
        where: { userId },
        data: {
          reviewStatus: decision,
          revision: { increment: 1 },
          reviewedById: reviewer,
          reviewedAt: new Date(),
        },
      });
      return { outcome: 'OK' as const, license };
    });
  }
  revisarDocumento(
    vehicleId: string,
    ownerId: string,
    reviewer: string,
    decision: 'APPROVED' | 'REJECTED',
    revision: number,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${ownerId}::uuid FOR UPDATE`;
      const current = await tx.vehicleDocument.findUnique({
        where: { vehicleId },
      });
      if (!current) return { outcome: 'MISSING' as const };
      if (current.revision !== revision || current.reviewStatus !== 'PENDING')
        return { outcome: 'STALE' as const };
      if (decision === 'APPROVED' && current.expiresAt.getTime() <= Date.now())
        return { outcome: 'EXPIRED' as const };
      await tx.vehicleDocument.update({
        where: { vehicleId },
        data: {
          reviewStatus: decision,
          revision: { increment: 1 },
          reviewedById: reviewer,
          reviewedAt: new Date(),
        },
      });
      return { outcome: 'OK' as const };
    });
  }
}
