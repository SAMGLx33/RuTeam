import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  NotificationPreferences,
  NotificationSettings,
} from '@ruteam/contracts';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import type { SessionPrincipal } from '../../auth/application/auth.service.js';
import type { PushDeviceDto } from './notification-settings.dto.js';
import { NotificationSettingsRepository } from './notification-settings.repository.js';
import { notificationPreferences } from './notification-preferences.js';

@Injectable()
export class NotificationSettingsService {
  constructor(
    private readonly repository: NotificationSettingsRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  async settings(userId: string): Promise<NotificationSettings> {
    const [user, devices] = await this.repository.view(userId);
    return {
      preferences: notificationPreferences(user.notificationPreferences),
      nativePushConfigured: this.env.EXPO_PUSH_ENABLED,
      devices: devices.map(({ id, platform, registeredAt }) => ({
        id,
        platform: platform === 'IOS' ? 'IOS' : 'ANDROID',
        registeredAt: registeredAt.toISOString(),
      })),
    };
  }

  async update(userId: string, input: NotificationPreferences) {
    await this.repository.update(userId, input);
    return this.settings(userId);
  }

  async register(actor: SessionPrincipal, input: PushDeviceDto) {
    if (!this.env.EXPO_PUSH_ENABLED)
      throw new ServiceUnavailableException('Registro push sin configurar');
    const installation = createHash('sha256')
      .update(input.installationSecret)
      .digest('hex');
    const device = await this.repository.register(
      actor.userId,
      actor.sessionId,
      installation,
      input,
    );
    if (!device)
      throw new NotFoundException('Registro de dispositivo no disponible');
    return device;
  }

  async revoke(userId: string, id: string) {
    if (!(await this.repository.revoke(userId, id)).count)
      throw new NotFoundException('Dispositivo propio no disponible');
  }
}
