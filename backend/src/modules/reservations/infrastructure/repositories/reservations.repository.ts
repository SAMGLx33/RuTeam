import { hasActivityConflict } from '../../../trips/infrastructure/student-schedule.js';
import { segmentWindow } from '../../../trips/domain/activity-window.js';
import { participationStage } from '../../domain/participation-stage.js';
import { recordEmissions } from '../../../mobility/infrastructure/record-emissions.js';
import { publicEconomicTerms } from '../../../expenses/domain/expense-policy.js';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  ReservationView,
  ReservationStatus,
  CancellationReason,
} from '@ruteam/contracts';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../../../generated/prisma/client.js';
import {
  emptyReputation,
  reputationsByRole,
} from '../../../ratings/infrastructure/reputation.read.js';
import { lockParticipationChanges } from '../participation-lock.js';
import { recordTripNotice } from '../../../mobility/infrastructure/trip-notices.js';
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
      estimatedDepartureAt: true,
      suggestedContributionCop: true,
      compensationMethods: true,
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
    economics: publicEconomicTerms(row.trip),
    pickup: meetingPointView(row.pickup),
    dropoff: meetingPointView(row.dropoff),
    departureAt: row.trip.departureAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    confirmedAt: row.confirmedAt?.toISOString() ?? null,
    boardedAt: row.boardedAt?.toISOString() ?? null,
    droppedOffAt: row.droppedOffAt?.toISOString() ?? null,
    stage: participationStage(row, row.trip.status),
    withdrawalReason: row.withdrawalReason,
    noShowAt: row.noShowAt?.toISOString() ?? null,
    canCancel:
      row.requesterId === actorId &&
      (row.status === 'CONFIRMED' || row.status === 'PENDING') &&
      !row.boardedAt &&
      row.trip.status === 'PROGRAMADO',
  };
}

export function reservationUnit(tx: Prisma.TransactionClient, tripId: string) {
  async function upcoming(stopId: string) {
    const next = await tx.tripStop.findFirst({
      where: { tripId, reachedAt: null },
      orderBy: { position: 'asc' },
      select: { id: true },
    });
    const pickups = [stopId, ...(next ? [next.id] : [])];
    const rows = await tx.reservationMember.findMany({
      where: {
        reservation: {
          tripId,
          pickupId: { in: pickups },
          status: 'CONFIRMED',
          boardedAt: null,
          noShowAt: null,
        },
      },
      select: { userId: true, reservation: { select: { pickupId: true } } },
    });
    for (const pickupId of new Set(
      rows.map(({ reservation }) => reservation.pickupId),
    ))
      await recordTripNotice(
        tx,
        tripId,
        'PICKUP_NEXT',
        rows
          .filter(({ reservation }) => reservation.pickupId === pickupId)
          .map(({ userId }) => userId),
        pickupId,
      );
  }

  async function confirmedMembers() {
    const rows = await tx.reservationMember.findMany({
      where: { reservation: { tripId, status: 'CONFIRMED' } },
      select: { userId: true },
    });
    return rows.map(({ userId }) => userId);
  }

  return {
    delayedPassengerConflict: async (
      trip: Parameters<typeof segmentWindow>[0],
    ) => {
      const riders = await tx.reservationMember.findMany({
        where: {
          reservation: {
            tripId,
            status: 'CONFIRMED',
            noShowAt: null,
            droppedOffAt: null,
          },
        },
        select: {
          userId: true,
          reservation: {
            select: {
              pickup: { select: { estimatedOffsetSeconds: true } },
              dropoff: { select: { estimatedOffsetSeconds: true } },
            },
          },
        },
      });
      for (const { userId, reservation } of riders)
        if (
          await hasActivityConflict(
            tx,
            userId,
            segmentWindow(trip, reservation.pickup, reservation.dropoff),
            tripId,
          )
        )
          return true;
      return false;
    },
    shiftDeparture: async (actorId: string, at: Date) => {
      await tx.trip.update({
        where: { id: tripId },
        data: {
          estimatedDepartureAt: at,
          version: { increment: 1 },
          events: { create: { actorId, type: 'TRIP_DELAYED' } },
        },
      });
      await recordTripNotice(
        tx,
        tripId,
        'TRIP_DELAYED',
        [actorId, ...(await confirmedMembers())],
        at.toISOString(),
      );
    },
    expire: async (driverId: string, at: Date) => {
      await tx.trip.update({
        where: { id: tripId },
        data: {
          expiredAt: at,
          version: { increment: 1 },
          events: { create: { actorId: driverId, type: 'TRIP_EXPIRED' } },
        },
      });
      await tx.pickupProposal.updateMany({
        where: { tripId, status: 'PENDING' },
        data: { status: 'EXPIRED', decidedAt: at },
      });
      await tx.tripGroup.updateMany({
        where: { tripId, confirmedAt: null, revokedAt: null },
        data: { revokedAt: at },
      });
      await tx.reservationBoardingPass.deleteMany({
        where: { reservation: { tripId } },
      });
      await recordTripNotice(tx, tripId, 'TRIP_EXPIRED', [
        driverId,
        ...(await confirmedMembers()),
      ]);
    },
    notify: (
      kind: Parameters<typeof recordTripNotice>[2],
      recipients: string[],
      eventKey: string,
    ) => recordTripNotice(tx, tripId, kind, recipients, eventKey),
    revokePass: (id: string) =>
      tx.reservationBoardingPass.deleteMany({ where: { reservationId: id } }),
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
    conflictFor: (
      userId: string,
      trip: {
        departureAt: Date;
        startedAt: Date | null;
        estimatedDepartureAt: Date | null;
        expectedEndAt: Date;
        estimatedDurationMinutes: number;
        status: string;
        stops: { id: string; estimatedOffsetSeconds: number | null }[];
      },
      pickupId: string,
      dropoffId: string,
    ) => {
      const unknown = { estimatedOffsetSeconds: null };
      const pickup = trip.stops.find(({ id }) => id === pickupId) ?? unknown;
      const dropoff = trip.stops.find(({ id }) => id === dropoffId) ?? unknown;
      return hasActivityConflict(
        tx,
        userId,
        segmentWindow(trip, pickup, dropoff),
        tripId,
      );
    },
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
    changeStatus: (
      id: string,
      status: ReservationStatus,
      confirmedAt?: Date,
      withdrawalReason?: CancellationReason,
    ) =>
      tx.reservation.update({
        where: { id },
        data: { status, confirmedAt, withdrawalReason },
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
    dropOff: async (
      id: string,
      droppedOffAt: Date,
      actorId: string,
      passengerId: string,
    ) => {
      const row = await tx.reservation.update({
        where: { id },
        data: { droppedOffAt },
        include: viewInclude,
      });
      await tx.trip.update({
        where: { id: tripId },
        data: {
          version: { increment: 1 },
          events: { create: { actorId, type: 'PASSENGER_DROPPED_OFF' } },
        },
      });
      await recordTripNotice(
        tx,
        tripId,
        'DESTINATION_REACHED',
        [passengerId],
        id,
      );
      return row;
    },
    awaitingDropoff: () =>
      tx.reservation.count({
        where: {
          tripId,
          status: 'CONFIRMED',
          boardedAt: { not: null },
          droppedOffAt: null,
          noShowAt: null,
        },
      }),
    noShow: async (id: string, noShowAt: Date, actorId: string) => {
      const row = await tx.reservation.update({
        where: { id },
        data: { noShowAt },
        include: viewInclude,
      });
      await tx.reservationBoardingPass.deleteMany({
        where: { reservationId: id },
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
      await upcoming(stopId);
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
      status: 'EN_CURSO' | 'COMPLETADO' | 'CANCELADO' | 'INTERRUMPIDO',
      at: Date,
      originId?: string,
      reason?: CancellationReason,
    ) => {
      const members = await tx.reservationMember.findMany({
        where: { reservation: { tripId, status: 'CONFIRMED' } },
        select: { userId: true },
      });
      const recipients = members.map(({ userId }) => userId);
      await tx.pickupProposal.updateMany({
        where: { tripId, status: 'PENDING' },
        data: { status: 'EXPIRED', decidedAt: at },
      });
      await tx.tripGroup.updateMany({
        where: {
          tripId,
          confirmedAt: null,
          revokedAt: null,
          expiresAt: { gt: at },
        },
        data: { revokedAt: at },
      });
      if (status !== 'EN_CURSO')
        await tx.reservationBoardingPass.deleteMany({
          where: { reservation: { tripId } },
        });

      if (status === 'CANCELADO') {
        await recordTripNotice(tx, tripId, 'TRIP_CANCELLED', recipients);
        await tx.reservation.updateMany({
          where: { tripId, status: { in: ['PENDING', 'CONFIRMED'] } },
          data: { status: 'CANCELLED' },
        });
      } else if (status === 'EN_CURSO') {
        await recordTripNotice(tx, tripId, 'TRIP_STARTED', recipients);
        await tx.reservation.updateMany({
          where: { tripId, status: 'PENDING' },
          data: { status: 'REJECTED' },
        });
        if (originId) {
          await tx.tripStop.update({
            where: { tripId_id: { tripId, id: originId } },
            data: { reachedAt: at },
          });
          await upcoming(originId);
        }
      }
      let interruptedSeats: number | undefined;
      if (status === 'INTERRUMPIDO') {
        await recordTripNotice(tx, tripId, 'TRIP_INTERRUPTED', recipients);
        await tx.reservation.updateMany({
          where: {
            tripId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            boardedAt: null,
          },
          data: { status: 'CANCELLED' },
        });
        const boarded = await tx.reservation.aggregate({
          where: { tripId, status: 'CONFIRMED', boardedAt: { not: null } },
          _sum: { quantity: true },
        });
        interruptedSeats = boarded._sum.quantity ?? 0;
      }
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: {
          status,
          version: { increment: 1 },
          ...(status === 'CANCELADO' && { occupiedSeats: 0 }),
          ...(status === 'INTERRUMPIDO' && { occupiedSeats: interruptedSeats }),
          terminationReason: reason,
          ...(status === 'EN_CURSO' && { startedAt: at }),
          ...((status === 'COMPLETADO' || status === 'INTERRUMPIDO') && {
            finishedAt: at,
          }),
          ...(status !== 'EN_CURSO' && {
            trackingSharedAt: null,
            trackingRevokedThroughAt: null,
          }),
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
        await recordTripNotice(tx, tripId, 'TRIP_FINISHED', [
          actorId,
          ...recipients,
        ]);
        await tx.reservation.updateMany({
          where: {
            tripId,
            status: 'CONFIRMED',
            boardedAt: null,
            noShowAt: null,
          },
          data: { noShowAt: at },
        });
        await recordEmissions(tx, tripId, at);
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
        if (travelers.length)
          await recordTripNotice(tx, tripId, 'RATING_AVAILABLE', [
            actorId,
            ...travelers.map(({ requesterId }) => requesterId),
          ]);
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
    changesSchedule = false,
  ): Promise<T> {
    return this.db.$transaction(async (tx) => {
      await lockParticipationChanges(tx, changesSchedule);
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

  dueToExpire(cutoff: Date) {
    return this.db.$queryRaw<{ id: string }[]>`
      SELECT id FROM "Trip"
      WHERE status = 'PROGRAMADO' AND "expiredAt" IS NULL
        AND COALESCE("estimatedDepartureAt" + "estimatedDurationMinutes" * interval '1 minute', "expectedEndAt") <= ${cutoff}
      ORDER BY "expectedEndAt", id
      LIMIT 50
    `;
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
