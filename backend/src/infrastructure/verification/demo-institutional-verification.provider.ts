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
    const membership = await this.db.institutionalMembership.findUnique({
      where: { userId },
    });
    return (
      membership?.verifiedBy === 'DEMO' &&
      isActiveMembership(membership, new Date())
    );
  }
}
