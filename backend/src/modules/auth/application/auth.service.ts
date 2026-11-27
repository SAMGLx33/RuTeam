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
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
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
  accessConfiguration() {
    return {
      institutionalAuthentication: 'UNAVAILABLE' as const,
      studentEligibilityVerification: 'UNAVAILABLE' as const,
      reason:
        'Falta acceso a una fuente institucional autorizada de autenticación y matrícula vigente. El correo o carné por sí solos no acreditan elegibilidad.',
      fixturesAvailable:
        this.env.demo &&
        this.env.NODE_ENV === 'test' &&
        this.env.VERIFICATION_PROVIDER === 'demo',
    };
  }
  async loginDemo(identity: string) {
    if (
      this.env.NODE_ENV !== 'test' ||
      !this.env.demo ||
      this.env.VERIFICATION_PROVIDER !== 'demo'
    )
      throw new NotFoundException();
    const user = await this.repository.findIdentity(identity);
    if (!user || user.disabledAt)
      throw new UnauthorizedException(
        'Identidad demo no disponible; ejecuta seed',
      );
    const allowed = await this.verification.verify(user.id);
    await this.repository.recordVerification(user.id, allowed);
    if (!allowed)
      throw new ForbiddenException(
        'Acceso reservado a cuentas con correo confirmado y matrícula vigente',
      );
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.env.SESSION_TTL_SECONDS * 1000,
    );
    const presentedUser = this.presentUser(user);
    await this.repository.createSession(user.id, this.hash(token), expiresAt);
    return {
      token,
      expiresAt: expiresAt.toISOString(),
      user: presentedUser,
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
    const actor = await this.repository.findUser(session.userId);
    if (!actor || actor.disabledAt)
      throw new ForbiddenException('Cuenta deshabilitada');
    if (actor.demoIdentity != null && !this.syntheticAllowed(actor))
      throw new ForbiddenException(
        'Las cuentas sintéticas están aisladas del entorno real',
      );
    if (
      requireActiveMembership &&
      (!actor.emailVerifiedAt ||
        !isActiveMembership(actor.membership, new Date()) ||
        (actor.membership?.verifiedBy === 'DEMO' &&
          !this.syntheticAllowed(actor)) ||
        !(await this.verification.verify(session.userId)))
    )
      throw new ForbiddenException(
        'Acceso reservado a cuentas con correo confirmado y matrícula vigente',
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
  syntheticAllowed(user: Pick<SessionUser, 'demoIdentity'>): boolean {
    return (
      user.demoIdentity != null &&
      this.env.NODE_ENV !== 'production' &&
      this.env.demo &&
      this.env.VERIFICATION_PROVIDER === 'demo'
    );
  }
  capabilitiesFor(user: SessionUser, eligible: boolean) {
    const synthetic = this.syntheticAllowed(user);
    const license = user.driverEligibility;
    const driver =
      eligible &&
      !!license &&
      (!license.demo || synthetic) &&
      VehiculoPolicy.esPublicable(license, new Date()) &&
      user.vehicles.some(
        (vehicle) =>
          (!vehicle.document?.demo || synthetic) &&
          VehiculoPolicy.esPublicable(vehicle.document, new Date()) &&
          (license.category === 'BOTH' || license.category === vehicle.type),
      );
    return {
      passenger: eligible,
      driverAccess:
        eligible &&
        (user.usagePreference === 'DRIVER_AND_PASSENGER' ||
          !!license ||
          user.vehicles.length > 0),
      driver,
    };
  }
  async createIdentitySession(userId: string, expectedPasswordHash: string) {
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(
      Date.now() + this.env.SESSION_TTL_SECONDS * 1000,
    );
    if (
      !(await this.repository.createCredentialSession(
        userId,
        expectedPasswordHash,
        this.hash(token),
        expiresAt,
      ))
    )
      throw new UnauthorizedException('Credenciales inválidas');
    return { token, expiresAt: expiresAt.toISOString() };
  }
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private presentUser(user: SessionUser) {
    if (
      user.disabledAt ||
      !user.profile ||
      !user.membership ||
      !isActiveMembership(user.membership, new Date())
    )
      throw new ForbiddenException('Afiliación o perfil no disponible');
    return {
      id: user.id,
      email: user.email,
      capabilities: {
        passenger: true as const,
        driver: this.capabilitiesFor(user, true).driver,
      },
      profile: { displayName: user.profile.displayName },
      membership: {
        status: 'ACTIVE' as const,
        group: user.membership.group,
        verifiedBy: user.membership.verifiedBy,
        validUntil: user.membership.validUntil.toISOString(),
      },
      demo:
        this.syntheticAllowed(user) && user.membership.verifiedBy === 'DEMO',
    };
  }
}
