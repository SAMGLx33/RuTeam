import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { chatRetentionMs, type ChatMarker } from '../../domain/chat.policy.js';

export const chatPageSize = 20;

const activeStatuses = ['PROGRAMADO', 'EN_CURSO'] as const;
const messageOrder = [
  { createdAt: 'desc' },
  { id: 'desc' },
] satisfies Prisma.TripChatMessageOrderByWithRelationInput[];
const messageInclude = {
  author: { select: { profile: { select: { displayName: true } } } },
} as const;

function conversationSelect(actorId: string) {
  return {
    id: true,
    driverId: true,
    status: true,
    originLabel: true,
    departureAt: true,
    finishedAt: true,
    stops: { orderBy: { position: 'desc' }, take: 1, select: { label: true } },
    chatReads: {
      where: { userId: actorId },
      select: { lastReadAt: true, lastReadMessageId: true },
    },
    chatMessages: {
      where: { authorId: { not: actorId } },
      orderBy: messageOrder,
      take: 1,
      select: { id: true, createdAt: true },
    },
  } satisfies Prisma.TripSelect;
}

function confirmedPassenger(actorId: string) {
  return {
    status: 'CONFIRMED',
    noShowAt: null,
    members: { some: { userId: actorId } },
  } satisfies Prisma.ReservationWhereInput;
}

function before(time: 'createdAt' | 'departureAt', cursor?: ChatMarker) {
  return cursor
    ? {
        OR: [
          { [time]: { lt: cursor.at } },
          { [time]: cursor.at, id: { lt: cursor.id } },
        ],
      }
    : {};
}

function createChatUnit(
  tx: Prisma.TransactionClient,
  tripId: string,
  actorId: string,
) {
  return {
    trip: () =>
      tx.trip.findUniqueOrThrow({
        where: { id: tripId },
        select: {
          ...conversationSelect(actorId),
          reservations: {
            where: confirmedPassenger(actorId),
            take: 1,
            select: { boardedAt: true },
          },
        },
      }),
    history: (cursor?: ChatMarker) =>
      tx.tripChatMessage.findMany({
        where: { tripId, ...before('createdAt', cursor) },
        include: messageInclude,
        orderBy: messageOrder,
        take: chatPageSize + 1,
      }),
    existing: (clientMessageId: string) =>
      tx.tripChatMessage.findUnique({
        where: {
          tripId_authorId_clientMessageId: {
            tripId,
            authorId: actorId,
            clientMessageId,
          },
        },
        include: messageInclude,
      }),
    message: (id: string) =>
      tx.tripChatMessage.findFirst({
        where: { id, tripId },
        select: { id: true, createdAt: true },
      }),
    async createMessage(clientMessageId: string, body: string, now: Date) {
      const last = await tx.tripChatMessage.findFirst({
        where: { tripId },
        orderBy: messageOrder,
        select: { createdAt: true },
      });
      // Under the trip lock the watermark always advances, even in the same millisecond.
      const createdAt = new Date(
        Math.max(now.getTime(), (last?.createdAt.getTime() ?? 0) + 1),
      );
      return tx.tripChatMessage.create({
        data: { tripId, authorId: actorId, clientMessageId, body, createdAt },
        include: messageInclude,
      });
    },
    async notifyOthers(driverId: string, createdAt: Date) {
      const users = await tx.user.findMany({
        where: {
          id: { not: actorId },
          disabledAt: null,
          emailVerifiedAt: { not: null },
          membership: {
            is: {
              status: 'ACTIVE',
              group: 'STUDENT',
              validUntil: { gt: createdAt },
            },
          },
          OR: [
            { id: driverId },
            {
              reservationMemberships: {
                some: {
                  reservation: { tripId, status: 'CONFIRMED', noShowAt: null },
                },
              },
            },
          ],
        },
        select: { id: true },
      });
      for (const { id: recipientId } of users)
        await tx.tripNotification.upsert({
          where: {
            recipientId_tripId_kind: {
              recipientId,
              tripId,
              kind: 'CHAT_MESSAGE',
            },
          },
          create: {
            recipientId,
            tripId,
            kind: 'CHAT_MESSAGE',
            matchType: null,
            createdAt,
          },
          update: { createdAt, readAt: null },
        });
    },
    async markRead(marker: ChatMarker) {
      const data = { lastReadAt: marker.at, lastReadMessageId: marker.id };
      await tx.tripChatRead.upsert({
        where: { tripId_userId: { tripId, userId: actorId } },
        create: { tripId, userId: actorId, ...data },
        update: data,
      });
      await tx.tripNotification.updateMany({
        where: {
          tripId,
          recipientId: actorId,
          kind: 'CHAT_MESSAGE',
          readAt: null,
          createdAt: { lte: marker.at },
        },
        data: { readAt: new Date() },
      });
    },
  };
}

export type ChatUnit = ReturnType<typeof createChatUnit>;
export type ChatTripRow = Prisma.TripGetPayload<{
  select: ReturnType<typeof conversationSelect>;
}>;
export type ChatMessageRow = Prisma.TripChatMessageGetPayload<{
  include: typeof messageInclude;
}>;

@Injectable()
export class ChatRepository {
  constructor(private readonly db: PrismaService) {}

  conversations(actorId: string, now: Date, cursor?: ChatMarker) {
    const membership = confirmedPassenger(actorId);
    return this.db.trip.findMany({
      where: {
        AND: [
          before('departureAt', cursor),
          {
            OR: [
              {
                status: { in: [...activeStatuses] },
                OR: [
                  { driverId: actorId },
                  { reservations: { some: membership } },
                ],
              },
              {
                status: 'COMPLETADO',
                finishedAt: { gt: new Date(now.getTime() - chatRetentionMs) },
                OR: [
                  { driverId: actorId },
                  {
                    reservations: {
                      some: { ...membership, boardedAt: { not: null } },
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
      orderBy: [{ departureAt: 'desc' }, { id: 'desc' }],
      select: conversationSelect(actorId),
      take: chatPageSize + 1,
    });
  }

  withTripLock<T>(
    tripId: string,
    actorId: string,
    operation: (unit: ChatUnit) => Promise<T>,
  ) {
    return this.db.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: { driverId: true },
      });
      if (!trip) throw new NotFoundException('Conversación inexistente');
      // Same lock order as cancellation, confirmation, and trip transitions.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${trip.driverId}::uuid FOR NO KEY UPDATE`;
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
      if (!locked.length)
        throw new NotFoundException('Conversación inexistente');
      return operation(createChatUnit(tx, tripId, actorId));
    });
  }

  purgeExpired(now: Date) {
    const cutoff = new Date(now.getTime() - chatRetentionMs);
    return this.db.$transaction(async (tx) => {
      const expired = {
        OR: [
          { status: 'CANCELADO' },
          { status: 'COMPLETADO', finishedAt: { lte: cutoff } },
        ],
      } satisfies Prisma.TripWhereInput;
      const messages = await tx.tripChatMessage.findMany({
        where: { trip: expired },
        select: { id: true },
        take: 500,
      });
      if (messages.length)
        await tx.tripChatMessage.deleteMany({
          where: { id: { in: messages.map(({ id }) => id) } },
        });
      const receipts = await tx.tripChatRead.findMany({
        where: { trip: expired },
        select: { tripId: true, userId: true },
        take: 500,
      });
      if (receipts.length)
        await tx.tripChatRead.deleteMany({ where: { OR: receipts } });
    });
  }
}
