import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RecurringTripInput, RecurringTripView } from '@ruteam/contracts';
import type { Prisma } from '../../../../generated/prisma/client.js';
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js';
import { reservationUnit } from '../../../reservations/infrastructure/repositories/reservations.repository.js';
import type { PlannedItinerary } from '../../application/plan-itinerary.js';
import { dayKey, validateRecurrence } from '../../domain/recurrence.js';
import type { RecurringTripDto } from '../../dto/recurring-trip.dto.js';
import { ViajeRepository, type PublicationUnit } from './trips.repository.js';

const occurrences = {
  orderBy: { date: 'desc' },
  take: 40,
  include: {
    trip: { select: { id: true, status: true, occupiedSeats: true } },
  },
} as const satisfies Prisma.RecurringTrip$occurrencesArgs;
type Schedule = Prisma.RecurringTripGetPayload<{
  include: { occurrences: typeof occurrences };
}>;

export function presentSchedule(row: Schedule): RecurringTripView {
  return {
    id: row.id,
    name: row.name,
    startsOn: dayKey(row.startsOn),
    endsOn: dayKey(row.endsOn),
    time: row.time,
    weekdays: row.weekdays,
    template: row.template as unknown as RecurringTripInput['template'],
    state: row.state,
    occurrences: row.occurrences.map(
      ({ date, departureAt, failure, trip }) => ({
        date: dayKey(date),
        departureAt: departureAt.toISOString(),
        failure,
        trip,
      }),
    ),
  };
}

export type ScheduleData = ReturnType<typeof validateRecurrence> & {
  template: RecurringTripDto['template'];
  routeSnapshot: PlannedItinerary;
};

export function recurringUnit(tx: Prisma.TransactionClient, driverId: string) {
  const owned = (id: string) =>
    tx.recurringTrip.findFirst({
      where: { id, driverId },
      include: { occurrences },
    });
  const jsonData = (input: ScheduleData) => ({
    ...input,
    template: JSON.parse(
      JSON.stringify(input.template),
    ) as Prisma.InputJsonObject,
    routeSnapshot: JSON.parse(
      JSON.stringify(input.routeSnapshot),
    ) as Prisma.InputJsonObject,
  });

  return {
    owned,
    async requireOwned(id: string) {
      const row = await owned(id);
      if (!row) throw new NotFoundException('Recurrencia no disponible');
      return row;
    },
    async create(input: ScheduleData) {
      const open = await tx.recurringTrip.count({
        where: { driverId, state: { not: 'CANCELLED' } },
      });
      if (open >= 20)
        throw new ConflictException(
          'Puedes conservar hasta 20 recurrencias abiertas',
        );
      return tx.recurringTrip.create({
        data: { ...jsonData(input), driverId },
        include: { occurrences },
      });
    },
    async replace(id: string, input: ScheduleData) {
      return tx.recurringTrip.update({
        where: { id },
        data: { ...jsonData(input), nextScanAt: new Date() },
        include: { occurrences },
      });
    },
    state(id: string, state: Schedule['state']) {
      return tx.recurringTrip.update({
        where: { id },
        data: { state, nextScanAt: new Date() },
        include: { occurrences },
      });
    },
    async cancelFutureTrips(id: string, now: Date) {
      const trips = await tx.$queryRaw<{ id: string }[]>`
        SELECT t.id FROM "Trip" t
        JOIN "RecurringOccurrence" o ON o."tripId" = t.id
        WHERE o."scheduleId" = ${id}::uuid AND t."driverId" = ${driverId}::uuid
          AND t.status = 'PROGRAMADO' AND t."departureAt" > ${now}
        ORDER BY t.id FOR UPDATE OF t
      `;
      for (const trip of trips) {
        const onboard = await tx.reservation.count({
          where: {
            tripId: trip.id,
            status: 'CONFIRMED',
            boardedAt: { not: null },
          },
        });
        if (!onboard) {
          await reservationUnit(tx, trip.id).transition(
            driverId,
            'CANCELADO',
            now,
            undefined,
            'CHANGE_OF_PLANS',
          );
        }
      }
    },
    async defer(id: string, nextScanAt: Date) {
      await tx.recurringTrip.update({ where: { id }, data: { nextScanAt } });
    },
    existingDates(id: string, dates: Date[]) {
      return tx.recurringOccurrence.findMany({
        where: { scheduleId: id, date: { in: dates } },
      });
    },
    saveOccurrence(
      id: string,
      slot: { date: Date; departureAt: Date },
      outcome: { tripId: string | null; failure: string | null },
    ) {
      return tx.recurringOccurrence.upsert({
        where: { scheduleId_date: { scheduleId: id, date: slot.date } },
        create: { scheduleId: id, ...slot, ...outcome },
        update: { departureAt: slot.departureAt, ...outcome },
      });
    },
    sourceTrip(id: string) {
      return tx.trip.findFirst({
        where: { id, driverId },
        include: {
          stops: { orderBy: { position: 'asc' } },
          rules: true,
          expenseEstimate: true,
        },
      });
    },
  };
}

@Injectable()
export class RecurringTripsRepository {
  constructor(
    private readonly db: PrismaService,
    private readonly trips: ViajeRepository,
  ) {}

  withDriver<T>(
    driverId: string,
    action: (
      unit: ReturnType<typeof recurringUnit>,
      publication: PublicationUnit,
      tx: Prisma.TransactionClient,
    ) => Promise<T>,
  ) {
    return this.trips.withDriverLock(driverId, (publication, tx) =>
      action(recurringUnit(tx, driverId), publication, tx),
    );
  }

  list(driverId: string) {
    return this.db.recurringTrip.findMany({
      where: { driverId },
      orderBy: [{ state: 'asc' }, { updatedAt: 'desc' }],
      take: 60,
      include: { occurrences },
    });
  }

  detail(driverId: string, id: string) {
    return this.db.recurringTrip.findFirst({
      where: { driverId, id },
      include: { occurrences },
    });
  }

  due(now: Date) {
    return this.db.recurringTrip.findMany({
      where: { state: 'ACTIVE', nextScanAt: { lte: now } },
      orderBy: [{ nextScanAt: 'asc' }, { id: 'asc' }],
      select: { id: true, driverId: true },
      take: 10,
    });
  }
}
