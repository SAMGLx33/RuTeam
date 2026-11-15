import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ENVIRONMENT, type Environment } from '../../config/environment.js';
/** Cabecera no simple obliga al preflight en navegadores; Origin siempre se valida. */
@Injectable()
export class ClientOriginGuard implements CanActivate {
  constructor(@Inject(ENVIRONMENT) private readonly env: Environment) {}
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.headers.origin && !this.env.origins.includes(req.headers.origin))
      throw new ForbiddenException('Origen no permitido');
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(req.method) &&
      !['web', 'native'].includes(String(req.headers['x-ruteam-client']))
    ) {
      throw new ForbiddenException('Falta cabecera cliente RuTeam');
    }
    return true;
  }
}
