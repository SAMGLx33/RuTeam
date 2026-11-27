import type { RecurrenceInput } from '@ruteam/contracts';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';

const dayMs = 86400000;
const bogotaOffsetMs = 5 * 3600000;

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);
export const bogotaDay = (date: Date) =>
  dayKey(new Date(date.getTime() - bogotaOffsetMs));
export const calendarDate = (date: string) => new Date(date + 'T00:00:00Z');

export function validateRecurrence(input: RecurrenceInput, now: Date) {
  const { startsOn, endsOn, name } = input;
  const start = calendarDate(startsOn);
  const end = calendarDate(endsOn);
  if (
    !Number.isFinite(+start) ||
    !Number.isFinite(+end) ||
    dayKey(start) !== startsOn ||
    dayKey(end) !== endsOn ||
    end < start ||
    +end - +start > 365 * dayMs ||
    endsOn < bogotaDay(now) ||
    +start - +calendarDate(bogotaDay(now)) > 365 * dayMs
  )
    throw new DomainPolicyError(
      'Elige un intervalo de hasta 366 días con fechas vigentes',
    );
  if (name.trim().length < 2)
    throw new DomainPolicyError('Asigna un nombre a la recurrencia');
  return {
    name: name.trim(),
    startsOn: start,
    endsOn: end,
    time: input.time,
    weekdays: input.weekdays,
  };
}

export function upcomingDates(
  input: RecurrenceInput,
  now: Date,
  horizonDays: number,
) {
  const today = bogotaDay(now);
  const from = calendarDate(input.startsOn > today ? input.startsOn : today);
  const horizon = +calendarDate(today) + (horizonDays - 1) * dayMs;
  const through = Math.min(+calendarDate(input.endsOn), horizon);
  const dates: { date: Date; departureAt: Date }[] = [];
  for (let cursor = +from; cursor <= through; cursor += dayMs) {
    const date = new Date(cursor);
    const weekday = date.getUTCDay() || 7;
    if (!input.weekdays.includes(weekday)) continue;
    const departureAt = new Date(dayKey(date) + 'T' + input.time + ':00-05:00');
    if (+departureAt > +now + 30 * 60000) dates.push({ date, departureAt });
  }
  return dates;
}
