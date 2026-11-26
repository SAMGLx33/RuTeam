import { Injectable, NotFoundException } from '@nestjs/common';
import type { ReservationView, ReservationStatus } from '@ruteam/contracts';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import {
  emptyReputation,
  reputationsByRole,
} from '../../../ratings/infrastructure/reputation.read.js';
import { requeueRecommendation } from '../../../mobility/infrastructure/repositories/requeue-recommendation.js';

const pointSelect = {
  id: true,
  label: true,
  latitude: true,
  longitude: true,
  instructions: true,
} as const;
const viewInclude = {
  pickup: { select: pointSelect },
  dropoff: { select: pointSelect },
  requester: { select: { profile: { select: { displayName: true } } } },
  trip: {
    select: {
      status: true,
      departureAt: true,
      driver: { select: { profile: { select: { displayName: true } } } },
      vehicle: { select: { type: true, brand: true, color: true } },
    },
  },
} as const;
type StoredReservation = Prisma.ReservationGetPayload<{
  include: typeof viewInclude;
}>;

function meetingPointView(point: StoredReservation['pickup']) {
  return {
    ...point,
    latitude: Number(point.latitude),
    longitude: Number(point.longitude),
  };
}

export function reservationView(
  row: StoredReservation,
  actorId: string,
): ReservationView {
  return {
    id: row.id,
    tripId: row.tripId,
    requesterName: row.requester.profile?.displayName ?? null,
    driverName: row.trip.driver.profile?.displayName ?? null,
    vehicle: row.trip.vehicle,
    isRequester: row.requesterId === actorId,
    quantity: row.quantity,
    status: row.status,
    tripStatus: row.trip.status,
    pickup: meetingPointView(row.pickup),
    dropoff: meetingPointView(row.dropoff),
    departureAt: row.trip.departureAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    boardedAt: row.boardedAt?.toISOString() ?? null,
    noShowAt: row.noShowAt?.toISOString() ?? null,
    canCancel:
      row.requesterId === actorId &&
      (row.status === 'CONFIRMED' || row.status === 'PENDING') &&
      !row.boardedAt &&
      row.trip.status === 'PROGRAMADO' &&
      row.trip.departureAt.getTime() > Date.now(),
  };
}

function reservationUnit(tx: Prisma.TransactionClient, tripId: string) {
  return {
    trip: () =>
      tx.trip.findUniqueOrThrow({
        where: { id: tripId },
        include: {
          stops: { orderBy: { position: 'asc' } },
          driver: { include: { driverEligibility: true, membership: true } },
          vehicle: { include: { document: true } },
        },
      }),
    find: (id: string) =>
      tx.reservation.findFirst({
        where: { id, tripId },
        include: { ...viewInclude, members: { select: { userId: true } } },
      }),
    memberships: (ids: string[]) =>
      tx.institutionalMembership.findMany({
        where: {
          userId: { in: ids },
          user: { disabledAt: null, emailVerifiedAt: { not: null } },
        },
      }),
    activeForMember: (userId: string) =>
      tx.reservation.findFirst({
        where: { tripId, status: 'CONFIRMED', members: { some: { userId } } },
        include: viewInclude,
      }),
    create: (
      requesterId: string,
      pickupId: string,
      dropoffId: string,
      confirmedAt: Date,
    ) =>
      tx.reservation.create({
        data: {
          tripId,
          requesterId,
          pickupId,
          dropoffId,
          quantity: 1,
          status: 'CONFIRMED',
          confirmedAt,
          members: { create: { userId: requesterId } },
        },
        include: viewInclude,
      }),
    changeStatus: (id: string, status: ReservationStatus, confirmedAt?: Date) =>
      tx.reservation.update({
        where: { id },
        data: { status, confirmedAt },
        include: viewInclude,
      }),
    boardingPass: (tokenHash: string) =>
      tx.reservationBoardingPass.findUnique({
        where: { tokenHash, reservation: { tripId } },
      }),
    issueBoardingPass: (
      reservationId: string,
      pickupId: string,
      tokenHash: string,
      expiresAt: Date,
    ) =>
      tx.reservationBoardingPass.upsert({
        where: { reservationId },
        create: { reservationId, pickupId, tokenHash, expiresAt },
        update: { pickupId, tokenHash, expiresAt, consumedAt: null },
      }),
    consumeBoardingPass: (reservationId: string, consumedAt: Date) =>
      tx.reservationBoardingPass.update({
        where: { reservationId },
        data: { consumedAt },
      }),
    board: async (id: string, boardedAt: Date, actorId: string) => {
      const row = await tx.reservation.update({
        where: { id },
        data: { boardedAt },
        include: viewInclude,
      });
      await tx.tripEvent.create({
        data: { tripId, actorId, type: 'PASSENGER_BOARDED' },
      });
      return row;
    },
    noShow: async (id: string, noShowAt: Date, actorId: string) => {
      const row = await tx.reservation.update({
        where: { id },
        data: { noShowAt },
        include: viewInclude,
      });
      await tx.tripEvent.create({
        data: { tripId, actorId, type: 'PASSENGER_NO_SHOW' },
      });
      return row;
    },
    reachStop: async (stopId: string, reachedAt: Date, actorId: string) => {
      await tx.tripStop.update({
        where: { tripId_id: { tripId, id: stopId } },
        data: { reachedAt },
      });
      await tx.tripEvent.create({
        data: { tripId, actorId, type: 'STOP_REACHED' },
      });
    },
    addOccupiedSeats: async (quantity: number) => {
      await tx.trip.update({
        where: { id: tripId },
        data: {
          occupiedSeats: { increment: quantity },
          version: { increment: 1 },
        },
      });
      if (quantity < 0) await requeueRecommendation(tx, tripId);
    },
    transition: async (
      actorId: string,
      status: 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO',
      at: Date,
      originId?: string,
    ) => {
      if (status === 'CANCELADO') {
        await tx.reservation.updateMany({
          where: { tripId, status: { in: ['PENDING', 'CONFIRMED'] } },
          data: { status: 'CANCELLED' },
        });
      } else if (status === 'EN_CURSO') {
        await tx.reservation.updateMany({
          where: { tripId, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
        if (originId) {
          await tx.tripStop.update({
            where: { tripId_id: { tripId, id: originId } },
            data: { reachedAt: at },
          });
        }
      }
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status,
          version: { increment: 1 },
          ...(status === 'CANCELADO' && { occupiedSeats: 0 }),
          ...(status === 'EN_CURSO' && { startedAt: at }),
          ...(status === 'COMPLETADO' && { finishedAt: at }),
          events: { create: { actorId, type: status } },
        },
        select: {
          id: true,
          status: true,
          occupiedSeats: true,
          startedAt: true,
          finishedAt: true,
        },
      });
      if (status === 'COMPLETADO') {
        const travelers = await tx.reservation.findMany({
          where: {
            tripId,
            status: 'CONFIRMED',
            quantity: 1,
            boardedAt: { not: null },
            noShowAt: null,
          },
          select: { requesterId: true },
        });
        if (travelers.length) {
          await tx.tripNotification.createMany({
            data: [
              actorId,
              ...travelers.map(({ requesterId }) => requesterId),
            ].map((recipientId) => ({
              recipientId,
              tripId,
              kind: 'RATING_AVAILABLE',
            })),
            skipDuplicates: true,
          });
        }
      }
      return updated;
    },
  };
}
export type ReservationUnit = ReturnType<typeof reservationUnit>;

@Injectable()
export class ReservationsRepository {
  constructor(private readonly db: PrismaService) {}

  withTripLock<T>(
    tripId: string,
    operation: (
      unit: ReservationUnit,
      tx: Prisma.TransactionClient,
    ) => Promise<T>,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({
        where: { id: tripId },
        select: { driverId: true },
      });
      if (!trip) throw new NotFoundException('Viaje inexistente');
      // Serializa con publicación/revisión sin bloquear las referencias de miembros a User.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${trip.driverId}::uuid FOR NO KEY UPDATE`;
      const locked = await tx.$queryRaw<
        { id: string }[]
      >`SELECT id FROM "Trip" WHERE id = ${tripId}::uuid FOR UPDATE`;
      if (!locked.length) throw new NotFoundException('Viaje inexistente');
      return operation(reservationUnit(tx, tripId), tx);
    });
  }

  async tripForRequest(id: string): Promise<string> {
    const row = await this.db.reservation.findUnique({
      where: { id },
      select: { tripId: true },
    });
    if (!row) throw new NotFoundException('Participación inexistente');
    return row.tripId;
  }

  async forDriver(actorId: string, tripId: string) {
    const trip = await this.db.trip.findUnique({
      where: { id: tripId },
      select: { driverId: true },
    });
    if (!trip || trip.driverId !== actorId) return null;
    const rows = await this.db.reservation.findMany({
      where: { tripId },
      include: viewInclude,
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    const confirmed = rows.filter(
      ({ status, quantity, noShowAt }) =>
        status === 'CONFIRMED' && quantity === 1 && !noShowAt,
    );
    const ids = new Set(confirmed.map(({ requesterId }) => requesterId));
    const reputation = await reputationsByRole(this.db, [...ids], 'PASSENGER');
    return rows.map((row) => ({
      ...reservationView(row, actorId),
      ...(ids.has(row.requesterId) &&
        row.status === 'CONFIRMED' &&
        row.quantity === 1 &&
        !row.noShowAt && {
          passengerReputation:
            reputation.get(row.requesterId) ?? emptyReputation('PASSENGER'),
        }),
    }));
  }

  async forMember(actorId: string) {
    const rows = await this.db.reservation.findMany({
      where: { members: { some: { userId: actorId } } },
      include: viewInclude,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 50,
    });
    return rows.map((row) => reservationView(row, actorId));
  }
}
