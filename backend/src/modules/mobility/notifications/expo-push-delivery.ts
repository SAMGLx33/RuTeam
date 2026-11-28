import {
  Inject,
  Injectable,
  Logger,
  type OnModuleInit,
  type OnModuleDestroy,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import { InstitutionalVerificationProvider } from '../../../infrastructure/verification/institutional-verification.provider.js';
import {
  locallyEligible,
  usesDeclaredDomain,
} from '../../institutional-membership/domain/access-policy.js';
import { suppressedNotices } from './notification-preferences.js';

const endpoint = 'https://exp.host/--/api/v2/push/';
type ExpoResult = {
  status?: string;
  id?: string;
  details?: { error?: string };
};
type Claim = { noticeId: string; deviceId: string; leaseUntil: Date };

@Injectable()
export class ExpoPushDelivery implements OnModuleInit, OnModuleDestroy {
  private interval?: ReturnType<typeof setInterval>;
  private running = false;
  private readonly logger = new Logger(ExpoPushDelivery.name);
  constructor(
    private readonly db: PrismaService,
    private readonly verification: InstitutionalVerificationProvider,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  onModuleInit() {
    if (!this.env.EXPO_PUSH_ENABLED || this.env.NODE_ENV === 'test') return;
    this.interval = setInterval(() => void this.tick(), 8000);
    this.interval.unref();
  }
  onModuleDestroy() {
    clearInterval(this.interval);
  }

  private claim() {
    return this.db.$queryRaw<Claim[]>`
      WITH ready AS (
        SELECT "noticeId", "deviceId" FROM "PushDelivery"
        WHERE stage IN ('PENDING', 'TICKET') AND "availableAt" <= now() AND ("leaseUntil" IS NULL OR "leaseUntil" < now())
        ORDER BY "availableAt" LIMIT 10 FOR UPDATE SKIP LOCKED
      )
      UPDATE "PushDelivery" d SET "leaseUntil" = date_trunc('milliseconds', now()) + interval '100 seconds'
      FROM ready r WHERE r."noticeId" = d."noticeId" AND r."deviceId" = d."deviceId"
      RETURNING d."noticeId", d."deviceId", d."leaseUntil"
    `;
  }

  async tick() {
    if (!this.env.EXPO_PUSH_ENABLED || this.running) return;
    this.running = true;
    try {
      for (const claim of await this.claim()) {
        try {
          await this.process(claim);
        } catch {
          this.logger.warn('Se reintentará un envío al recuperar la conexión');
        }
      }
    } catch {
      this.logger.warn('El trabajador push volverá a consultar PostgreSQL');
    } finally {
      this.running = false;
    }
  }

  private async post(path: string, body: unknown) {
    const res = await fetch(endpoint + path, {
      method: 'POST',
      redirect: 'error',
      signal: AbortSignal.timeout(6000),
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(this.env.EXPO_PUSH_ACCESS_TOKEN
          ? { Authorization: 'Bearer ' + this.env.EXPO_PUSH_ACCESS_TOKEN }
          : {}),
      },
      body: JSON.stringify(body),
    });
    const retry = res.status === 429 || res.status >= 500;
    if (!res.ok) return { data: null, retry };
    return {
      data: ((await res.json()) as { data?: unknown }).data,
      retry: false,
    };
  }

  private async process(claim: Claim) {
    const where = {
      noticeId: claim.noticeId,
      deviceId: claim.deviceId,
      leaseUntil: claim.leaseUntil,
    };
    const delivery = await this.db.pushDelivery.findFirst({
      where,
      include: {
        notice: {
          select: {
            recipientId: true,
            kind: true,
            createdAt: true,
            readAt: true,
          },
        },
        device: {
          include: {
            session: { include: { user: { include: { membership: true } } } },
          },
        },
      },
    });
    if (!delivery) return;
    const { notice, device } = delivery;
    const { session } = device;
    const actor = session.user;
    const now = new Date();
    const commit = (patch: Prisma.PushDeliveryUpdateManyMutationInput) =>
      this.db.pushDelivery.updateMany({
        where,
        data: { leaseUntil: null, ...patch },
      });
    const stage = delivery.stage;
    const maxAge = +notice.createdAt + 24 * 3600_000;
    const allowed =
      !device.revokedAt &&
      !session.revokedAt &&
      session.expiresAt > now &&
      actor.id === notice.recipientId &&
      locallyEligible(actor, this.env, now) &&
      !suppressedNotices(actor.notificationPreferences).includes(notice.kind);
    if (
      !allowed ||
      Date.now() > maxAge ||
      delivery.attempts >= 6 ||
      (notice.readAt && stage === 'PENDING')
    ) {
      await commit({ stage: 'FAILED' });
      return;
    }

    const retry = () =>
      commit({
        attempts: { increment: 1 },
        availableAt: new Date(
          +now + Math.min(3600, 30 * 2 ** delivery.attempts) * 1000,
        ),
      });
    const update = async (entry: ExpoResult | undefined): Promise<void> => {
      if (!entry || entry.details?.error === 'MessageRateExceeded') {
        await retry();
        return;
      }
      const invalid = entry.details?.error === 'DeviceNotRegistered';
      if (invalid) {
        await this.db.pushDevice.updateMany({
          where: {
            id: device.id,
            registeredAt: device.registeredAt,
            revokedAt: null,
          },
          data: { revokedAt: now },
        });
      }
      if (entry.status !== 'ok') {
        await commit({ stage: 'FAILED' });
        return;
      }
      if (stage === 'TICKET') {
        await commit({ stage: 'PROVIDER_ACCEPTED' });
        return;
      }
      if (!entry.id || entry.id.length > 100) {
        await commit({ stage: 'FAILED' });
        return;
      }
      await commit({
        stage: 'TICKET',
        ticketId: entry.id,
        attempts: 0,
        availableAt: new Date(+now + 15 * 60000),
      });
    };

    try {
      if (stage === 'PENDING') {
        if (
          !usesDeclaredDomain(actor, this.env) &&
          !(await this.verification.verify(actor.id))
        ) {
          await commit({ stage: 'FAILED' });
          return;
        }
        const result = await this.post('send', [
          {
            to: device.token,
            title: 'RuTeam',
            body: 'Tienes una actualización en RuTeam.',
            ttl: 3600,
            data: {
              route: '/notifications',
              notificationId: delivery.noticeId,
            },
          },
        ]);
        if (result.retry) {
          await retry();
          return;
        }
        if (result.data === null) {
          await commit({ stage: 'FAILED' });
          return;
        }
        await update((result.data as ExpoResult[] | undefined)?.[0]);
      } else if (delivery.ticketId) {
        const result = await this.post('getReceipts', {
          ids: [delivery.ticketId],
        });
        if (result.retry) {
          await retry();
          return;
        }
        if (result.data === null) {
          await commit({ stage: 'FAILED' });
          return;
        }
        await update(
          (result.data as Record<string, ExpoResult> | undefined)?.[
            delivery.ticketId
          ],
        );
      } else await commit({ stage: 'FAILED' });
    } catch {
      await retry();
    }
  }
}
