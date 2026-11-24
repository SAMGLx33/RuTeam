import type { RouteGeometry, RouteStop } from '@ruteam/contracts';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';
import type {
  ItineraryDto,
  MeetingPointDto,
  RouteOptionsDto,
} from '../dto/itinerary.dto.js';
import type { PublicationUnit } from '../infrastructure/repositories/trips.repository.js';
import { validateGeometry } from '../domain/models/driver-route.js';

type PlannedStop = Omit<RouteStop, 'id'>;
export interface PlannedItinerary {
  stops: PlannedStop[];
  description: string;
  geometry?: RouteGeometry;
  distanceMeters?: number;
}

async function resolvePoint(input: MeetingPointDto, unit: PublicationUnit) {
  const instructions = input.instructions?.trim() || null;
  if (input.campusPointId) {
    if (
      input.label !== undefined ||
      input.latitude !== undefined ||
      input.longitude !== undefined ||
      input.campusReference !== undefined
    )
      throw new DomainPolicyError(
        'Elige un punto institucional o introduce un punto personalizado',
      );
    const point = await unit.destination(input.campusPointId);
    if (
      !point?.active ||
      point.campus !== 'USC' ||
      point.kind === 'CAMPUS' ||
      point.latitude === null ||
      point.longitude === null
    )
      throw new DomainPolicyError(
        'Elige un punto institucional activo y con coordenadas',
      );
    const access = [point.description, point.accessReference]
      .filter(Boolean)
      .join(' · ');
    const notes = [access, instructions].filter(Boolean).join(' · ');
    if (notes.length > 240)
      throw new DomainPolicyError(
        'Acorta las instrucciones para este punto institucional',
      );
    return {
      label: point.name,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      campus: point.campus,
      campusPointId: point.id,
      instructions: notes || null,
    };
  }
  if (
    !input.label ||
    input.label.trim().length < 2 ||
    input.latitude === undefined ||
    input.longitude === undefined ||
    !instructions
  )
    throw new DomainPolicyError(
      'Cada punto personalizado requiere nombre público, coordenadas e instrucciones',
    );
  return {
    label: input.label.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    campus: input.campusReference ?? null,
    campusPointId: null,
    instructions,
  };
}

export async function resolveRouteStops(
  input: RouteOptionsDto,
  unit: PublicationUnit,
): Promise<PlannedStop[]> {
  const stops: PlannedStop[] = [
    {
      ...(await resolvePoint(input.origin, unit)),
      position: 0,
      access: 'PICKUP',
    },
  ];
  for (const stop of input.stops)
    stops.push({
      ...(await resolvePoint(stop, unit)),
      position: stops.length,
      access: stop.access,
    });
  stops.push({
    ...(await resolvePoint(input.destination, unit)),
    position: stops.length,
    access: 'DROPOFF',
  });
  if (
    !stops.some((stop) => stop.campus === 'USC' && stop.access !== 'WAYPOINT')
  )
    throw new DomainPolicyError(
      'El trayecto debe incluir un punto de encuentro asociado a la USC',
    );
  return stops;
}

export async function planItinerary(
  input: ItineraryDto,
  unit: PublicationUnit,
): Promise<PlannedItinerary> {
  const description = input.description.trim();
  if (description.length < 2)
    throw new DomainPolicyError(
      'Describe las vías o referencias del recorrido',
    );
  const stops = await resolveRouteStops(input, unit);
  if (input.geometry)
    return {
      stops,
      description,
      geometry: input.geometry,
      distanceMeters: validateGeometry(input.geometry, stops),
    };
  return { stops, description };
}
