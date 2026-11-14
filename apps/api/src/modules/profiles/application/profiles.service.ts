import { Injectable } from '@nestjs/common';
import { ProfileRepository } from '../infrastructure/repositories/profile.repository.js';
@Injectable()
export class ProfilesService {
  constructor(private readonly repository: ProfileRepository) {}
  update(userId: string, displayName: string) {
    return this.repository.updateName(userId, displayName);
  }
}
