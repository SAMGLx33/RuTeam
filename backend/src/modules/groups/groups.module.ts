import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { ReservationsModule } from '../reservations/reservations.module.js';
import { GroupsService } from './application/groups.service.js';
import { GroupsController } from './controllers/groups.controller.js';
import { GroupsRepository } from './infrastructure/repositories/groups.repository.js';

@Module({
  imports: [AuthModule, ReservationsModule],
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
})
export class GroupsModule {}
