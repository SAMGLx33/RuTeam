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
import type { StudentEligibilityStatus } from '@ruteam/contracts';
import {
  canSubmitDeclaredDocuments,
  fixtureAccessEnabled,
  locallyEligible,
  matchesInstitutionalSource,
  usesDeclaredDomain,
} from '../../institutional-membership/domain/access-policy.js';
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
      institutionalAccess: this.env.INSTITUTIONAL_ACCESS_MODE ?? 'OFFICIAL',
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
    if (requireActiveMembership) {
      const status = await this.institutionalStatus(actor);
      if (
        status !== 'DECLARED' &&
        (!actor.emailVerifiedAt || status !== 'VERIFIED_CURRENT')
      )
        throw new ForbiddenException(
          'La cuenta no reúne las condiciones de acceso de RuTeam',
        );
      if (status === 'DECLARED' && !actor.declaredDomainAccessAt)
        await this.repository.noteDeclaredUse(actor.id);
    }
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
    return user.demoIdentity != null && fixtureAccessEnabled(this.env);
  }

  usesDeclaredAccess(user: SessionUser) {
    return usesDeclaredDomain(user, this.env);
  }

  async institutionalStatus(
    user: SessionUser,
  ): Promise<StudentEligibilityStatus> {
    const membership = user.membership;
    const now = new Date();
    if (user.disabledAt || membership?.status === 'REVOKED') return 'REVOKED';
    if (this.usesDeclaredAccess(user)) return 'DECLARED';
    if (!membership) return 'PENDING_VERIFICATION';
    if (membership.group !== 'STUDENT' || membership.status !== 'ACTIVE')
      return 'INELIGIBLE';
    if (membership.validUntil <= now) return 'EXPIRED';
    // The institutional result and evidence of mailbox ownership are separate.
    if (!matchesInstitutionalSource(user, this.env))
      return 'PENDING_VERIFICATION';
    try {
      return (await this.verification.verify(user.id))
        ? 'VERIFIED_CURRENT'
        : 'INELIGIBLE';
    } catch {
      return 'PENDING_VERIFICATION';
    }
  }

  canUseProduct(user: SessionUser, status: StudentEligibilityStatus) {
    return (
      status === 'DECLARED' ||
      (!!user.emailVerifiedAt && status === 'VERIFIED_CURRENT')
    );
  }
  capabilitiesFor(user: SessionUser, eligible: boolean) {
    const synthetic = this.syntheticAllowed(user);
    const declaredDocuments = canSubmitDeclaredDocuments(user, this.env);
    const license = user.driverEligibility;
    const driver =
      eligible &&
      !!license &&
      (!license.demo || synthetic) &&
      VehiculoPolicy.esPublicable(license, new Date(), declaredDocuments) &&
      user.vehicles.some(
        (vehicle) =>
          (!vehicle.document?.demo || synthetic) &&
          VehiculoPolicy.esPublicable(
            vehicle.document,
            new Date(),
            declaredDocuments,
          ) &&
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
  async createIdentitySession(
    userId: string,
    expectedPasswordHash: string,
    declaredAccess = false,
  ) {
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
        declaredAccess,
      ))
    )
      throw new UnauthorizedException('Credenciales inválidas');
    return { token, expiresAt: expiresAt.toISOString() };
  }
  private hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private presentUser(user: SessionUser) {
    if (!user.profile || !locallyEligible(user, this.env, new Date()))
      throw new ForbiddenException('Cuenta o perfil no disponible');
    const membership = this.usesDeclaredAccess(user) ? null : user.membership;
    return {
      id: user.id,
      email: user.email,
      capabilities: {
        passenger: true as const,
        driver: this.capabilitiesFor(user, true).driver,
      },
      profile: { displayName: user.profile.displayName },
      membership: membership
        ? {
            status: 'ACTIVE' as const,
            group: membership.group,
            verifiedBy: membership.verifiedBy,
            validUntil: membership.validUntil.toISOString(),
          }
        : null,
      demo: this.syntheticAllowed(user) && membership?.verifiedBy === 'DEMO',
    };
  }
}
