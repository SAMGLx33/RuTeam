import { Injectable } from '@nestjs/common';
import { CampusRepository } from '../infrastructure/repositories/campus.repository.js';
@Injectable()
export class CampusService {
  constructor(private readonly repository: CampusRepository) {}
  async destinations() {
    return (await this.repository.listActive()).map((point) => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }));
  }
}
