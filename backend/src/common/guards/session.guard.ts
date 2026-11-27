import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';
import {
  AuthService,
  type SessionPrincipal,
} from '../../modules/auth/application/auth.service.js';
export interface AuthenticatedRequest extends Request {
  principal: SessionPrincipal;
}
export function sessionCredential(req: Request) {
  const bearer = req.headers.authorization?.match(
    /^Bearer ([A-Za-z0-9_-]+)$/,
  )?.[1];
  const cookies = req.cookies as Record<string, unknown> | undefined;
  const cookie = cookies?.ruteam_session;
  return bearer ?? (typeof cookie === 'string' ? cookie : undefined);
}
@Injectable()
export class SessionGuard implements CanActivate {
  protected requiresActiveMembership = true;
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    req.principal = await this.auth.authenticate(
      sessionCredential(req),
      this.requiresActiveMembership,
    );
    return true;
  }
}

/** Sólo permite revocar la propia sesión; no autoriza acceso a datos protegidos. */
@Injectable()
export class SessionRevocationGuard extends SessionGuard {
  protected override requiresActiveMembership = false;
  constructor(auth: AuthService) {
    super(auth);
  }
}
