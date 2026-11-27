import { randomUUID } from 'node:crypto';
import type { StudentEligibilityStatus } from '@ruteam/contracts';
import { recordInboxNotice } from '../../../mobility/infrastructure/trip-notices.js';
import { Injectable } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { validateOnboardingTransition } from '../../domain/account-policy.js';
const userInclude = {
  profile: true,
  membership: true,
  driverEligibility: true,
  vehicles: { include: { document: true } },
} as const;
@Injectable()
export class AuthRepository {
  constructor(private readonly db: PrismaService) {}
  observeEligibility(user: SessionUser, status: StudentEligibilityStatus) {
    if (
      user.observedEligibility === status ||
      status === 'PENDING_VERIFICATION'
    )
      return;
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${user.id}::uuid FOR NO KEY UPDATE`;
      const current = await tx.user.findUnique({
        where: { id: user.id },
        select: {
          disabledAt: true,
          observedEligibility: true,
          membership: { select: { updatedAt: true } },
        },
      });
      if (
        !current ||
        current.disabledAt ||
        current.observedEligibility === status ||
        current.observedEligibility !== user.observedEligibility ||
        current.membership?.updatedAt.getTime() !==
          user.membership?.updatedAt.getTime()
      )
        return;
      await tx.user.update({
        where: { id: user.id },
        data: { observedEligibility: status },
      });
      if (current.observedEligibility)
        await recordInboxNotice(
          tx,
          user.id,
          'ELIGIBILITY_CHANGED',
          randomUUID(),
        );
    });
  }
  findIdentity(identity: string) {
    return this.db.user.findUnique({
      where: { demoIdentity: identity },
      include: userInclude,
    });
  }
  findUser(id: string) {
    return this.db.user.findUnique({ where: { id }, include: userInclude });
  }
  findAccount(email: string) {
    return this.db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: userInclude,
    });
  }
  createAccount(
    email: string,
    passwordHash: string,
    name: string,
    usagePreference: 'PASSENGER' | 'DRIVER_AND_PASSENGER',
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))`;
      if (
        await tx.user.findFirst({
          where: { email: { equals: email, mode: 'insensitive' } },
        })
      )
        return null;
      return tx.user.create({
        data: {
          email,
          passwordHash,
          usagePreference,
          profile: { create: { displayName: name } },
        },
        include: userInclude,
      });
    });
  }
  createCredentialSession(
    userId: string,
    expectedHash: string,
    tokenHash: string,
    expiresAt: Date,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: userId } });
      if (!user || user.disabledAt || user.passwordHash !== expectedHash)
        return null;
      return tx.authSession.create({ data: { userId, tokenHash, expiresAt } });
    });
  }
  issueAccountToken(
    userId: string,
    purpose: 'EMAIL_CONFIRMATION' | 'PASSWORD_RESET',
    tokenHash: string,
    expiresAt: Date,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const now = Date.now();
      const latest = await tx.accountToken.findFirst({
        where: { userId, purpose },
        orderBy: { createdAt: 'desc' },
      });
      if (latest && latest.createdAt.getTime() > now - 60000) return null;
      if (
        (await tx.accountToken.count({
          where: {
            userId,
            purpose,
            createdAt: { gt: new Date(now - 3600000) },
          },
        })) >= 10
      )
        return null;
      await tx.accountToken.updateMany({
        where: { userId, purpose, consumedAt: null },
        data: { consumedAt: new Date() },
      });
      return tx.accountToken.create({
        data: { userId, purpose, tokenHash, expiresAt },
      });
    });
  }
  consumeAccountToken(
    tokenHash: string,
    purpose: 'EMAIL_CONFIRMATION' | 'PASSWORD_RESET',
    passwordHash?: string,
  ) {
    if (!passwordHash) return Promise.resolve(false);
    return this.db.$transaction(async (tx) => {
      const token = await tx.accountToken.findUnique({ where: { tokenHash } });
      if (!token || token.purpose !== purpose) return false;
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${token.userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUnique({ where: { id: token.userId } });
      if (!user || user.disabledAt || user.demoIdentity !== null) return false;
      const now = new Date();
      const claimed = await tx.accountToken.updateMany({
        where: {
          id: token.id,
          purpose,
          consumedAt: null,
          expiresAt: { gt: now },
        },
        data: { consumedAt: now },
      });
      if (claimed.count !== 1) return false;
      await tx.user.update({
        where: { id: user.id },
        data:
          purpose === 'EMAIL_CONFIRMATION'
            ? { emailVerifiedAt: now, passwordHash }
            : { passwordHash },
      });
      {
        await tx.authSession.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.accountToken.updateMany({
          where: { userId: user.id, consumedAt: null },
          data: { consumedAt: now },
        });
      }
      return true;
    });
  }
  updateOnboarding(
    userId: string,
    input: {
      step: number;
      usagePreference?: 'PASSENGER' | 'DRIVER_AND_PASSENGER';
      complete?: boolean;
    },
    isEligible: (user: SessionUser) => Promise<boolean>,
  ) {
    return this.db.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId}::uuid FOR UPDATE`;
      const user = await tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: userInclude,
      });
      if (user.disabledAt) throw new ForbiddenException('Cuenta no disponible');
      const preference = input.usagePreference ?? user.usagePreference;
      const step = validateOnboardingTransition(
        user.onboardingStep,
        input.step,
        preference,
        !!user.emailVerifiedAt,
        input.complete ? await isEligible(user) : false,
        input.complete === true,
      );
      return tx.user.update({
        where: { id: userId },
        data: {
          onboardingStep: step,
          usagePreference: preference,
          ...(input.complete
            ? {
                onboardingCompletedAt: user.onboardingCompletedAt ?? new Date(),
              }
            : {}),
        },
        include: userInclude,
      });
    });
  }
  findSession(tokenHash: string) {
    return this.db.authSession.findUnique({ where: { tokenHash } });
  }
  createSession(userId: string, tokenHash: string, expiresAt: Date) {
    return this.db.authSession.create({
      data: { userId, tokenHash, expiresAt },
    });
  }
  recordVerification(userId: string, allowed: boolean) {
    return this.db.verificationAttempt.create({
      data: {
        userId,
        outcome: allowed ? 'ALLOWED' : 'DENIED',
        provider: 'DEMO',
      },
    });
  }
  revokeSession(id: string) {
    return this.db.authSession.updateMany({
      where: { id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }
}
export type SessionUser = NonNullable<
  Awaited<ReturnType<AuthRepository['findUser']>>
>;
