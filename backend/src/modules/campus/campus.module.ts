import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { CampusController } from './controllers/campus.controller.js';
import { CampusService } from './application/campus.service.js';
import { CampusRepository } from './infrastructure/repositories/campus.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [CampusController],
  providers: [CampusService, CampusRepository],
})
export class CampusModule {}
