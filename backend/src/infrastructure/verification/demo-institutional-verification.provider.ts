import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { InstitutionalVerificationProvider } from './institutional-verification.provider.js';
import { isActiveMembership } from '../../modules/institutional-membership/domain/membership.policy.js';
@Injectable()
export class DemoInstitutionalVerificationProvider extends InstitutionalVerificationProvider {
  constructor(private readonly db: PrismaService) {
    super();
  }
  async verify(userId: string): Promise<boolean> {
    const user = await this.db.user.findUnique({
      where: { id: userId },
      include: { membership: true },
    });
    const membership = user?.membership ?? null;
    return (
      !!user &&
      !!user.demoIdentity &&
      !user.disabledAt &&
      membership?.verifiedBy === 'DEMO' &&
      isActiveMembership(membership, new Date())
    );
  }
}
