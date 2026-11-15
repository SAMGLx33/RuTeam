import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ViajeController } from './controllers/trips.controller.js';
import { ViajeService } from './application/trips.service.js';
import { ViajeRepository } from './infrastructure/repositories/trips.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [ViajeController],
  providers: [ViajeService, ViajeRepository],
})
export class TripsModule {}
