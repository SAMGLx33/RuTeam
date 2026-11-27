import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  VehicleEnergyInput,
  VehicleEnergyProfile,
} from '@ruteam/contracts';
import { normalizeEnergy } from '../../mobility/domain/emissions.js';
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
  private futureDate(value: string): Date {
    const date = new Date(value);
    if (!(date.getTime() > Date.now()))
      throw new BadRequestException('La vigencia declarada debe ser futura');
    return date;
  }
  async registrarVehiculo(userId: string, data: RegisterVehicleDto) {
    VehiculoPolicy.validarCapacidad(data.type, data.passengerCapacity);
    VehiculoPolicy.validarPlaca(data.type, data.plate);
    this.futureDate(data.soatExpiresAt);
    if (data.brand.trim().length < 2)
      throw new BadRequestException('Marca inválida');
    try {
      return this.present(
        await this.repository.registrar(
          userId,
          data,
          this.env.demo,
          data.energyProfile ? normalizeEnergy(data.energyProfile) : undefined,
        ),
      );
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
  async updateEnergy(
    ownerId: string,
    id: string,
    input: VehicleEnergyInput | null,
  ) {
    const vehicle = await this.repository.updateEnergy(
      ownerId,
      id,
      input === null ? null : normalizeEnergy(input),
    );
    if (!vehicle) throw new NotFoundException('Vehículo propio no encontrado');
    return this.present(vehicle);
  }
  async actualizarSoat(userId: string, vehicleId: string, expiresAt: string) {
    const vehicle = await this.repository.actualizarSoat(
      userId,
      vehicleId,
      this.futureDate(expiresAt),
      this.env.demo,
    );
    if (!vehicle) throw new NotFoundException('Vehículo propio no encontrado');
    return this.present(vehicle);
  }
  async licencia(userId: string) {
    return this.presentLicense(await this.repository.licencia(userId));
  }
  async registrarLicencia(userId: string, data: RegisterLicenseDto) {
    this.futureDate(data.expiresAt);
    return this.presentLicense(
      await this.repository.registrarLicencia(userId, data, this.env.demo),
    );
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
      verificationStatus: VehiculoPolicy.estadoDocumental(license, new Date()),
      verificationSource: license.verificationSource,
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
      energyProfile:
        vehicle.energyProfile as unknown as VehicleEnergyProfile | null,
      plate: vehicle.plate,
      type: vehicle.type,
      passengerCapacity: vehicle.passengerCapacity,
      brand: vehicle.brand,
      modelYear: vehicle.modelYear,
      color: vehicle.color,
      demo: vehicle.demo,
      revision: vehicle.document?.revision ?? 1,
      soatExpiresAt: vehicle.document?.expiresAt.toISOString() ?? null,
      verificationStatus: VehiculoPolicy.estadoDocumental(
        vehicle.document,
        new Date(),
      ),
      verificationSource:
        vehicle.document?.verificationSource ?? 'SELF_DECLARED',
      eligibleNow: VehiculoPolicy.esPublicable(vehicle.document, new Date()),
    };
  }
}
