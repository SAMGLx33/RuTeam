import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import {
  pampalindaCode,
  pampalindaReference,
} from '../../domain/publication-campus.js';
@Injectable()
export class CampusRepository {
  constructor(private readonly db: PrismaService) {}
  completePublicationReference() {
    const { latitude, longitude, sourceUrl } = pampalindaReference;
    return this.db.$executeRaw`
      UPDATE "CampusDestination"
      SET latitude = COALESCE(latitude, ${latitude}::numeric),
          longitude = COALESCE(longitude, ${longitude}::numeric),
          "sourceUrl" = ${sourceUrl}
      WHERE code = ${pampalindaCode} AND campus = 'USC' AND kind = 'CAMPUS'
        AND active AND NOT demo AND (latitude IS NULL OR longitude IS NULL)
    `;
  }
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
