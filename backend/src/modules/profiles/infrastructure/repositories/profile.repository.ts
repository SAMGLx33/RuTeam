import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
@Injectable()
export class ProfileRepository {
  constructor(private readonly db: PrismaService) {}
  updateName(userId: string, displayName: string) {
    return this.db.profile.update({
      where: { userId },
      data: { displayName },
      select: { displayName: true },
    });
  }
}
