import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { lockParticipationChanges } from '../../../reservations/infrastructure/participation-lock.js';
import { reservationUnit } from '../../../reservations/infrastructure/repositories/reservations.repository.js';
import {
  recordInboxNotice,
  recordTripNotice,
} from '../../../mobility/infrastructure/trip-notices.js';

function upcomingReservation(
  userId: string,
  now: Date,
): Prisma.ReservationWhereInput {
  return {
    requesterId: userId,
    status: { in: ['PENDING', 'CONFIRMED'] },
    boardedAt: null,
    quantity: 1,
    trip: { status: 'PROGRAMADO', departureAt: { gt: now } },
  };
}

function activeTrips(db: Prisma.TransactionClient, userId: string) {
  return db.trip.findMany({
    where: {
      OR: [
        { driverId: userId, status: 'EN_CURSO' },
        {
          driverId: userId,
          status: 'PROGRAMADO',
          reservations: {
            some: { status: 'CONFIRMED', boardedAt: { not: null } },
          },
        },
        {
          status: 'EN_CURSO',
          reservations: {
            some: {
              status: 'CONFIRMED',
              noShowAt: null,
              members: { some: { userId } },
            },
          },
        },
        {
          status: 'PROGRAMADO',
          reservations: {
            some: {
              status: 'CONFIRMED',
              members: { some: { userId } },
              OR: [{ boardedAt: { not: null } }, { quantity: { gt: 1 } }],
            },
          },
        },
      ],
    },
    select: { id: true, driverId: true, departureAt: true, status: true },
  });
}

const deletionRequest = {
  orderBy: [{ requestedAt: 'desc' }, { id: 'desc' }],
  take: 1,
} as const satisfies Prisma.User$deletionRequestsArgs;

@Injectable()
export class AccountLifecycleRepository {
  constructor(private readonly db: PrismaService) {}

  identity(email: string) {
    return this.db.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: { deletionRequests: deletionRequest },
    });
  }

  user(id: string) {
    return this.db.user.findUniqueOrThrow({
      where: { id },
      include: { deletionRequests: deletionRequest },
    });
  }

  async settings(userId: string, now: Date) {
    const [
      user,
      sessions,
      active,
      futureTrips,
      futureParticipations,
      activeSchedules,
    ] = await Promise.all([
      this.user(userId),
      this.db.authSession.findMany({
        where: { userId, revokedAt: null, expiresAt: { gt: now } },
        select: { id: true, createdAt: true, expiresAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      }),
      activeTrips(this.db, userId),
      this.db.trip.count({
        where: {
          driverId: userId,
          status: 'PROGRAMADO',
          departureAt: { gt: now },
        },
      }),
      this.db.reservation.count({ where: upcomingReservation(userId, now) }),
      this.db.recurringTrip.count({
        where: { driverId: userId, state: 'ACTIVE' },
      }),
    ]);
    return {
      user,
      sessions,
      active,
      futureTrips,
      futureParticipations,
      activeSchedules,
    };
  }

  private async credential(
    tx: Prisma.TransactionClient,
    userId: string,
    expectedHash: string,
    currentSessionId?: string,
  ) {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId}::uuid FOR NO KEY UPDATE`;
    const user = await tx.user.findUniqueOrThrow({
      where: { id: userId },
      include: { deletionRequests: deletionRequest },
    });
    if (user.passwordHash !== expectedHash)
      throw new UnauthorizedException('Vuelve a autenticarte');
    if (currentSessionId) {
      const session = await tx.authSession.findFirst({
        where: {
          id: currentSessionId,
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
      if (user.disabledAt || !session)
        throw new UnauthorizedException('Vuelve a iniciar sesión');
    }
    return user;
  }

  async revoke(
    userId: string,
    sessionId: string,
    expectedHash: string,
    destination: string,
  ) {
    await this.db.$transaction(async (tx) => {
      await this.credential(tx, userId, expectedHash, sessionId);
      const result = await tx.authSession.updateMany({
        where: {
          id: destination,
          userId,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { revokedAt: new Date() },
      });
      if (!result.count)
        throw new UnauthorizedException('Sesión activa no disponible');
    });
  }

  close(
    userId: string,
    sessionId: string,
    expectedHash: string,
    requestDeletion: boolean,
  ) {
    return this.db.$transaction(
      async (tx) => {
        await lockParticipationChanges(tx, true);
        await this.credential(tx, userId, expectedHash, sessionId);
        const now = new Date();
        if ((await activeTrips(tx, userId)).length)
          throw new ConflictException(
            'Resuelve los viajes o participaciones que requieren atención antes de desactivar la cuenta.',
          );
        const ownTrips = await tx.trip.findMany({
          where: {
            driverId: userId,
            status: 'PROGRAMADO',
            departureAt: { gt: now },
          },
          select: { id: true },
          orderBy: { id: 'asc' },
        });
        for (const { id } of ownTrips) {
          await tx.$queryRaw`SELECT id FROM "Trip" WHERE id=${id}::uuid FOR UPDATE`;
          await reservationUnit(tx, id).transition(
            userId,
            'CANCELADO',
            now,
            undefined,
            'ACCOUNT_CLOSED',
          );
        }
        const reservations = await tx.reservation.findMany({
          where: upcomingReservation(userId, now),
          select: {
            id: true,
            tripId: true,
            status: true,
            quantity: true,
            trip: { select: { driverId: true } },
          },
          orderBy: [{ tripId: 'asc' }, { id: 'asc' }],
        });
        for (const row of reservations) {
          await tx.$queryRaw`SELECT id FROM "Trip" WHERE id=${row.tripId}::uuid FOR UPDATE`;
          const unit = reservationUnit(tx, row.tripId);
          if (row.status === 'CONFIRMED') {
            await unit.addOccupiedSeats(-row.quantity);
            await recordTripNotice(
              tx,
              row.tripId,
              'PASSENGER_WITHDREW',
              [row.trip.driverId],
              row.id,
            );
          }
          await unit.revokePass(row.id);
          await unit.changeStatus(
            row.id,
            'CANCELLED',
            undefined,
            'ACCOUNT_CLOSED',
          );
        }
        await tx.tripGroup.updateMany({
          where: { organizerId: userId, confirmedAt: null, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.tripGroupMember.updateMany({
          where: {
            userId,
            withdrawnAt: null,
            reservationId: null,
            group: { confirmedAt: null, organizerId: { not: userId } },
          },
          data: { withdrawnAt: now },
        });
        await tx.pickupProposal.updateMany({
          where: { requesterId: userId, status: 'PENDING' },
          data: { status: 'EXPIRED', decidedAt: now },
        });
        await tx.recurringTrip.updateMany({
          where: { driverId: userId, state: 'ACTIVE' },
          data: { state: 'PAUSED' },
        });
        await tx.authSession.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: now },
        });
        await tx.accountToken.updateMany({
          where: { userId, consumedAt: null },
          data: { consumedAt: now },
        });
        if (requestDeletion)
          await tx.accountDeletionRequest.create({
            data: { userId, requestedAt: now },
          });
        return tx.user.update({
          where: { id: userId },
          data: { disabledAt: now, selfDeactivatedAt: now },
          include: { deletionRequests: deletionRequest },
        });
      },
      { timeout: 15000 },
    );
  }

  recover(
    userId: string,
    expectedHash: string,
    action: 'REACTIVATE' | 'WITHDRAW_DELETION',
  ) {
    return this.db.$transaction(async (tx) => {
      const user = await this.credential(tx, userId, expectedHash);
      const request = user.deletionRequests[0];
      if (!user.selfDeactivatedAt) {
        if (!user.disabledAt && action === 'REACTIVATE') return user;
        throw new ConflictException(
          'Esta cuenta no tiene una desactivación gestionable',
        );
      }
      const at = new Date();
      if (action === 'WITHDRAW_DELETION') {
        if (request && !request.withdrawnAt)
          await tx.accountDeletionRequest.update({
            where: { id: request.id },
            data: { withdrawnAt: at },
          });
        return tx.user.findUniqueOrThrow({
          where: { id: userId },
          include: { deletionRequests: deletionRequest },
        });
      }
      if (request && !request.withdrawnAt)
        throw new ConflictException(
          'Retira la solicitud de eliminación antes de reactivar la cuenta',
        );
      await recordInboxNotice(
        tx,
        userId,
        'ACCOUNT_REACTIVATED',
        user.selfDeactivatedAt.toISOString(),
      );
      return tx.user.update({
        where: { id: userId },
        data: { disabledAt: null, selfDeactivatedAt: null },
        include: { deletionRequests: deletionRequest },
      });
    });
  }
}
