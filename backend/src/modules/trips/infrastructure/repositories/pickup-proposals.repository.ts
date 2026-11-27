import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  PickupProposalInput,
  PickupProposalView,
} from '@ruteam/contracts';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { lockParticipationChanges } from '../../../reservations/infrastructure/participation-lock.js';
import { recordTripNotice } from '../../../mobility/infrastructure/trip-notices.js';
import { requeueRecommendation } from '../../../mobility/infrastructure/repositories/requeue-recommendation.js';

const withRequester = {
  requester: { select: { profile: { select: { displayName: true } } } },
} as const;
type StoredProposal = Prisma.PickupProposalGetPayload<{
  include: typeof withRequester;
}>;

export function proposalView(
  row: StoredProposal,
  closed = false,
): PickupProposalView {
  return {
    id: row.id,
    label: row.label,
    instructions: row.instructions ?? undefined,
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    status: closed && row.status === 'PENDING' ? 'EXPIRED' : row.status,
    requesterName: row.requester.profile?.displayName ?? null,
    acceptedStopId: row.acceptedStopId,
  };
}

function proposalUnit(tx: Prisma.TransactionClient, tripId: string) {
  return {
    trip: () =>
      tx.trip.findUniqueOrThrow({
        where: { id: tripId },
        include: { stops: { orderBy: { position: 'asc' } } },
      }),
    activeRequester: (id: string) =>
      tx.user.count({ where: { id, disabledAt: null } }),
    pendingFor: (requesterId: string) =>
      tx.pickupProposal.findFirst({
        where: { tripId, requesterId, status: 'PENDING' },
      }),
    pendingCount: () =>
      tx.pickupProposal.count({ where: { tripId, status: 'PENDING' } }),
    create: async (
      requesterId: string,
      point: PickupProposalInput,
      driverId: string,
    ) => {
      const row = await tx.pickupProposal.create({
        data: { ...point, tripId, requesterId },
        include: withRequester,
      });
      await recordTripNotice(tx, tripId, 'PICKUP_PROPOSED', [driverId], row.id);
      return row;
    },
    find: (id: string) =>
      tx.pickupProposal.findFirst({
        where: { id, tripId },
        include: withRequester,
      }),
    reject: async (id: string, decidedAt: Date) => {
      const row = await tx.pickupProposal.update({
        where: { id },
        data: { status: 'REJECTED', decidedAt },
        include: withRequester,
      });
      await recordTripNotice(
        tx,
        tripId,
        'PICKUP_REJECTED',
        [row.requesterId],
        id,
      );
      return row;
    },
    accept: async (
      row: StoredProposal,
      position: number,
      decidedAt: Date,
      actorId: string,
    ) => {
      const affected = await tx.tripStop.findMany({
        where: { tripId, position: { gte: position } },
        select: { id: true },
        orderBy: { position: 'desc' },
      });
      for (const stop of affected)
        await tx.tripStop.update({
          where: { id: stop.id },
          data: { position: { increment: 1 } },
        });
      const stop = await tx.tripStop.create({
        data: {
          tripId,
          position,
          label: row.label,
          instructions: row.instructions,
          latitude: row.latitude,
          longitude: row.longitude,
          access: 'PICKUP',
        },
      });
      await tx.trip.update({
        where: { id: tripId },
        data: {
          version: { increment: 1 },
          events: { create: { actorId, type: 'PICKUP_PROPOSAL_ACCEPTED' } },
        },
      });
      await requeueRecommendation(tx, tripId);
      await recordTripNotice(
        tx,
        tripId,
        'PICKUP_ACCEPTED',
        [row.requesterId],
        row.id,
      );
      return tx.pickupProposal.update({
        where: { id: row.id },
        data: { status: 'ACCEPTED', decidedAt, acceptedStopId: stop.id },
        include: withRequester,
      });
    },
  };
}

export type ProposalUnit = ReturnType<typeof proposalUnit>;

@Injectable()
export class PickupProposalsRepository {
  constructor(private readonly db: PrismaService) {}

  withTrip<T>(
    tripId: string,
    fn: (unit: ProposalUnit) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      await lockParticipationChanges(tx);
      const rows = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
      if (!rows.length) throw new NotFoundException('Viaje inexistente');
      return fn(proposalUnit(tx, tripId));
    });
  }

  async list(actorId: string, tripId: string) {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true, status: true, departureAt: true },
    });
    if (!trip) throw new NotFoundException('Viaje inexistente');
    const rows = await this.db.pickupProposal.findMany({
      where: {
        tripId,
        ...(trip.driverId !== actorId && { requesterId: actorId }),
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
      include: withRequester,
    });
    return rows.map((row) =>
      proposalView(
        row,
        trip.status !== 'PROGRAMADO' || trip.departureAt <= new Date(),
      ),
    );
  }
}
