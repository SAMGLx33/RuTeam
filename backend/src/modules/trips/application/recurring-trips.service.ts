import {
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { RouteGeometry } from '@ruteam/contracts';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';
import { InstitutionalVerificationProvider } from '../../../infrastructure/verification/institutional-verification.provider.js';
import {
  recordInboxNotice,
  recordTripNotice,
} from '../../mobility/infrastructure/trip-notices.js';
import { ViajeService } from './trips.service.js';
import { planItinerary, type PlannedItinerary } from './plan-itinerary.js';
import {
  dayKey,
  bogotaDay,
  upcomingDates,
  validateRecurrence,
} from '../domain/recurrence.js';
import { tripDirection } from '../domain/models/driver-route.js';
import {
  presentSchedule,
  type recurringUnit,
  RecurringTripsRepository,
} from '../infrastructure/repositories/recurring-trips.repository.js';
import type {
  RecurringActionDto,
  RecurringTripDto,
} from '../dto/recurring-trip.dto.js';
import type { PublicationUnit } from '../infrastructure/repositories/trips.repository.js';

function sameStops(first: PlannedItinerary, next: PlannedItinerary) {
  return (
    first.stops.length === next.stops.length &&
    first.stops.every((stop, index) => {
      const current = next.stops[index];
      return (
        stop.latitude === current.latitude &&
        stop.longitude === current.longitude &&
        stop.access === current.access &&
        stop.campusPointId === current.campusPointId &&
        stop.campusSiteId === current.campusSiteId
      );
    })
  );
}

function failureOf(error: unknown): string {
  if (
    error instanceof DomainPolicyError ||
    (error instanceof HttpException && error.getStatus() < 500)
  )
    return error.message.slice(0, 240);
  throw error;
}

@Injectable()
export class RecurringTripsService {
  constructor(
    private readonly repository: RecurringTripsRepository,
    private readonly trips: ViajeService,
    private readonly verification: InstitutionalVerificationProvider,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}

  async list(driverId: string) {
    return (await this.repository.list(driverId)).map(presentSchedule);
  }
  async detail(driverId: string, id: string) {
    const row = await this.repository.detail(driverId, id);
    if (!row) throw new NotFoundException('Recurrencia no disponible');
    return presentSchedule(row);
  }

  private async prepare(
    driverId: string,
    input: RecurringTripDto,
    unit: PublicationUnit,
    now: Date,
    previous?: PlannedItinerary,
  ) {
    const dates = validateRecurrence(input, now);
    const { routingSelection, ...itinerary } = input.template.itinerary;
    const template = { ...input.template, itinerary };
    await this.trips.publicationTerms(
      driverId,
      template,
      unit,
      now,
      new Date(+now + template.estimatedDurationMinutes * 60000),
    );
    const planned = await this.trips.prepareRoute(
      driverId,
      { ...template, itinerary: { ...itinerary, routingSelection } },
      unit,
    );
    if (
      !routingSelection &&
      previous &&
      sameStops(previous, planned) &&
      JSON.stringify(previous.geometry ?? null) ===
        JSON.stringify(planned.geometry ?? null)
    ) {
      this.restoreRouteTimes(planned, previous);
    }
    return { ...dates, template, routeSnapshot: planned };
  }

  create(driverId: string, input: RecurringTripDto) {
    return this.repository.withDriver(driverId, async (unit, publication) => {
      const data = await this.prepare(driverId, input, publication, new Date());
      return presentSchedule(await unit.create(data));
    });
  }

  edit(driverId: string, id: string, input: RecurringTripDto) {
    return this.repository.withDriver(driverId, async (unit, publication) => {
      const row = await unit.requireOwned(id);
      if (row.state === 'CANCELLED')
        throw new ConflictException('La recurrencia está cancelada');
      const previous = row.routeSnapshot as unknown as PlannedItinerary;
      const data = await this.prepare(
        driverId,
        input,
        publication,
        new Date(),
        (row.template as unknown as RecurringTripDto['template'])
          .estimatedDurationMinutes === input.template.estimatedDurationMinutes
          ? previous
          : undefined,
      );
      return presentSchedule(await unit.replace(id, data));
    });
  }

  change(driverId: string, id: string, action: RecurringActionDto['action']) {
    return this.repository.withDriver(
      driverId,
      async (unit, _publication, tx) => {
        const row = await unit.requireOwned(id);
        const cancels = action === 'CANCEL' || action === 'CANCEL_FUTURE';
        if (row.state === 'CANCELLED' && !cancels) {
          throw new ConflictException('La recurrencia está cancelada');
        }
        if (
          (action === 'RESUME' || action === 'RETRY') &&
          dayKey(row.endsOn) < bogotaDay(new Date())
        )
          throw new ConflictException(
            'Amplía el intervalo de la recurrencia antes de reactivarla',
          );
        if (action === 'RETRY' && row.state !== 'ACTIVE')
          throw new ConflictException(
            'Reactiva la recurrencia para volver a intentar',
          );
        if (action === 'CANCEL_FUTURE')
          await unit.cancelFutureTrips(id, new Date());
        const state =
          action === 'PAUSE' ? 'PAUSED' : cancels ? 'CANCELLED' : 'ACTIVE';
        const updated = await unit.state(id, state);
        if (action === 'PAUSE' && row.state !== 'PAUSED')
          await recordInboxNotice(
            tx,
            driverId,
            'RECURRENCE_PAUSED',
            id + ':' + updated.updatedAt.toISOString(),
          );
        return presentSchedule(updated);
      },
    );
  }

  private restoreRouteTimes(
    planned: PlannedItinerary,
    saved: PlannedItinerary,
  ) {
    if (!sameStops(saved, planned))
      throw new DomainPolicyError(
        'Cambió el catálogo del recorrido. Revisa y guarda la plantilla.',
      );
    planned.distanceMeters = saved.distanceMeters;
    for (const [index, stop] of planned.stops.entries())
      stop.estimatedOffsetSeconds = saved.stops[index].estimatedOffsetSeconds;
    return planned;
  }

  async generate(driverId: string, id: string, now: Date) {
    // This provider also protects interactive student resources. A worker has no session.
    const verified = await this.verification.verify(driverId);
    return this.repository.withDriver(
      driverId,
      async (unit, publication, tx) => {
        const row = await unit.owned(id);
        if (!row || row.state !== 'ACTIVE' || row.nextScanAt > now) return;
        const schedule = presentSchedule(row);
        const slots = upcomingDates(
          schedule,
          now,
          this.env.RECURRING_TRIP_HORIZON_DAYS,
        );
        const existing = new Map(
          (
            await unit.existingDates(
              id,
              slots.map(({ date }) => date),
            )
          ).map((slot) => [dayKey(slot.date), slot]),
        );
        const saved = row.routeSnapshot as unknown as PlannedItinerary;
        const pending = slots.filter(
          ({ date }) => !existing.get(dayKey(date))?.tripId,
        );
        const batch = pending
          .sort((a, b) => {
            const attempted = (date: Date) =>
              Number(existing.has(dayKey(date)));
            return attempted(a.date) - attempted(b.date) || +a.date - +b.date;
          })
          .slice(0, 4);
        const actor = batch.length ? await publication.actor() : null;
        let unpublished = false;
        for (const slot of batch) {
          const template =
            row.template as unknown as RecurringTripDto['template'];
          const data = {
            ...template,
            departureAt: slot.departureAt.toISOString(),
          };
          try {
            if (
              !verified ||
              !actor?.emailVerifiedAt ||
              !actor.membership ||
              actor.membership.validUntil <= slot.departureAt
            )
              throw new ForbiddenException(
                'Matrícula USC sin acreditación vigente para esta fecha',
              );
            const planned = this.restoreRouteTimes(
              await planItinerary(data.itinerary, publication),
              saved,
            );
            const trip = await this.trips.publishWithinLock(
              driverId,
              data,
              publication,
              now,
              planned,
            );
            await unit.saveOccurrence(id, slot, {
              tripId: trip.id,
              failure: null,
            });
            await recordTripNotice(tx, trip.id, 'OCCURRENCE_PUBLISHED', [
              driverId,
            ]);
          } catch (error) {
            await unit.saveOccurrence(id, slot, {
              tripId: null,
              failure: failureOf(error),
            });
            await recordInboxNotice(
              tx,
              driverId,
              'OCCURRENCE_FAILED',
              id + ':' + dayKey(slot.date),
            );
            unpublished = true;
          }
        }
        const ended = schedule.endsOn < bogotaDay(now);
        await unit.defer(
          id,
          new Date(
            ended
              ? '9999-12-31T00:00:00Z'
              : +now +
                  (pending.some(({ date }) => !existing.has(dayKey(date))) &&
                  pending.length > batch.length
                    ? 0
                    : (unpublished ? 15 : 5) * 60000),
          ),
        );
      },
    );
  }

  due(now: Date) {
    return this.repository.due(now);
  }

  private async preparePrior(
    source: Awaited<ReturnType<ReturnType<typeof recurringUnit>['sourceTrip']>>,
    publication: PublicationUnit,
  ) {
    if (!source?.routeDescription || source.stops.length < 2)
      throw new NotFoundException(
        'Viaje con itinerario reutilizable no disponible',
      );
    const direction = tripDirection(source.stops);
    if (!direction)
      throw new ConflictException(
        'El recorrido histórico requiere revisión antes de publicarlo',
      );
    const point = (stop: (typeof source.stops)[number]) =>
      stop.campusPointId
        ? {
            campusPointId: stop.campusPointId,
            label: stop.label,
            instructions:
              stop.instructions?.replace(
                /^Ubicación interna descrita; el mapa usa una referencia del campus(?: · )?/,
                '',
              ) || undefined,
          }
        : {
            label: stop.label,
            latitude: Number(stop.latitude),
            longitude: Number(stop.longitude),
            instructions: stop.instructions ?? undefined,
          };
    const { expenseEstimate, compensationMethods, suggestedContributionCop } =
      source;
    const template = {
      vehicleId: source.vehicleId,
      offeredSeats: source.offeredSeats,
      estimatedDurationMinutes: source.estimatedDurationMinutes,
      providesHelmet: source.providesHelmet ?? undefined,
      ruleIds: source.rules.map(({ ruleId }) => ruleId),
      economics: {
        compensationMethods,
        estimate:
          expenseEstimate && suggestedContributionCop
            ? {
                fuelCop: expenseEstimate.fuelCop,
                tollsCop: expenseEstimate.tollsCop,
                parkingCop: expenseEstimate.parkingCop,
              }
            : undefined,
      },
      itinerary: {
        direction,
        description: source.routeDescription,
        origin: point(source.stops[0]),
        destination: point(source.stops.at(-1)!),
        stops: source.stops
          .slice(1, -1)
          .map((stop) => ({ ...point(stop), access: stop.access })),
        geometry: (source.routeGeometry as RouteGeometry | null) ?? undefined,
        publicMeetingPoints: true as const,
      },
    };
    const planned = await planItinerary(template.itinerary, publication);
    const saved: PlannedItinerary = {
      ...planned,
      distanceMeters: source.routeDistanceMeters ?? undefined,
      stops: source.stops.map((stop) => ({
        ...stop,
        reachedAt: null,
        latitude: Number(stop.latitude),
        longitude: Number(stop.longitude),
      })),
    };
    this.restoreRouteTimes(planned, saved);
    return { template, planned };
  }

  reuse(driverId: string, tripId: string) {
    return this.repository.withDriver(driverId, async (unit, publication) => {
      const { template, planned } = await this.preparePrior(
        await unit.sourceTrip(tripId),
        publication,
      );
      return {
        ...template,
        itinerary: {
          ...template.itinerary,
          routingSelection: this.trips.signSavedRoute(
            driverId,
            planned,
            template.estimatedDurationMinutes,
          ),
        },
      };
    });
  }

  duplicate(driverId: string, tripId: string, departureAt: string) {
    return this.repository.withDriver(driverId, async (unit, publication) => {
      const { template, planned } = await this.preparePrior(
        await unit.sourceTrip(tripId),
        publication,
      );
      return this.trips.publishWithinLock(
        driverId,
        { ...template, departureAt },
        publication,
        new Date(),
        planned,
      );
    });
  }
}
