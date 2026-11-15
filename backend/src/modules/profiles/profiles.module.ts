import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ProfilesController } from './controllers/profiles.controller.js';
import { ProfilesService } from './application/profiles.service.js';
import { ProfileRepository } from './infrastructure/repositories/profile.repository.js';
@Module({
  imports: [AuthModule],
  controllers: [ProfilesController],
  providers: [ProfilesService, ProfileRepository],
})
export class ProfilesModule {}
