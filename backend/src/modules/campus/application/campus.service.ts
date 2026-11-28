import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
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
export class CampusService implements OnApplicationBootstrap {
  constructor(
    private readonly repository: CampusRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  async onApplicationBootstrap() {
    if (this.env.INSTITUTIONAL_ACCESS_MODE === 'DECLARED_DOMAIN')
      await this.repository.completePublicationReference();
  }
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
        'El servicio de publicación no pudo cargar Ciudadela Pampalinda.',
      );
    return meetingPoint(site);
  }
}
