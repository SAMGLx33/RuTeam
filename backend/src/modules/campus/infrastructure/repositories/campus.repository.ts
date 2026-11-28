import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { pampalindaCode } from '../../domain/publication-campus.js';
@Injectable()
export class CampusRepository {
  constructor(private readonly db: PrismaService) {}
  publicationPoint() {
    return this.db.campusDestination.findFirst({
      where: {
        code: pampalindaCode,
        active: true,
        demo: false,
        campus: 'USC',
        kind: 'CAMPUS',
      },
    });
  }
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
