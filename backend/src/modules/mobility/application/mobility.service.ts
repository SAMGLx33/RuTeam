import { publicEconomicTerms } from '../../expenses/domain/expense-policy.js';
import { emptyReputation } from '../../ratings/infrastructure/reputation.read.js';
import {
  BadRequestException,
  Injectable,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ENVIRONMENT, type Environment } from '../../../config/environment.js';
import { isUUID } from 'class-validator';
import type {
  MobilityPreferenceView,
  NotificationPage,
  TripNotificationView,
  AccountNoticeKind,
  TripNoticeKind,
  TripFeedPage,
  TripFeedCard,
  TripDetail,
} from '@ruteam/contracts';
import { canSubmitDeclaredDocuments } from '../../institutional-membership/domain/access-policy.js';
import { tripWindow } from '../../trips/domain/activity-window.js';
import { VehiculoPolicy } from '../../vehicles/domain/policies/vehiculo.policy.js';
import {
  matchStops,
  tripDirection,
} from '../../trips/domain/models/driver-route.js';
import {
  ViajeRepository,
  presentAvailable,
  presentItinerary,
  presentStops,
  type SearchableTrip,
  type TripCursor,
} from '../../trips/infrastructure/repositories/trips.repository.js';
import {
  MobilityRepository,
  type StoredPreference,
} from '../infrastructure/repositories/mobility.repository.js';
import type {
  FeedQueryDto,
  MobilityPreferenceDto,
} from '../dto/mobility.dto.js';
import {
  matchMobility,
  recommendationActorEligible,
  type RecommendationAccess,
  type MobilityMatch,
  type MobilityProfile,
} from '../domain/mobility.policy.js';

export function preferenceProfile(row: StoredPreference): MobilityProfile {
  return {
    ...row,
    campusSiteId: row.campusPointId,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    radiusKm: Number(row.radiusKm),
  };
}
function preferenceView(row: StoredPreference): MobilityPreferenceView {
  return {
    id: row.id,
    label: row.label,
    campusPointId: row.campusPointId,
    direction: row.direction,
    days: row.days,
    startMinute: row.startMinute,
    endMinute: row.endMinute,
    placeLabel: row.placeLabel,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    radiusKm: Number(row.radiusKm),
    maxContributionCop: row.maxContributionCop,
    vehicleTypes: row.vehicleTypes,
    active: row.active,
    notificationsEnabled: row.notificationsEnabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
export function marketOpen(
  trip: SearchableTrip,
  now: Date,
  access: RecommendationAccess,
): boolean {
  const window = tripWindow(trip);
  const documents = canSubmitDeclaredDocuments(trip.driver, access);
  return (
    recommendationActorEligible(trip.driver, access, now) &&
    (!trip.vehicle.document?.demo || trip.driver.demoIdentity !== null) &&
    (!trip.driver.driverEligibility?.demo ||
      trip.driver.demoIdentity !== null) &&
    !!trip.routeDescription &&
    !!tripDirection(presentStops(trip)) &&
    trip.status === 'PROGRAMADO' &&
    !trip.expiredAt &&
    trip.departureAt > now &&
    trip.offeredSeats <= trip.vehicle.passengerCapacity &&
    VehiculoPolicy.esPublicable(trip.vehicle.document, window.end, documents) &&
    VehiculoPolicy.esPublicable(
      trip.driver.driverEligibility,
      window.end,
      documents,
    ) &&
    (trip.driver.driverEligibility?.category === 'BOTH' ||
      trip.driver.driverEligibility?.category === trip.vehicle.type)
  );
}
export function candidateAvailable(
  trip: SearchableTrip,
  now: Date,
  access: RecommendationAccess,
) {
  return (
    trip.offeredSeats > trip.occupiedSeats && marketOpen(trip, now, access)
  );
}

export function bestMobilityMatch(
  trip: SearchableTrip,
  profiles: StoredPreference[],
): MobilityMatch | null {
  const candidate = {
    id: trip.id,
    driverId: trip.driverId,
    departureAt: trip.estimatedDepartureAt ?? trip.departureAt,
    vehicleType: trip.vehicle.type,
    suggestedContributionCop: trip.suggestedContributionCop,
    stops: presentStops(trip),
    geometry: presentItinerary(trip)?.geometry ?? null,
  };
  let best: MobilityMatch | null = null;
  for (const row of profiles) {
    const match = matchMobility(candidate, preferenceProfile(row));
    if (
      match &&
      (!best ||
        (match.type === 'DIRECT' && best.type === 'POTENTIAL') ||
        (match.type === best.type &&
          (match.distanceKm ?? Infinity) < (best.distanceKm ?? Infinity)))
    )
      best = match;
  }
  return best;
}
export function encodePageCursor(cursor: TripCursor): string {
  return Buffer.from(
    `${cursor.departureAt.toISOString()}|${cursor.id}`,
  ).toString('base64url');
}
export function decodePageCursor(input?: string): TripCursor | undefined {
  if (!input) return undefined;
  try {
    if (input.length > 256 || !/^[\w-]+$/.test(input)) throw new Error();
    const [instant, id, extra] = Buffer.from(input, 'base64url')
      .toString()
      .split('|');
    const departureAt = new Date(instant);
    if (
      extra !== undefined ||
      !isUUID(id) ||
      !Number.isFinite(departureAt.getTime())
    )
      throw new Error();
    return { departureAt, id };
  } catch {
    throw new BadRequestException('Cursor inválido. Reinicia la consulta.');
  }
}
function feedCard(
  trip: SearchableTrip,
  recommendation: MobilityMatch | null,
): TripFeedCard {
  const stops = presentStops(trip);
  return {
    id: trip.id,
    driverName: trip.driver.profile?.displayName ?? null,
    driverReputation: emptyReputation('DRIVER'),
    vehicle: {
      type: trip.vehicle.type,
      brand: trip.vehicle.brand,
      color: trip.vehicle.color,
    },
    direction: tripDirection(stops)!,
    originLabel:
      stops[0].campus === 'USC'
        ? 'Universidad Santiago de Cali'
        : 'Zona externa · ver detalle',
    destinationLabel:
      stops.at(-1)!.campus === 'USC'
        ? 'Universidad Santiago de Cali'
        : 'Zona externa · ver detalle',
    meetingLabel:
      stops[0].campus === 'USC'
        ? 'Encuentro dentro de la USC'
        : 'Encuentro público del recorrido',
    departureAt: trip.departureAt.toISOString(),
    estimatedDepartureAt: trip.estimatedDepartureAt?.toISOString() ?? null,
    estimatedDurationMinutes: trip.estimatedDurationMinutes,
    availableSeats: trip.offeredSeats - trip.occupiedSeats,
    providesHelmet: trip.providesHelmet,
    economics: publicEconomicTerms(trip),
    rules: trip.rules.map(({ rule }) => ({
      id: rule.id,
      code: rule.code,
      description: rule.description,
    })),
    recommendation,
  };
}

@Injectable()
export class MobilityService {
  constructor(
    private readonly repository: MobilityRepository,
    private readonly trips: ViajeRepository,
    @Inject(ENVIRONMENT) private readonly env: Environment,
  ) {}
  async profiles(actorId: string) {
    return (await this.repository.profiles(actorId)).map(preferenceView);
  }
  private async validate(input: MobilityPreferenceDto) {
    if (
      input.startMinute > input.endMinute ||
      input.label.trim().length < 2 ||
      input.placeLabel.trim().length < 2 ||
      (input.latitude == null) !== (input.longitude == null)
    )
      throw new BadRequestException(
        'Usa una franja ordenada, nombres válidos y un marcador completo u omite ambas coordenadas',
      );
    if (!(await this.repository.campus(input.campusPointId.toLowerCase())))
      throw new BadRequestException(
        'Selecciona un campus USC activo del catálogo',
      );
  }
  async create(actorId: string, input: MobilityPreferenceDto) {
    await this.validate(input);
    return preferenceView(await this.repository.create(actorId, input));
  }
  async update(actorId: string, id: string, input: MobilityPreferenceDto) {
    await this.validate(input);
    return preferenceView(await this.repository.update(actorId, id, input));
  }
  remove(actorId: string, id: string) {
    return this.repository.remove(actorId, id);
  }
  async feed(actorId: string, query: FeedQueryDto): Promise<TripFeedPage> {
    const profiles = await this.repository.profiles(actorId, true);
    const tab = query.tab ?? 'FOR_YOU';
    let cursor = decodePageCursor(query.cursor);
    const items: { driverId: string; card: TripFeedCard }[] = [];
    if (tab === 'FOR_YOU' && !profiles.length)
      return { items: [], nextCursor: null, hasActivePreferences: false };
    const now = new Date();
    for (let page = 0; page < 4; page++) {
      const candidates = await this.trips.searchCandidates({
        now,
        seats: 1,
        actorId,
        cursor,
      });
      const confirmed = new Set(
        (
          await this.repository.confirmedTrips(
            actorId,
            candidates.map(({ id }) => id),
          )
        ).map(({ tripId }) => tripId),
      );
      for (const trip of candidates) {
        cursor = { departureAt: trip.departureAt, id: trip.id };
        if (confirmed.has(trip.id) || !candidateAvailable(trip, now, this.env))
          continue;
        const direction = tripDirection(presentStops(trip));
        if ((tab === 'DESDE_USC' || tab === 'HACIA_USC') && direction !== tab)
          continue;
        const match = bestMobilityMatch(trip, profiles);
        if (tab === 'FOR_YOU' && !match) continue;
        items.push({ driverId: trip.driverId, card: feedCard(trip, match) });
        if (items.length === 20) break;
      }
      if (items.length === 20) break;
      if (candidates.length < 50)
        return {
          items: await this.trips.attachDriverReputations(items),
          nextCursor: null,
          hasActivePreferences: profiles.length > 0,
        };
    }
    return {
      items: await this.trips.attachDriverReputations(items),
      nextCursor: cursor ? encodePageCursor(cursor) : null,
      hasActivePreferences: profiles.length > 0,
    };
  }
  async detail(actorId: string, id: string): Promise<TripDetail> {
    const trip = await this.trips.recommendationTrip(id);
    if (!trip || !trip.routeDescription)
      throw new NotFoundException('Viaje inexistente');
    const isDriver = trip.driverId === actorId;
    const now = new Date();
    const inMarket = marketOpen(trip, now, this.env);
    const available = inMarket && trip.offeredSeats > trip.occupiedSeats;
    if (
      !isDriver &&
      !inMarket &&
      !(await this.repository.mayReadHistory(actorId, id))
    )
      throw new NotFoundException('Viaje no disponible');
    const allowed = matchStops(presentStops(trip), { radiusKm: 0 });
    if (!allowed) throw new NotFoundException('Recorrido no disponible');
    const recommendation = available
      ? bestMobilityMatch(trip, await this.repository.profiles(actorId, true))
      : null;
    const match =
      recommendation?.type === 'POTENTIAL'
        ? null
        : recommendation?.type === 'DIRECT'
          ? {
              pickupId: recommendation.pickupId!,
              dropoffId: recommendation.dropoffId!,
              distanceKm: recommendation.distanceKm ?? 0,
            }
          : available
            ? allowed
            : null;
    const mayJoin =
      available &&
      !isDriver &&
      (await this.repository.confirmedTrips(actorId, [trip.id])).length === 0;
    const acceptsParticipation = mayJoin && match !== null;
    const acceptsPickupProposal =
      mayJoin &&
      tripDirection(presentStops(trip)) === 'HACIA_USC' &&
      trip.routeGeometry !== null;
    const [card] = await this.trips.attachDriverReputations([
      { driverId: trip.driverId, card: presentAvailable(trip, allowed) },
    ]);
    return {
      ...card,
      match,
      recommendation,
      acceptsParticipation,
      acceptsPickupProposal,
      canSaveInterest: !isDriver && inMarket,
      status: trip.status,
      terminationReason: trip.terminationReason,
      expectedEndAt: trip.expectedEndAt.toISOString(),
      estimatedDepartureAt: trip.estimatedDepartureAt?.toISOString() ?? null,
      expiredAt: trip.expiredAt?.toISOString() ?? null,
      offeredSeats: trip.offeredSeats,
      occupiedSeats: trip.occupiedSeats,
      isDriver,
    };
  }
  private notificationView(
    row: Awaited<ReturnType<MobilityRepository['markRead']>>,
    profiles: StoredPreference[],
    actorId: string,
  ): TripNotificationView {
    if (!row.tripId || !row.trip)
      return {
        id: row.id,
        tripId: null,
        kind: row.kind as AccountNoticeKind,
        matchType: null,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
        available: true,
      };
    if (row.kind === 'CHAT_MESSAGE') {
      const owner = row.trip.driverId === actorId;
      const completed =
        row.trip.status === 'COMPLETADO' || row.trip.status === 'INTERRUMPIDO';
      const mayRead = completed
        ? row.trip.finishedAt !== null &&
          row.trip.finishedAt.getTime() > Date.now() - 86400000 &&
          (owner || row.trip.reservations.some(({ boardedAt }) => !!boardedAt))
        : row.trip.status !== 'CANCELADO' &&
          (owner || row.trip.reservations.length > 0);
      return {
        id: row.id,
        tripId: row.tripId,
        kind: 'CHAT_MESSAGE',
        matchType: null,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
        available: mayRead,
      };
    }
    if (row.kind === 'RATING_AVAILABLE' || row.kind === 'GROUP_CONFIRMED') {
      const owner = row.trip.driverId === actorId;
      const rating = row.kind === 'RATING_AVAILABLE';
      const participant = row.trip.reservations.some(
        ({ boardedAt }) => !rating || !!boardedAt,
      );
      return {
        id: row.id,
        tripId: row.tripId,
        kind: row.kind,
        matchType: null,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
        available:
          (owner || participant) &&
          (rating
            ? row.trip.status === 'COMPLETADO'
            : row.trip.status !== 'CANCELADO'),
      };
    }
    if (row.kind !== 'TRIP_MATCH') {
      const kind = row.kind as Exclude<TripNoticeKind, 'TRIP_MATCH'>;
      const owner = row.trip.driverId === actorId;
      const participant = row.trip.reservations.length > 0;
      const operating = row.trip.status === 'EN_CURSO';
      const completed = row.trip.status === 'COMPLETADO';
      const scheduled = row.trip.status === 'PROGRAMADO' && !row.trip.expiredAt;
      const available =
        kind === 'SEAT_AVAILABLE' || kind === 'PICKUP_CONFIRMATION_REMINDER'
          ? !owner &&
            !participant &&
            candidateAvailable(row.trip, new Date(), this.env)
          : kind === 'TRIP_DEPARTURE_REMINDER'
            ? scheduled && owner
            : kind === 'TRIP_PICKUP_REMINDER'
              ? (scheduled || operating) && participant
              : kind === 'COMPENSATION_DECLARED'
                ? owner && completed
                : kind === 'COMPENSATION_ACKNOWLEDGED'
                  ? participant && completed
                  : kind === 'PICKUP_NEXT' || kind === 'TRIP_STARTED'
                    ? operating && participant
                    : kind === 'PICKUP_ACCEPTED' || kind === 'PICKUP_REJECTED'
                      ? row.trip.status === 'PROGRAMADO'
                      : true;
      return {
        id: row.id,
        tripId: row.tripId,
        kind,
        matchType: null,
        createdAt: row.createdAt.toISOString(),
        readAt: row.readAt?.toISOString() ?? null,
        available,
      };
    }
    const current =
      row.trip.driverId !== actorId &&
      candidateAvailable(row.trip, new Date(), this.env)
        ? bestMobilityMatch(row.trip, profiles)
        : null;
    return {
      id: row.id,
      tripId: row.tripId,
      kind: 'TRIP_MATCH',
      matchType: current?.type ?? row.matchType,
      createdAt: row.createdAt.toISOString(),
      readAt: row.readAt?.toISOString() ?? null,
      available: !!current,
    };
  }
  async notifications(
    actorId: string,
    cursor?: string,
  ): Promise<NotificationPage> {
    const [rows, profiles] = await Promise.all([
      this.repository.notifications(actorId, decodePageCursor(cursor)),
      this.repository.profiles(actorId, true),
    ]);
    const items = rows
      .slice(0, 20)
      .map((row) => this.notificationView(row, profiles, actorId));
    const last = rows[19];
    return {
      items,
      nextCursor:
        rows.length > 20 && last
          ? encodePageCursor({ departureAt: last.createdAt, id: last.id })
          : null,
    };
  }
  async readNotification(actorId: string, id: string) {
    const [row, profiles] = await Promise.all([
      this.repository.markRead(actorId, id),
      this.repository.profiles(actorId, true),
    ]);
    return this.notificationView(row, profiles, actorId);
  }
}
