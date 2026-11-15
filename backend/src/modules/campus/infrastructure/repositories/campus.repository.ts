import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
@Injectable()
export class CampusRepository {
  constructor(private readonly db: PrismaService) {}
  listActive() {
    return this.db.campusDestination.findMany({
      where: { active: true, campus: 'USC' },
      orderBy: { name: 'asc' },
    });
  }
}
