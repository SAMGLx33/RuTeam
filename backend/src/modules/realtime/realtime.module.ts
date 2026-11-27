import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { RealtimeController } from './controllers/realtime.controller.js';
import { RealtimeService } from './application/realtime.service.js';
import { RealtimeListener } from './infrastructure/realtime-listener.js';
import { RealtimeAccess } from './infrastructure/realtime-access.js';

@Module({
  imports: [AuthModule],
  controllers: [RealtimeController],
  providers: [RealtimeService, RealtimeListener, RealtimeAccess],
})
export class RealtimeModule {}
