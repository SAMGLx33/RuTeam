import { Injectable, UnauthorizedException } from '@nestjs/common';
import type {
  AccountLifecycleStatus,
  AccountSettings,
} from '@ruteam/contracts';
import type { SessionPrincipal } from './auth.service.js';
import type {
  CloseAccountDto,
  AccountRecoveryActionDto,
} from '../dto/account-lifecycle.dto.js';
import { normalizeAccountEmail } from '../domain/account-policy.js';
import { verifyPassword } from '../domain/password.js';
import { AccountLifecycleRepository } from '../infrastructure/repositories/account-lifecycle.repository.js';
import { AuthService } from './auth.service.js';

type LifecycleUser = Awaited<ReturnType<AccountLifecycleRepository['user']>>;

function present(user: LifecycleUser): AccountLifecycleStatus {
  const request = user.deletionRequests[0];
  return {
    state: user.disabledAt ? 'DEACTIVATED' : 'ACTIVE',
    canReactivate:
      !!user.selfDeactivatedAt && (!request || !!request.withdrawnAt),
    deletionRequest: request
      ? {
          id: request.id,
          status: request.withdrawnAt ? 'WITHDRAWN' : 'REQUESTED',
          requestedAt: request.requestedAt.toISOString(),
          withdrawnAt: request.withdrawnAt?.toISOString() ?? null,
        }
      : null,
  };
}

@Injectable()
export class AccountLifecycleService {
  constructor(
    private readonly repository: AccountLifecycleRepository,
    private readonly auth: AuthService,
  ) {}

  async settings(actor: SessionPrincipal): Promise<AccountSettings> {
    const { user, sessions, active, ...counts } =
      await this.repository.settings(actor.userId, new Date());
    return {
      ...present(user),
      ...counts,
      activeTrips: active.map(({ id, driverId, departureAt, status }) => ({
        id,
        status,
        asDriver: driverId === actor.userId,
        departureAt: departureAt.toISOString(),
      })),
      sessions: sessions.map(({ id, createdAt, expiresAt }) => ({
        id,
        current: id === actor.sessionId,
        createdAt: createdAt?.toISOString() ?? null,
        expiresAt: expiresAt.toISOString(),
      })),
    };
  }

  private async proof(user: LifecycleUser | null, password: string) {
    const matches = await verifyPassword(password, user?.passwordHash ?? null);
    if (
      !user ||
      !matches ||
      !user.passwordHash ||
      (user.demoIdentity && !this.auth.syntheticAllowed(user))
    )
      throw new UnauthorizedException(
        'Correo o contraseña de RuTeam inválidos',
      );
    return { id: user.id, hash: user.passwordHash, user };
  }

  async revoke(actor: SessionPrincipal, password: string, sessionId: string) {
    const { hash } = await this.proof(
      await this.repository.user(actor.userId),
      password,
    );
    await this.repository.revoke(
      actor.userId,
      actor.sessionId,
      hash,
      sessionId,
    );
  }

  async close(actor: SessionPrincipal, input: CloseAccountDto) {
    const { hash } = await this.proof(
      await this.repository.user(actor.userId),
      input.password,
    );
    return present(
      await this.repository.close(
        actor.userId,
        actor.sessionId,
        hash,
        input.action === 'REQUEST_DELETION',
      ),
    );
  }

  async status(email: string, password: string) {
    const { user } = await this.proof(
      await this.repository.identity(normalizeAccountEmail(email, true)),
      password,
    );
    return present(user);
  }

  async recover(input: AccountRecoveryActionDto) {
    const { id, hash } = await this.proof(
      await this.repository.identity(normalizeAccountEmail(input.email, true)),
      input.password,
    );
    return present(await this.repository.recover(id, hash, input.action));
  }
}
