import { Module } from '@nestjs/common';
import { AuthController } from './controllers/auth.controller.js';
import { AuthService } from './application/auth.service.js';
import { AuthRepository } from './infrastructure/repositories/auth.repository.js';
import { AccountController } from './controllers/account.controller.js';
import { AccountService } from './application/account.service.js';
import { AccountSessionGuard } from './guards/account-session.guard.js';
import { EmailDelivery } from './infrastructure/email-delivery.js';
import {
  SessionGuard,
  SessionRevocationGuard,
} from '../../common/guards/session.guard.js';
@Module({
  controllers: [AuthController, AccountController],
  providers: [
    AuthService,
    AuthRepository,
    AccountService,
    AccountSessionGuard,
    EmailDelivery,
    SessionGuard,
    SessionRevocationGuard,
  ],
  exports: [
    AuthService,
    SessionGuard,
    SessionRevocationGuard,
    AccountService,
    AccountSessionGuard,
  ],
})
export class AuthModule {}
