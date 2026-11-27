import { Injectable } from '@nestjs/common';
import { SessionGuard } from '../../../common/guards/session.guard.js';
import { AuthService } from '../application/auth.service.js';
/** Identity-only session for email/onboarding; never attach it to trip operations. */
@Injectable()
export class AccountSessionGuard extends SessionGuard {
  protected override requiresActiveMembership = false;
  constructor(auth: AuthService) {
    super(auth);
  }
}
