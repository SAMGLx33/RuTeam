import { DomainPolicyError } from '../../../../common/errors/domain-policy.error.js';
import type {
  RouteGeometry,
  RouteStop,
  StopMatch,
  TripPoint,
  TripDirection,
} from '@ruteam/contracts';

type Coordinates = Pick<TripPoint, 'latitude' | 'longitude'>;
type RouteAnchor = Pick<
  RouteStop,
  | 'position'
  | 'id'
  | 'access'
  | 'campus'
  | 'campusPointId'
  | 'label'
  | 'instructions'
  | 'estimatedOffsetSeconds'
> &
  Coordinates;
export type StopPreference = 'USC' | { campusPointId: string } | Coordinates;
export function tripDirection(
  stops: readonly Pick<RouteStop, 'campus' | 'campusPointId'>[],
): TripDirection | null {
  if (stops.length < 2) return null;
  const isUsc = (point: Pick<RouteStop, 'campus' | 'campusPointId'>) =>
    point.campus === 'USC' && point.campusPointId !== null;
  const startsAtUsc = isUsc(stops[0]);
  const endsAtUsc = isUsc(stops[stops.length - 1]);
  if (startsAtUsc === endsAtUsc) return null;
  return startsAtUsc ? 'DESDE_USC' : 'HACIA_USC';
}

export interface StopPreferences {
  from?: StopPreference;
  to?: StopPreference;
  radiusKm: number;
  fromText?: string;
  toText?: string;
  pickupAllowed?: (pickup: RouteAnchor) => boolean;
}

const radians = (degrees: number) => (degrees * Math.PI) / 180;
export function distanceKm(a: Coordinates, b: Coordinates): number {
  const arc =
    Math.sin(radians(b.latitude - a.latitude) / 2) ** 2 +
    Math.cos(radians(a.latitude)) *
      Math.cos(radians(b.latitude)) *
      Math.sin(radians(b.longitude - a.longitude) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(Math.min(1, arc)));
}

function preferenceDistance(
  point: RouteAnchor,
  preference?: StopPreference,
): number {
  if (preference === undefined) return 0;
  if (preference === 'USC') return point.campus === 'USC' ? 0 : Infinity;
  if ('campusPointId' in preference)
    return point.campusPointId === preference.campusPointId ? 0 : Infinity;
  return distanceKm(point, preference);
}

const searchableText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();

function matchesText(point: RouteAnchor, text?: string) {
  return (
    !text ||
    searchableText(
      `${point.label} ${point.instructions ?? ''} ${point.campus ?? ''}`,
    ).includes(searchableText(text))
  );
}

export function matchStops(
  stops: readonly RouteAnchor[],
  preferences: StopPreferences,
): StopMatch | null {
  let match: StopMatch | null = null;
  const direction = tripDirection(stops);
  for (const pickup of stops) {
    if (direction === 'DESDE_USC' && pickup !== stops[0]) continue;
    if (
      (pickup.access !== 'PICKUP' && pickup.access !== 'BOTH') ||
      !matchesText(pickup, preferences.fromText) ||
      preferences.pickupAllowed?.(pickup) === false
    )
      continue;
    const from = preferenceDistance(pickup, preferences.from);
    if (from > preferences.radiusKm) continue;
    for (const dropoff of stops) {
      if (
        !matchesText(dropoff, preferences.toText) ||
        dropoff.position <= pickup.position ||
        (dropoff.access !== 'DROPOFF' && dropoff.access !== 'BOTH')
      )
        continue;
      const to = preferenceDistance(dropoff, preferences.to);
      if (
        to <= preferences.radiusKm &&
        (!match || from + to < match.distanceKm)
      )
        match = {
          pickupId: pickup.id,
          dropoffId: dropoff.id,
          distanceKm: from + to,
        };
    }
  }
  return match;
}

export function allowsSegment(
  stops: readonly RouteAnchor[],
  pickupId: string,
  dropoffId: string,
): boolean {
  const pickup = stops.find((stop) => stop.id === pickupId);
  const dropoff = stops.find((stop) => stop.id === dropoffId);
  return (
    !!pickup &&
    !!dropoff &&
    (tripDirection(stops) !== 'DESDE_USC' || pickup === stops[0]) &&
    pickup.position < dropoff.position &&
    (pickup.access === 'PICKUP' || pickup.access === 'BOTH') &&
    (dropoff.access === 'DROPOFF' || dropoff.access === 'BOTH')
  );
}

// Technical allowance for map snapping, including access points next to the selected road.
const ROUTE_ALIGNMENT_KM = 0.15;
function firstAlignedFraction(
  point: Coordinates,
  start: Coordinates,
  end: Coordinates,
  earliest: number,
  threshold = ROUTE_ALIGNMENT_KM,
): number | null {
  const distanceAt = (fraction: number) =>
    distanceKm(point, {
      latitude: start.latitude + fraction * (end.latitude - start.latitude),
      longitude: start.longitude + fraction * (end.longitude - start.longitude),
    });
  if (distanceAt(earliest) <= threshold) return earliest;

  const scale = Math.cos(radians(point.latitude));
  const dx = (end.longitude - start.longitude) * scale;
  const dy = end.latitude - start.latitude;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return null;
  const projection =
    ((point.longitude - start.longitude) * scale * dx +
      (point.latitude - start.latitude) * dy) /
    lengthSquared;
  let upper = Math.min(1, Math.max(earliest, projection));
  if (distanceAt(upper) > threshold) return null;

  let lower = earliest;
  for (let step = 0; step < 16; step++) {
    const fraction = (lower + upper) / 2;
    if (distanceAt(fraction) <= threshold) upper = fraction;
    else lower = fraction;
  }
  return upper;
}

export function validateGeometry(
  geometry: RouteGeometry,
  stops: readonly Coordinates[],
): number {
  const path = geometry.coordinates.map((pair) => {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      !pair.every(Number.isFinite) ||
      Math.abs(pair[0]) > 180 ||
      Math.abs(pair[1]) > 90
    )
      throw new DomainPolicyError(
        'LineString requiere pares [longitud, latitud] válidos',
      );
    const [longitude, latitude] = pair;
    return { longitude, latitude };
  });
  if (
    distanceKm(path[0], stops[0]) > ROUTE_ALIGNMENT_KM ||
    distanceKm(path[path.length - 1], stops[stops.length - 1]) >
      ROUTE_ALIGNMENT_KM
  )
    throw new DomainPolicyError(
      'La geometría debe comenzar y finalizar cerca de los extremos seleccionados',
    );

  let previous = 0;
  for (const stop of stops.slice(1, -1)) {
    let next: number | undefined;
    for (
      let segment = Math.min(Math.floor(previous), path.length - 2);
      segment < path.length - 1;
      segment++
    ) {
      const fraction = firstAlignedFraction(
        stop,
        path[segment],
        path[segment + 1],
        Math.max(0, previous - segment),
      );
      if (fraction !== null) {
        next = segment + fraction;
        break;
      }
    }
    if (next === undefined)
      throw new DomainPolicyError(
        'La geometría debe pasar cerca de cada punto y respetar su orden',
      );
    previous = next;
  }
  const meters = Math.round(
    path
      .slice(1)
      .reduce(
        (sum, point, index) => sum + 1000 * distanceKm(path[index], point),
        0,
      ),
  );
  if (meters <= 0)
    throw new DomainPolicyError(
      'La geometría debe representar un trayecto con distancia positiva',
    );
  return meters;
}

export function pickupInsertionPosition(
  geometry: RouteGeometry,
  stops: readonly Coordinates[],
  proposed: Coordinates,
): number {
  if (stops.length >= 12)
    throw new DomainPolicyError(
      'El recorrido ya contiene el máximo de paradas',
    );
  if (stops.some((stop) => distanceKm(stop, proposed) < 0.03))
    throw new DomainPolicyError(
      'Usa el punto publicado que ya existe cerca de ese lugar',
    );

  const positions: number[] = [];
  for (let index = 1; index < stops.length; index++) {
    try {
      validateGeometry(geometry, [
        ...stops.slice(0, index),
        proposed,
        ...stops.slice(index),
      ]);
      positions.push(index);
    } catch (error) {
      if (!(error instanceof DomainPolicyError)) throw error;
    }
  }
  if (positions.length !== 1)
    throw new DomainPolicyError(
      'El punto debe ubicarse sin ambigüedad sobre el recorrido publicado',
    );
  return positions[0];
}

export function passesNear(
  geometry: RouteGeometry,
  point: Coordinates,
  radiusKm: number,
): boolean {
  const path = geometry.coordinates.map(([longitude, latitude]) => ({
    longitude,
    latitude,
  }));
  return path
    .slice(1)
    .some(
      (end, index) =>
        firstAlignedFraction(point, path[index], end, 0, radiusKm) !== null,
    );
}
