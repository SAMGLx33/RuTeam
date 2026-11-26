import { Injectable } from '@nestjs/common';
import type { TripGroupPreview, TripGroupView } from '@ruteam/contracts';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { groupStatus } from '../../domain/group-state.js';

const groupInclude = {
  members: {
    where: { withdrawnAt: null },
    orderBy: [{ consentedAt: 'asc' }, { userId: 'asc' }],
    select: {
      userId: true,
      user: { select: { profile: { select: { displayName: true } } } },
    },
  },
  pickup: { select: { label: true } },
  dropoff: { select: { label: true } },
  trip: {
    select: {
      status: true,
      departureAt: true,
      providesHelmet: true,
      driver: { select: { profile: { select: { displayName: true } } } },
      rules: {
        select: {
          rule: { select: { id: true, code: true, description: true } },
        },
      },
    },
  },
} as const satisfies Prisma.TripGroupInclude;

export type Group = Prisma.TripGroupGetPayload<{
  include: typeof groupInclude;
}>;

export function groupPreview(group: Group): TripGroupPreview {
  return {
    tripId: group.tripId,
    pickupLabel: group.pickup.label,
    dropoffLabel: group.dropoff.label,
    expectedMembers: group.expectedMembers,
    expiresAt: group.expiresAt.toISOString(),
    departureAt: group.trip.departureAt.toISOString(),
    driverName: group.trip.driver.profile?.displayName ?? null,
    rules: group.trip.rules.map(({ rule }) => rule),
    providesHelmet: group.trip.providesHelmet,
  };
}

export function groupView(
  group: Group,
  actorId: string,
  now: Date,
): TripGroupView {
  return {
    ...groupPreview(group),
    id: group.id,
    status: groupStatus(group, now),
    isOrganizer: group.organizerId === actorId,
    consentedMembers: group.members.length,
    members: group.members.map(({ userId, user }) => ({
      name: user.profile?.displayName ?? null,
      isSelf: userId === actorId,
      isOrganizer: userId === group.organizerId,
    })),
    confirmedAt: group.confirmedAt?.toISOString() ?? null,
  };
}

export function groupsInTrip(tx: Prisma.TransactionClient, tripId: string) {
  return {
    group: (id: string) =>
      tx.tripGroup.findFirst({ where: { id, tripId }, include: groupInclude }),
    openConsent: (userId: string, now: Date) =>
      tx.tripGroupMember.findFirst({
        where: {
          userId,
          withdrawnAt: null,
          group: {
            tripId,
            confirmedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
          },
        },
        select: { groupId: true },
      }),
    create: (group: {
      organizerId: string;
      pickupId: string;
      dropoffId: string;
      expectedMembers: number;
      inviteHash: string;
      createdAt: Date;
      expiresAt: Date;
    }) =>
      tx.tripGroup.create({
        data: {
          tripId,
          ...group,
          members: {
            create: { userId: group.organizerId, consentedAt: group.createdAt },
          },
        },
        include: groupInclude,
      }),
    consent: (groupId: string, userId: string, at: Date) =>
      tx.tripGroupMember.upsert({
        where: { groupId_userId: { groupId, userId } },
        create: { groupId, userId, consentedAt: at },
        update: { consentedAt: at, withdrawnAt: null },
      }),
    withdraw: (groupId: string, userId: string, at: Date) =>
      tx.tripGroupMember.update({
        where: { groupId_userId: { groupId, userId } },
        data: { withdrawnAt: at },
      }),
    revoke: (id: string, at: Date) =>
      tx.tripGroup.update({
        where: { id },
        data: { revokedAt: at },
        include: groupInclude,
      }),
    changeInvitation: (id: string, inviteHash: string) =>
      tx.tripGroup.update({
        where: { id },
        data: { inviteHash },
        include: groupInclude,
      }),
    attachReservation: (
      groupId: string,
      userId: string,
      reservationId: string,
    ) =>
      tx.tripGroupMember.update({
        where: { groupId_userId: { groupId, userId } },
        data: { reservationId },
      }),
    lockMemberships: async (ids: string[]) => {
      await tx.$queryRaw`SELECT "userId" FROM "InstitutionalMembership" WHERE "userId" = ANY(${ids}::uuid[]) ORDER BY "userId" FOR SHARE`;
    },
    confirm: async (id: string, at: Date, recipients: string[]) => {
      const saved = await tx.tripGroup.update({
        where: { id },
        data: { confirmedAt: at },
        include: groupInclude,
      });
      for (const recipientId of recipients) {
        const kind = 'GROUP_CONFIRMED';
        await tx.tripNotification.upsert({
          where: { recipientId_tripId_kind: { recipientId, tripId, kind } },
          create: { recipientId, tripId, kind, createdAt: at },
          update: { createdAt: at, readAt: null },
        });
      }
      return saved;
    },
  };
}

@Injectable()
export class GroupsRepository {
  constructor(private readonly db: PrismaService) {}

  byCode(inviteHash: string) {
    return this.db.tripGroup.findUnique({
      where: { inviteHash },
      include: groupInclude,
    });
  }

  tripForGroup(id: string) {
    return this.db.tripGroup.findUnique({
      where: { id },
      select: { tripId: true },
    });
  }

  mine(userId: string) {
    return this.db.tripGroup.findMany({
      where: { members: { some: { userId, withdrawnAt: null } } },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      include: groupInclude,
      take: 50,
    });
  }
}
