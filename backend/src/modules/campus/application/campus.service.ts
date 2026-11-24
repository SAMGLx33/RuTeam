import { Injectable } from '@nestjs/common';
import { CampusRepository } from '../infrastructure/repositories/campus.repository.js';
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
    return (await this.repository.listActive()).map((point) => ({
      id: point.id,
      name: point.name,
      campus: point.campus,
      kind: point.kind,
      description: point.description,
      accessReference: point.accessReference,
      level: point.level,
      demo: point.demo,
      latitude: point.latitude === null ? null : Number(point.latitude),
      longitude: point.longitude === null ? null : Number(point.longitude),
    }));
  }
}
