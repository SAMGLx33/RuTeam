import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { VehiculoController } from './controllers/vehicles.controller.js';
import { VehiculoService } from './application/vehicles.service.js';
import { VehiculoRepository } from './infrastructure/repositories/vehicles.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [VehiculoController],
  providers: [VehiculoService, VehiculoRepository],
})
export class VehiclesModule {}
