import { chatAccess } from '../../chat/domain/chat.policy.js';
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js';

@Injectable()
export class RealtimeAccess {
  constructor(private readonly db: PrismaService) {}

  async trip(
    tripId: string,
    actor: string,
    kind: 'TRIP' | 'TRACKING' | 'CHAT',
  ) {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      select: {
        driverId: true,
        status: true,
        finishedAt: true,
        reservations: {
          where: { members: { some: { userId: actor } } },
          select: { status: true, boardedAt: true, noShowAt: true },
        },
        pickupProposals: {
          where: { requesterId: actor },
          take: 1,
          select: { id: true },
        },
      },
    });
    if (!trip) return false;
    const driver = trip.driverId === actor;
    const confirmed = trip.reservations.filter(
      ({ status }) => status === 'CONFIRMED',
    );
    if (kind === 'TRIP')
      return (
        driver ||
        trip.reservations.length > 0 ||
        trip.pickupProposals?.length > 0
      );
    if (kind === 'TRACKING')
      return (
        trip.status === 'EN_CURSO' &&
        (driver || confirmed.some(({ noShowAt }) => !noShowAt))
      );
    return (
      chatAccess(trip, actor, confirmed[0] ?? null, new Date()) !== 'DENIED'
    );
  }
}
