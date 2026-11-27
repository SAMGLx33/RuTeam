import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
@Injectable()
export class CampusRepository {
  constructor(private readonly db: PrismaService) {}
  listActive(legacy = false) {
    return this.db.campusDestination.findMany({
      where: {
        active: true,
        campus: 'USC',
        ...(legacy
          ? {
              kind: { in: ['ENTRANCE', 'PARKING', 'OTHER'] },
              latitude: { not: null },
              longitude: { not: null },
            }
          : {}),
      },
      orderBy: { name: 'asc' },
    });
  }
}
