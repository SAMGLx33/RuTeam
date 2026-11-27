import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import type { Prisma } from '../../../../generated/prisma/client.js';

const trip = {
  id: true,
  driverId: true,
  originLabel: true,
  departureAt: true,
  expectedEndAt: true,
  estimatedDepartureAt: true,
  estimatedDurationMinutes: true,
  startedAt: true,
  expiredAt: true,
  status: true,
  recurringOccurrence: { select: { scheduleId: true } },
} as const satisfies Prisma.TripSelect;
const pending = { status: 'PROGRAMADO' } as const;

@Injectable()
export class DailyMobilityRepository {
  constructor(private readonly db: PrismaService) {}

  agenda(
    userId: string,
    start: Date,
    until: Date,
    calendarStart: Date,
    calendarEnd: Date,
  ) {
    const window: Prisma.TripWhereInput = {
      OR: [
        { departureAt: { gte: start, lt: until } },
        { departureAt: { lt: until }, expectedEndAt: { gt: start } },
        // A changed departure may have moved the estimated end into this window.
        {
          estimatedDepartureAt: {
            gte: new Date(+start - 360 * 60_000),
            lt: until,
          },
        },
        { startedAt: { gte: new Date(+start - 360 * 60_000), lt: until } },
      ],
    };
    const stop = {
      label: true,
      position: true,
      estimatedOffsetSeconds: true,
    } as const;
    return Promise.all([
      this.db.trip.findMany({
        where: { driverId: userId, ...window },
        select: trip,
      }),
      this.db.reservation.findMany({
        where: {
          members: { some: { userId } },
          status: { in: ['CONFIRMED', 'CANCELLED'] },
          trip: window,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          noShowAt: true,
          droppedOffAt: true,
          pickup: { select: stop },
          dropoff: { select: stop },
          trip: { select: { ...trip, _count: { select: { stops: true } } } },
        },
      }),
      this.db.recurringTrip.findMany({
        where: {
          driverId: userId,
          OR: [
            {
              state: { not: 'CANCELLED' },
              startsOn: { lt: calendarEnd },
              endsOn: { gte: calendarStart },
            },
            {
              occurrences: {
                some: {
                  date: { gte: calendarStart, lt: calendarEnd },
                  tripId: { not: null },
                },
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          state: true,
          startsOn: true,
          endsOn: true,
          weekdays: true,
          time: true,
          occurrences: {
            where: { date: { gte: calendarStart, lt: calendarEnd } },
            select: { date: true, tripId: true, failure: true },
          },
        },
      }),
    ]);
  }

  activities(userId: string, now: Date) {
    const imminent = new Date(+now + 30 * 86400_000);
    const upcoming = {
      OR: [
        { status: 'EN_CURSO' as const },
        { ...pending, departureAt: { gt: now } },
      ],
    };
    const docs = { gt: now, lte: imminent };
    return Promise.all([
      this.db.trip.findMany({
        where: { driverId: userId, ...upcoming },
        orderBy: { departureAt: 'asc' },
        take: 8,
        select: {
          ...trip,
          _count: {
            select: {
              pickupProposals: { where: { status: 'PENDING' } },
              reservations: { where: { status: 'CONFIRMED' } },
            },
          },
        },
      }),
      this.db.reservation.findMany({
        where: {
          members: { some: { userId } },
          status: 'CONFIRMED',
          trip: upcoming,
        },
        orderBy: { trip: { departureAt: 'asc' } },
        take: 8,
        select: { id: true, trip: { select: trip } },
      }),
      this.db.tripNotification.findMany({
        where: {
          recipientId: userId,
          readAt: null,
          kind: {
            in: [
              'CHAT_MESSAGE',
              'PICKUP_ACCEPTED',
              'PICKUP_REJECTED',
              'ACCOUNT_REACTIVATED',
              'ELIGIBILITY_CHANGED',
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 12,
        select: { id: true, kind: true, tripId: true },
      }),
      this.db.tripGroupMember.findMany({
        where: {
          userId,
          withdrawnAt: null,
          group: {
            confirmedAt: null,
            revokedAt: null,
            expiresAt: { gt: now },
            trip: pending,
          },
        },
        take: 5,
        select: {
          groupId: true,
          group: { select: { tripId: true, organizerId: true } },
        },
      }),
      this.db.recurringOccurrence.findMany({
        where: {
          schedule: { driverId: userId, state: 'ACTIVE' },
          tripId: null,
          failure: { not: null },
          departureAt: { gt: now },
        },
        take: 8,
        orderBy: { date: 'asc' },
        select: {
          scheduleId: true,
          date: true,
          failure: true,
          schedule: { select: { name: true } },
        },
      }),
      this.db.vehicle.findMany({
        where: { ownerId: userId, document: { expiresAt: docs } },
        select: { id: true, plate: true },
        take: 5,
      }),
      this.db.driverEligibility.findFirst({
        where: { userId, expiresAt: docs },
        select: { userId: true },
      }),
      this.db.reservation.findMany({
        where: {
          status: 'CONFIRMED',
          boardedAt: { not: null },
          noShowAt: null,
          quantity: 1,
          trip: { status: 'COMPLETADO' },
          OR: [{ requesterId: userId }, { trip: { driverId: userId } }],
        },
        select: {
          id: true,
          requesterId: true,
          compensation: { select: { status: true } },
          trip: {
            select: {
              ...trip,
              suggestedContributionCop: true,
              ratings: {
                where: { raterId: userId },
                select: { rateeId: true },
              },
            },
          },
        },
        orderBy: { trip: { finishedAt: 'desc' } },
        take: 40,
      }),
    ]);
  }
}
