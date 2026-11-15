import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './application/auth.service.js';
import { AuthRepository } from './infrastructure/repositories/auth.repository.js';
import {
  SessionGuard,
  SessionRevocationGuard,
} from '../../common/guards/session.guard.js';
@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    AuthRepository,
    SessionGuard,
    SessionRevocationGuard,
  ],
  exports: [AuthService, SessionGuard, SessionRevocationGuard],
})
export class AuthModule {}
