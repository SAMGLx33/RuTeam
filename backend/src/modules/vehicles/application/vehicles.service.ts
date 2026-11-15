import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { VehiculoRepository } from '../infrastructure/repositories/vehicles.repository.js';
import {
  VehiculoPolicy,
  VEHICLE_COLORS,
} from '../domain/policies/vehiculo.policy.js';
import type {
  RegisterLicenseDto,
  RegisterVehicleDto,
} from '../dto/vehicles.dto.js';
@Injectable()
export class VehiculoService {
  constructor(
    private readonly repository: VehiculoRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  private demoOnly(): void {
    if (!this.env.demo) throw new NotFoundException();
  }
  private async admin(userId: string): Promise<void> {
    this.demoOnly();
    if ((await this.repository.actor(userId))?.role !== 'ADMIN')
      throw new ForbiddenException('Requiere administrador asignado');
  }
  async pendientes(actorId: string) {
    await this.admin(actorId);
    const [vehicles, licenses] = await this.repository.pendientes();
    return {
      vehicles: vehicles.map((vehicle) => ({
        id: vehicle.id,
        plate: vehicle.plate,
        revision: vehicle.document?.revision,
        expiresAt: vehicle.document?.expiresAt.toISOString(),
      })),
      licenses: licenses.map((license) => ({
        userId: license.userId,
        displayName: license.user.profile?.displayName ?? 'Miembro DEMO',
        category: license.category,
        revision: license.revision,
        expiresAt: license.expiresAt.toISOString(),
      })),
    };
  }
  catalogo() {
    return {
      colors: VEHICLE_COLORS,
      types: ['CAR', 'MOTORCYCLE'],
      licenseCategories: ['CAR', 'MOTORCYCLE', 'BOTH'],
    };
  }
  async listarPropios(userId: string) {
    return (await this.repository.listarPropios(userId)).map((vehicle) =>
      this.present(vehicle),
    );
  }
  async registrarVehiculo(userId: string, data: RegisterVehicleDto) {
    this.demoOnly();
    VehiculoPolicy.validarCapacidad(data.type, data.passengerCapacity);
    VehiculoPolicy.validarPlaca(data.type, data.plate);
    if (
      new Date(data.soatExpiresAt).getTime() <= Date.now() ||
      data.brand.trim().length < 2
    )
      throw new BadRequestException('Marca o vigencia SOAT DEMO inválida');
    try {
      return this.present(await this.repository.registrar(userId, data));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      )
        throw new ConflictException('La placa ya está registrada');
      throw error;
    }
  }
  async licencia(userId: string) {
    return this.presentLicense(await this.repository.licencia(userId));
  }
  async registrarLicencia(userId: string, data: RegisterLicenseDto) {
    this.demoOnly();
    if (new Date(data.expiresAt).getTime() <= Date.now())
      throw new BadRequestException(
        'La licencia DEMO debe tener vigencia futura',
      );
    return this.presentLicense(
      await this.repository.registrarLicencia(userId, data),
    );
  }
  async revisarVehiculo(
    actorId: string,
    vehicleId: string,
    decision: 'APPROVED' | 'REJECTED',
    revision: number,
  ) {
    await this.admin(actorId);
    const vehicle = await this.repository.obtenerVehiculo(vehicleId);
    if (!vehicle?.document)
      throw new NotFoundException('Vehículo no encontrado');
    const result = await this.repository.revisarDocumento(
      vehicleId,
      vehicle.ownerId,
      actorId,
      decision,
      revision,
    );
    this.reviewResult(result.outcome);
    return { vehicleId, decision, demo: true };
  }
  async revisarLicencia(
    actorId: string,
    userId: string,
    decision: 'APPROVED' | 'REJECTED',
    revision: number,
  ) {
    await this.admin(actorId);
    const license = await this.repository.licencia(userId);
    if (!license) throw new NotFoundException('Licencia DEMO no encontrada');
    const result = await this.repository.revisarLicencia(
      userId,
      actorId,
      decision,
      revision,
    );
    this.reviewResult(result.outcome);
    return this.presentLicense(result.outcome === 'OK' ? result.license : null);
  }
  private reviewResult(outcome: string): void {
    if (outcome === 'MISSING')
      throw new NotFoundException('Documento no encontrado');
    if (outcome === 'STALE')
      throw new ConflictException(
        'La presentación cambió o ya fue revisada; recarga las solicitudes',
      );
    if (outcome === 'EXPIRED')
      throw new BadRequestException('Documento DEMO vencido');
  }
  private presentLicense(
    license: Awaited<ReturnType<VehiculoRepository['licencia']>>,
  ) {
    if (!license) return null;
    return {
      userId: license.userId,
      category: license.category,
      revision: license.revision,
      expiresAt: license.expiresAt.toISOString(),
      reviewStatus: license.reviewStatus,
      demo: license.demo,
    };
  }
  private present(
    vehicle: NonNullable<
      Awaited<ReturnType<VehiculoRepository['obtenerVehiculo']>>
    >,
  ) {
    return {
      id: vehicle.id,
      plate: vehicle.plate,
      type: vehicle.type,
      passengerCapacity: vehicle.passengerCapacity,
      brand: vehicle.brand,
      modelYear: vehicle.modelYear,
      color: vehicle.color,
      demo: vehicle.demo,
      revision: vehicle.document?.revision ?? 1,
      soatExpiresAt: vehicle.document?.expiresAt.toISOString() ?? null,
      reviewStatus: vehicle.document?.reviewStatus ?? 'PENDING',
      eligibleNow: VehiculoPolicy.esPublicable(vehicle.document, new Date()),
    };
  }
}
