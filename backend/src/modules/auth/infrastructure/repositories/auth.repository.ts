import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
const userInclude = {
  profile: true,
  membership: true,
  driverEligibility: true,
  vehicles: { include: { document: true } },
} as const;
@Injectable()
export class AuthRepository {
  constructor(private readonly db: PrismaService) {}
  findIdentity(identity: string) {
    return this.db.user.findUnique({
      where: { demoIdentity: identity },
      include: userInclude,
    });
  }
  findUser(id: string) {
    return this.db.user.findUnique({ where: { id }, include: userInclude });
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
