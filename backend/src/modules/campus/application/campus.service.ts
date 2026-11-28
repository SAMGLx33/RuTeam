import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { CampusRepository } from '../infrastructure/repositories/campus.repository.js';
function meetingPoint(
  point: Awaited<ReturnType<CampusRepository['listActive']>>[number],
) {
  return {
    id: point.id,
    name: point.name,
    campus: point.campus,
    campusSiteId: point.kind === 'CAMPUS' ? point.id : point.campusSiteId,
    sourceUrl: point.sourceUrl,
    kind: point.kind,
    description: point.description,
    accessReference: point.accessReference,
    level: point.level,
    demo: point.demo,
    latitude: point.latitude === null ? null : Number(point.latitude),
    longitude: point.longitude === null ? null : Number(point.longitude),
  };
}
@Injectable()
export class CampusService {
  constructor(private readonly repository: CampusRepository) {}
  async destinations() {
    return (await this.repository.listActive(true)).map((point) => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }));
  }
  async meetingPoints() {
    return (await this.repository.listActive()).map(meetingPoint);
  }
  async publicationPoint() {
    const site = await this.repository.publicationPoint();
    if (site?.latitude == null || site.longitude == null)
      throw new ServiceUnavailableException(
        'Falta configurar la referencia pública de Ciudadela Pampalinda. Contacta al responsable del entorno.',
      );
    return meetingPoint(site);
  }
}
