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
import { AccountLifecycleController } from './controllers/account-lifecycle.controller.js';
import { AccountLifecycleService } from './application/account-lifecycle.service.js';
import { AccountLifecycleRepository } from './infrastructure/repositories/account-lifecycle.repository.js';
import { RecoveryController } from './controllers/recovery.controller.js';
import { RecoveryService } from './application/recovery.service.js';
import { RecoveryRepository } from './infrastructure/repositories/recovery.repository.js';
import {
  ConsoleRecoveryOtpTransport,
  RecoveryOtpTransport,
} from './infrastructure/recovery-otp.transport.js';
@Module({
  controllers: [
    AuthController,
    AccountController,
    AccountLifecycleController,
    RecoveryController,
  ],
  providers: [
    RecoveryService,
    RecoveryRepository,
    { provide: RecoveryOtpTransport, useClass: ConsoleRecoveryOtpTransport },
    AuthService,
    AccountLifecycleService,
    AccountLifecycleRepository,
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
