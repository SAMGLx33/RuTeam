import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';
import type { NotificationPreferences } from '@ruteam/contracts';
import type { PushDeviceDto } from './notification-settings.dto.js';

const deviceView = { id: true, platform: true, registeredAt: true } as const;
@Injectable()
export class NotificationSettingsRepository {
  constructor(private readonly db: PrismaService) {}
  async view(userId: string) {
    return Promise.all([
      this.db.user.findUniqueOrThrow({
        where: { id: userId },
        select: { notificationPreferences: true },
      }),
      this.db.pushDevice.findMany({
        where: {
          revokedAt: null,
          session: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
        },
        select: deviceView,
        orderBy: { registeredAt: 'desc' },
        take: 25,
      }),
    ]);
  }

  update(userId: string, input: NotificationPreferences) {
    return this.db.user.update({
      where: { id: userId },
      data: { notificationPreferences: { ...input } },
    });
  }

  register(
    userId: string,
    sessionId: string,
    installationHash: string,
    input: PushDeviceDto,
  ) {
    return this.db.$transaction(async (tx) => {
      // Serialize token rotations, including two first-time registrations of the same token.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${input.token}))::text`;
      const session = await tx.authSession.findFirst({
        where: {
          id: sessionId,
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { disabledAt: null },
        },
        select: { id: true },
      });
      if (!session) return null;
      const device = await tx.pushDevice.findUnique({
        where: { token: input.token },
      });
      if (device && device.installationHash !== installationHash) return null;
      if (device?.sessionId === sessionId && !device.revokedAt)
        return deviceViewFrom(device);
      if (device)
        await tx.pushDelivery.deleteMany({
          where: { deviceId: device.id, stage: { in: ['PENDING', 'TICKET'] } },
        });
      const info = {
        sessionId,
        platform: input.platform,
        revokedAt: null,
        registeredAt: new Date(),
      };
      return device
        ? tx.pushDevice.update({
            where: { id: device.id },
            data: info,
            select: deviceView,
          })
        : tx.pushDevice.create({
            data: { ...info, token: input.token, installationHash },
            select: deviceView,
          });
    });
  }

  revoke(userId: string, id: string) {
    return this.db.pushDevice.updateMany({
      where: { id, session: { userId } },
      data: { revokedAt: new Date() },
    });
  }
}

function deviceViewFrom(device: {
  id: string;
  platform: string;
  registeredAt: Date;
}) {
  const { id, platform, registeredAt } = device;
  return { id, platform, registeredAt };
}
