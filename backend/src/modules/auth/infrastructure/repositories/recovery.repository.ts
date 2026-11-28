import { Injectable } from '@nestjs/common';
import type { RecoveryContactInput } from '@ruteam/contracts';
import type { Prisma } from '../../../../generated/prisma/client.js';
import type { RecoveryOtpPurpose } from '../../../../generated/prisma/enums.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { SessionPrincipal } from '../../application/auth.service.js';
import {
  otpMaxAttempts,
  otpMaxEmissions,
  otpTiming,
  otpWindowMs,
} from '../../domain/recovery-policy.js';

type Tx = Prisma.TransactionClient;

@Injectable()
export class RecoveryRepository {
  constructor(private readonly db: PrismaService) {}

  findAccount(email: string) {
    return this.db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      select: { id: true },
    });
  }

  findCredentials(userId: string) {
    return this.db.user.findUnique({
      where: { id: userId },
      select: { email: true, passwordHash: true },
    });
  }

  contacts(userId: string) {
    return this.db.recoveryContact.findMany({ where: { userId } });
  }

  async confirmationTiming(userId: string, contactKey: string, now: Date) {
    const { prior, retryAt } = await this.issuanceState(
      this.db,
      userId,
      'CONTACT_CONFIRMATION',
      now,
      contactKey,
    );
    const otp = prior.findLast(
      (item) =>
        item.contactKey === contactKey &&
        item.purpose === 'CONTACT_CONFIRMATION' &&
        item.consumedAt === null,
    );
    return { expiresAt: otp?.expiresAt ?? null, resendAt: retryAt };
  }

  async withAccount<T>(
    userId: string,
    action: (tx: Tx, now: Date) => Promise<T>,
    principal?: SessionPrincipal,
    passwordHash?: string,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({
        where: { id: userId },
        select: {
          disabledAt: true,
          passwordHash: true,
          demoIdentity: true,
          declaredDomainAccessAt: true,
        },
      });
      if (
        !user ||
        user.disabledAt ||
        !user.passwordHash ||
        !user.declaredDomainAccessAt ||
        user.demoIdentity !== null ||
        (passwordHash !== undefined && user.passwordHash !== passwordHash)
      )
        return null;
      const now = new Date();
      if (
        principal &&
        !(await tx.authSession.findFirst({
          where: {
            id: principal.sessionId,
            userId,
            revokedAt: null,
            expiresAt: { gt: now },
          },
          select: { id: true },
        }))
      )
        return null;
      return action(tx, now);
    });
  }

  configure(
    principal: SessionPrincipal,
    hash: string,
    input: RecoveryContactInput,
  ) {
    return this.withAccount(
      principal.userId,
      async (tx, now) => {
        const userId = principal.userId;
        const pending = await this.contact(tx, userId, 'CONTACT_CONFIRMATION');
        if (
          pending?.channel === input.channel &&
          pending.contact === input.contact
        )
          return true;
        await tx.recoveryContact.upsert({
          where: { userId_pending: { userId, pending: true } },
          create: { userId, pending: true, ...input },
          update: input,
        });
        await this.invalidateOtps(tx, userId, now, 'CONTACT_CONFIRMATION');
        return true;
      },
      principal,
      hash,
    );
  }

  contact(tx: Tx, userId: string, purpose: RecoveryOtpPurpose) {
    return tx.recoveryContact.findUnique({
      where: {
        userId_pending: { userId, pending: purpose === 'CONTACT_CONFIRMATION' },
      },
    });
  }

  async issue(
    tx: Tx,
    userId: string,
    purpose: RecoveryOtpPurpose,
    now: Date,
    contactKey: string,
    createOtp: (
      prior: { id: string; purpose: RecoveryOtpPurpose; digest: string }[],
    ) => {
      id: string;
      digest: string;
      code: string;
    },
  ) {
    // All accounts sharing a contact serialize here as well as on their own user row.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${contactKey}, 7587))`;
    const { prior, retryAt, limited } = await this.issuanceState(
      tx,
      userId,
      purpose,
      now,
      contactKey,
    );
    if (retryAt > now)
      return {
        kind: limited ? ('EMISSION_LIMIT' as const) : ('COOLDOWN' as const),
        retryAt,
      };
    const { id, digest, code } = createOtp(prior);
    await this.invalidateOtps(tx, userId, now, purpose);
    await tx.recoveryOtp.create({
      data: {
        id,
        digest,
        contactKey,
        userId,
        purpose,
        createdAt: now,
        expiresAt: new Date(now.getTime() + otpTiming.expiresInSeconds * 1000),
      },
    });
    return { kind: 'ISSUED' as const, code };
  }

  private async issuanceState(
    tx: Tx,
    userId: string,
    purpose: RecoveryOtpPurpose,
    now: Date,
    contactKey: string,
  ) {
    const recent = await tx.recoveryOtp.findMany({
      where: {
        OR: [{ userId }, { contactKey }],
        createdAt: { gt: new Date(now.getTime() - otpWindowMs) },
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        userId: true,
        purpose: true,
        contactKey: true,
        digest: true,
        createdAt: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    const prior = recent.filter((item) => item.userId === userId);
    const sameContact = recent.filter((item) => item.contactKey === contactKey);
    const accountQuota = prior.at(-otpMaxEmissions);
    const contactQuota = sameContact.at(-otpMaxEmissions);
    const last = recent.findLast((item) => item.purpose === purpose);
    return {
      prior,
      limited: Boolean(accountQuota || contactQuota),
      retryAt: new Date(
        Math.max(
          now.getTime(),
          accountQuota ? accountQuota.createdAt.getTime() + otpWindowMs : 0,
          contactQuota ? contactQuota.createdAt.getTime() + otpWindowMs : 0,
          last
            ? last.createdAt.getTime() + otpTiming.resendAfterSeconds * 1000
            : 0,
        ),
      ),
    };
  }

  async check(
    tx: Tx,
    userId: string,
    purpose: RecoveryOtpPurpose,
    now: Date,
    contactKey: string,
    matches: (id: string, digest: string) => boolean,
  ) {
    const otp = await tx.recoveryOtp.findFirst({
      where: { userId, purpose, contactKey, consumedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!otp) return 'MISSING' as const;
    if (otp.expiresAt <= now) return 'EXPIRED' as const;
    if (otp.attempts >= otpMaxAttempts) return 'ATTEMPTS' as const;
    if (!matches(otp.id, otp.digest)) {
      await tx.recoveryOtp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      return otp.attempts + 1 >= otpMaxAttempts
        ? ('ATTEMPTS' as const)
        : otpMaxAttempts - otp.attempts - 1;
    }
    await tx.recoveryOtp.update({
      where: { id: otp.id },
      data: { consumedAt: now },
    });
    return 'VALID' as const;
  }

  async confirmContact(
    tx: Tx,
    userId: string,
    now: Date,
    contact: RecoveryContactInput,
  ) {
    const data = {
      channel: contact.channel,
      contact: contact.contact,
      confirmedAt: now,
      transport: 'CONSOLE' as const,
    };
    await tx.recoveryContact.upsert({
      where: { userId_pending: { userId, pending: false } },
      create: { ...data, userId, pending: false },
      update: data,
    });
    await tx.recoveryContact.delete({
      where: { userId_pending: { userId, pending: true } },
    });
    await this.invalidateOtps(tx, userId, now);
    await tx.accountToken.updateMany({
      where: {
        userId,
        purpose: { in: ['PASSWORD_RESET', 'OTP_PASSWORD_RESET'] },
        consumedAt: null,
      },
      data: { consumedAt: now },
    });
  }

  async grant(
    tx: Tx,
    userId: string,
    now: Date,
    tokenHash: string,
    expiresAt: Date,
  ) {
    await tx.accountToken.updateMany({
      where: { userId, purpose: 'OTP_PASSWORD_RESET', consumedAt: null },
      data: { consumedAt: now },
    });
    await tx.accountToken.create({
      data: { userId, purpose: 'OTP_PASSWORD_RESET', tokenHash, expiresAt },
    });
  }

  async reset(tokenHash: string, passwordHash: string) {
    const token = await this.db.accountToken.findUnique({
      where: { tokenHash },
    });
    if (!token || token.purpose !== 'OTP_PASSWORD_RESET') return false;
    const { userId } = token;
    return this.withAccount(userId, async (tx, now) => {
      const claimed = await tx.accountToken.updateMany({
        where: { id: token.id, consumedAt: null, expiresAt: { gt: now } },
        data: { consumedAt: now },
      });
      if (!claimed.count) return false;
      await tx.user.update({ where: { id: userId }, data: { passwordHash } });
      await tx.authSession.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: now },
      });
      await tx.accountToken.updateMany({
        where: { userId, consumedAt: null },
        data: { consumedAt: now },
      });
      await tx.recoveryContact.deleteMany({ where: { userId, pending: true } });
      await this.invalidateOtps(tx, userId, now);
      return true;
    });
  }

  private invalidateOtps(
    tx: Tx,
    userId: string,
    now: Date,
    purpose?: RecoveryOtpPurpose,
  ) {
    return tx.recoveryOtp.updateMany({
      where: { userId, purpose, consumedAt: null },
      data: { consumedAt: now },
    });
  }
}
