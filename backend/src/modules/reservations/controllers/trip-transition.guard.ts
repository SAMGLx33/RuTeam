import { Injectable, type ExecutionContext } from '@nestjs/common';
import { SessionGuard } from '../../../common/guards/session.guard.js';
import { AuthService } from '../../auth/application/auth.service.js';
import { AccountSessionGuard } from '../../auth/guards/account-session.guard.js';

@Injectable()
export class TripTransitionGuard extends SessionGuard {
  constructor(
    auth: AuthService,
    private readonly accountSession: AccountSessionGuard,
  ) {
    super(auth);
  }

  override canActivate(context: ExecutionContext): Promise<boolean> {
    const { body } = context
      .switchToHttp()
      .getRequest<{ body?: { action?: unknown } }>();
    // Closing a trip still requires its owner and a valid session.
    return body?.action === 'FINISH' ||
      body?.action === 'CANCEL' ||
      body?.action === 'INTERRUPT'
      ? this.accountSession.canActivate(context)
      : super.canActivate(context);
  }
}
