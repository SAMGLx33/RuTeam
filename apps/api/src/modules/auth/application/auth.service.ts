import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { InstitutionalVerificationProvider } from '../../../infrastructure/verification/institutional-verification.provider.js';
import {
  AuthRepository,
  type SessionUser,
} from '../infrastructure/repositories/auth.repository.js';
import { isActiveMembership } from '../../institutional-membership/domain/membership.policy.js';
export interface SessionPrincipal {
  userId: string;
  sessionId: string;
}
@Injectable()
export class AuthService {
  constructor(
    private readonly repository: AuthRepository,
    private readonly verification: InstitutionalVerificationProvider,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  async loginDemo(identity: string) {
    if (!this.env.demo || this.env.VERIFICATION_PROVIDER !== 'demo')
      throw new NotFoundException();
    const user = await this.repository.findIdentity(identity);
    if (!user)
      throw new UnauthorizedException(
        'Identidad demo no disponible; ejecuta seed',
      );
    const allowed = await this.verification.verify(user.id);
    await this.repository.recordVerification(user.id, allowed);
    if (!allowed)
      throw new ForbiddenException(
        'Acceso denegado: vinculación institucional inactiva o vencida (simulada)',
      );
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.env.SESSION_TTL_SECONDS * 1000,
    );
    await this.repository.createSession(user.id, this.hash(token), expiresAt);
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: this.presentUser(user),
    };
  }
  async authenticate(
    token: string | undefined,
    requireActiveMembership = true,
  ): Promise<SessionPrincipal> {
    if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token))
      throw new UnauthorizedException('Inicia sesión');
    const session = await this.repository.findSession(this.hash(token));
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt.getTime() <= Date.now()
    )
      throw new UnauthorizedException('Sesión inválida o expirada');
    if (
      requireActiveMembership &&
      !(await this.verification.verify(session.userId))
    )
      throw new ForbiddenException(
        'Acceso denegado: vinculación institucional inactiva o vencida (simulada)',
      );
    return { userId: session.userId, sessionId: session.id };
  }
  async currentUser(userId: string) {
    const user = await this.repository.findUser(userId);
    if (!user) throw new UnauthorizedException();
    return this.presentUser(user);
  }
  async logout(sessionId: string): Promise<void> {
    await this.repository.revokeSession(sessionId);
  }
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private presentUser(user: SessionUser) {
    if (
      !user.profile ||
      !user.membership ||
      !isActiveMembership(user.membership, new Date())
    )
      throw new ForbiddenException('Afiliación o perfil no disponible');
    return {
      id: user.id,
      email: user.email,
      role: user.role,
      capabilities: {
        passenger: true as const,
        driver:
          user.driverEligibility?.reviewStatus === 'APPROVED' &&
          user.driverEligibility.expiresAt.getTime() > Date.now(),
      },
      profile: { displayName: user.profile.displayName },
      membership: {
        status: 'ACTIVE' as const,
        group: user.membership.group,
        verifiedBy: 'DEMO' as const,
        validUntil: user.membership.validUntil.toISOString(),
      },
      demo: true as const,
    };
  }
}
