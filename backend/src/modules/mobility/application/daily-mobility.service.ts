import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  AgendaEntry,
  MobilityAgenda,
  PendingActivity,
} from '@ruteam/contracts';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import {
  bogotaDay,
  calendarDate,
  dayKey,
} from '../../trips/domain/recurrence.js';
import { DailyMobilityRepository } from '../infrastructure/repositories/daily-mobility.repository.js';

import {
  overlap,
  segmentWindow,
  tripWindow,
  type ActivityWindow,
} from '../../trips/domain/activity-window.js';

const dayMs = 86400_000;
@Injectable()
export class DailyMobilityService {
  constructor(
    private readonly repository: DailyMobilityRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  async agenda(
    userId: string,
    day: string | undefined,
    days: number,
  ): Promise<MobilityAgenda> {
    const now = new Date();
    const start = day ?? bogotaDay(now);
    const calendarStart = calendarDate(start);
    if (!Number.isFinite(+calendarStart) || dayKey(calendarStart) !== start)
      throw new BadRequestException('Fecha de agenda inválida');
    const calendarEnd = new Date(+calendarStart + days * dayMs);
    const localStart = new Date(start + 'T00:00:00-05:00');
    const [own, bookings, schedules] = await this.repository.agenda(
      userId,
      localStart,
      new Date(+localStart + days * dayMs),
      calendarStart,
      calendarEnd,
    );
    const result: AgendaEntry[] = [];
    const occupied: { entry: AgendaEntry; window: ActivityWindow }[] = [];
    const localEnd = new Date(+localStart + days * dayMs);
    for (const trip of own) {
      const window = tripWindow(trip);
      if (window.start >= localEnd || window.end <= localStart) continue;
      const entry: AgendaEntry = {
        id: trip.id,
        day: bogotaDay(window.start),
        at: window.start.toISOString(),
        label: trip.originLabel,
        kind: 'PUBLISHED',
        status: trip.expiredAt ? 'EXPIRED' : trip.status,
        tripId: trip.id,
        scheduleId: trip.recurringOccurrence?.scheduleId ?? null,
        failure: null,
        estimatedDepartureAt: trip.estimatedDepartureAt?.toISOString(),
      };
      result.push(entry);
      if (
        !trip.expiredAt &&
        (trip.status === 'PROGRAMADO' || trip.status === 'EN_CURSO')
      )
        occupied.push({ entry, window });
    }
    const seen = new Set<string>();
    for (const booking of bookings.sort(
      (a, b) =>
        Number(b.status === 'CONFIRMED') - Number(a.status === 'CONFIRMED'),
    )) {
      const { trip, pickup, dropoff } = booking;
      if (seen.has(trip.id)) continue;
      seen.add(trip.id);
      const planned = tripWindow(trip);
      const window = segmentWindow(trip, pickup, dropoff);
      if (window.start >= localEnd || window.end <= localStart) continue;
      const pickupAt =
        pickup.position === 0
          ? planned.start
          : pickup.estimatedOffsetSeconds === null
            ? null
            : new Date(+planned.start + pickup.estimatedOffsetSeconds * 1000);
      const dropoffAt =
        dropoff.position === trip._count.stops - 1
          ? planned.end
          : dropoff.estimatedOffsetSeconds === null
            ? null
            : new Date(+planned.start + dropoff.estimatedOffsetSeconds * 1000);
      const at = pickupAt ?? window.start;
      const entry: AgendaEntry = {
        id: booking.id,
        day: bogotaDay(at),
        at: at.toISOString(),
        label: pickup.label,
        kind: 'PARTICIPATION',
        status: trip.expiredAt
          ? 'EXPIRED'
          : booking.status === 'CANCELLED' &&
              trip.status !== 'CANCELADO' &&
              trip.status !== 'INTERRUMPIDO'
            ? 'WITHDRAWN'
            : trip.status,
        tripId: trip.id,
        scheduleId: trip.recurringOccurrence?.scheduleId ?? null,
        failure: null,
        estimatedDepartureAt: trip.estimatedDepartureAt?.toISOString(),
        pickupAt: pickupAt?.toISOString() ?? null,
        dropoffAt: dropoffAt?.toISOString() ?? null,
      };
      result.push(entry);
      if (
        !trip.expiredAt &&
        booking.status === 'CONFIRMED' &&
        !booking.noShowAt &&
        !booking.droppedOffAt &&
        (trip.status === 'PROGRAMADO' || trip.status === 'EN_CURSO')
      )
        occupied.push({ entry, window });
    }
    occupied.sort((a, b) => +a.window.start - +b.window.start);
    for (const [index, { entry, window }] of occupied.entries()) {
      for (let other = index + 1; other < occupied.length; other++) {
        const next = occupied[other];
        if (next.window.start >= window.end) break;
        if (!overlap(window, next.window)) continue;
        (entry.conflictWithTripIds ??= []).push(next.entry.tripId!);
        (next.entry.conflictWithTripIds ??= []).push(entry.tripId!);
      }
    }
    const today = calendarDate(bogotaDay(now));
    for (const schedule of schedules) {
      if (schedule.state === 'CANCELLED') continue;
      const processed = new Map(
        schedule.occurrences.map((entry) => [dayKey(entry.date), entry]),
      );
      for (
        let cursor = Math.max(+calendarStart, +schedule.startsOn);
        cursor < +calendarEnd && cursor <= +schedule.endsOn;
        cursor += dayMs
      ) {
        const date = new Date(cursor);
        const dayKeyValue = dayKey(date);
        const occurrence = processed.get(dayKeyValue);
        if (
          occurrence?.tripId ||
          !schedule.weekdays.includes(date.getUTCDay() || 7)
        )
          continue;
        const at = new Date(dayKeyValue + 'T' + schedule.time + ':00-05:00');
        if (at <= now && !occurrence?.failure) continue;
        result.push({
          id: schedule.id + ':' + dayKeyValue,
          day: dayKeyValue,
          at: at.toISOString(),
          label: schedule.name,
          kind: occurrence?.failure
            ? 'FAILED'
            : schedule.state === 'PAUSED'
              ? 'PAUSED'
              : cursor < +today + this.env.RECURRING_TRIP_HORIZON_DAYS * dayMs
                ? 'PENDING'
                : 'PROJECTED',
          status: null,
          tripId: null,
          scheduleId: schedule.id,
          failure: occurrence?.failure ?? null,
        });
      }
    }
    return {
      start,
      days,
      entries: result.sort(
        (a, b) => a.at.localeCompare(b.at) || a.id.localeCompare(b.id),
      ),
    };
  }

  async activities(userId: string): Promise<PendingActivity[]> {
    const [
      trips,
      bookings,
      notices,
      groups,
      failures,
      documents,
      license,
      completed,
    ] = await this.repository.activities(userId, new Date());
    const result: PendingActivity[] = [];
    for (const trip of trips) {
      result.push({
        id: 'trip:' + trip.id,
        title:
          trip.status === 'EN_CURSO'
            ? 'Viaje publicado en curso'
            : 'Próximo viaje publicado',
        detail:
          trip.originLabel +
          ' · ' +
          trip._count.reservations +
          ' participaciones confirmadas',
        tripId: trip.id,
        category: 'TRIP',
        optional: false,
      });
      if (trip._count.pickupProposals && trip.status === 'PROGRAMADO')
        result.push({
          id: 'pickup:' + trip.id,
          title: 'Propuestas de recogida',
          detail: trip._count.pickupProposals + ' por revisar',
          tripId: trip.id,
          category: 'PICKUP',
          optional: false,
        });
    }
    for (const { id, trip } of bookings)
      result.push({
        id,
        title:
          trip.status === 'EN_CURSO'
            ? 'Tu viaje está en curso'
            : 'Participación confirmada',
        detail: trip.originLabel,
        tripId: trip.id,
        category: 'TRIP',
        optional: false,
      });
    for (const note of notices) {
      if (note.kind === 'CHAT_MESSAGE' && note.tripId)
        result.push({
          id: note.id,
          title: 'Conversación sin leer',
          detail: 'Chat del viaje',
          category: 'CHAT',
          tripId: note.tripId,
          optional: false,
        });
      else if (
        (note.kind === 'PICKUP_ACCEPTED' || note.kind === 'PICKUP_REJECTED') &&
        note.tripId
      )
        result.push({
          id: note.id,
          title: 'Propuesta resuelta',
          detail:
            note.kind === 'PICKUP_ACCEPTED'
              ? 'Recogida aceptada'
              : 'Recogida no aceptada',
          category: 'PICKUP_RESOLVED',
          tripId: note.tripId,
          optional: false,
        });
      else if (
        note.kind === 'ELIGIBILITY_CHANGED' ||
        note.kind === 'ACCOUNT_REACTIVATED'
      )
        result.push({
          id: note.id,
          title: 'Actualización de cuenta',
          detail: 'Consulta tu identidad y sesiones',
          category: 'ACCOUNT',
          optional: false,
        });
    }
    for (const group of groups)
      result.push({
        id: group.groupId,
        title: 'Grupo por confirmar',
        detail: 'Consulta los consentimientos del grupo',
        category: 'GROUP',
        optional: false,
      });
    for (const failure of failures)
      result.push({
        id: failure.scheduleId + ':' + dayKey(failure.date),
        title: failure.schedule.name,
        detail: failure.failure ?? 'Fecha por revisar',
        scheduleId: failure.scheduleId,
        category: 'SCHEDULE',
        optional: false,
      });
    for (const document of documents)
      result.push({
        id: document.id,
        title: 'SOAT próximo a vencer',
        detail: document.plate,
        category: 'DOCUMENT',
        optional: false,
      });
    if (license)
      result.push({
        id: 'license:' + license.userId,
        title: 'Licencia próxima a vencer',
        detail: 'Consulta los documentos declarados',
        category: 'DOCUMENT',
        optional: false,
      });
    const ratings = new Set<string>();
    for (const booking of completed) {
      const { trip, requesterId, compensation } = booking;
      const owner = trip.driverId === userId;
      if (
        !trip.ratings.some(
          ({ rateeId }) => rateeId === (owner ? requesterId : trip.driverId),
        ) &&
        !ratings.has(trip.id)
      ) {
        ratings.add(trip.id);
        result.push({
          id: 'rating:' + trip.id,
          title: 'Calificación disponible',
          detail: trip.originLabel,
          tripId: trip.id,
          category: 'RATING',
          optional: true,
        });
      }
      const status = compensation?.status;
      if (
        status === 'DISPUTED' ||
        (owner && status === 'DECLARED') ||
        (!owner && !compensation && !!trip.suggestedContributionCop)
      )
        result.push({
          id: 'comp:' + booking.id,
          title:
            status === 'DISPUTED'
              ? 'Discrepancia económica'
              : owner
                ? 'Compensación declarada'
                : 'Compensación voluntaria disponible',
          detail: trip.originLabel,
          tripId: trip.id,
          participationId: booking.id,
          category: status === 'DISPUTED' ? 'DISPUTE' : 'COMPENSATION',
          optional: status !== 'DISPUTED',
        });
    }
    return result;
  }
}
