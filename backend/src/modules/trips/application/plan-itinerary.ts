import type {
  RouteGeometry,
  RouteManeuver,
  RouteStop,
} from '@ruteam/contracts';
import { DomainPolicyError } from '../../../common/errors/domain-policy.error.js';
import { pampalindaCode } from '../../campus/domain/publication-campus.js';
import type {
  ItineraryDto,
  MeetingPointDto,
  RouteOptionsDto,
} from '../dto/itinerary.dto.js';
import type { PublicationUnit } from '../infrastructure/repositories/trips.repository.js';
import {
  tripDirection,
  validateGeometry,
} from '../domain/models/driver-route.js';

type PlannedStop = Omit<RouteStop, 'id'>;
export interface PlannedItinerary {
  stops: PlannedStop[];
  description: string;
  geometry?: RouteGeometry;
  distanceMeters?: number;
  maneuvers?: RouteManeuver[];
}

async function resolvePoint(
  input: MeetingPointDto,
  unit: PublicationUnit,
  origin = false,
) {
  const instructions = input.instructions?.trim() || null;
  if (input.campusPointId) {
    if (
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
      point.latitude === null ||
      point.longitude === null
    )
      throw new DomainPolicyError(
        'Elige un punto institucional activo y con coordenadas',
      );
    const label = input.label?.trim();
    if (
      ((origin && point.kind === 'CAMPUS') || input.label !== undefined) &&
      (!label || label.length < 2)
    )
      throw new DomainPolicyError(
        'Describe el punto de encuentro dentro de la USC',
      );
    const site =
      point.kind === 'CAMPUS'
        ? point
        : point.campusSiteId
          ? await unit.destination(point.campusSiteId)
          : null;
    if (!site?.active || site.kind !== 'CAMPUS' || site.campus !== 'USC')
      throw new DomainPolicyError(
        'Este punto necesita estar asociado a una sede USC activa',
      );
    const access = label
      ? 'Ubicación interna descrita; el mapa usa una referencia del campus'
      : point.kind === 'CAMPUS'
        ? 'Referencia pública del campus'
        : [point.description, point.accessReference]
            .filter(Boolean)
            .join(' · ');
    const notes = [access, instructions].filter(Boolean).join(' · ');
    if (notes.length > 240)
      throw new DomainPolicyError(
        'Acorta las instrucciones para este punto institucional',
      );
    return {
      label: label ?? point.name,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
      campus: point.campus,
      campusPointId: point.id,
      campusSiteId: site.id,
      instructions: notes || null,
    };
  }
  if (input.campusReference)
    throw new DomainPolicyError(
      'Selecciona una referencia institucional del catálogo USC',
    );
  if (
    !input.label ||
    input.label.trim().length < 2 ||
    input.latitude === undefined ||
    input.longitude === undefined
  )
    throw new DomainPolicyError(
      'Cada punto personalizado requiere una referencia pública y su ubicación',
    );
  return {
    label: input.label.trim(),
    latitude: input.latitude,
    longitude: input.longitude,
    campus: null,
    campusPointId: null,
    campusSiteId: null,
    instructions,
  };
}

export async function resolveRouteStops(
  input: RouteOptionsDto,
  unit: PublicationUnit,
): Promise<PlannedStop[]> {
  const stops: PlannedStop[] = [
    {
      ...(await resolvePoint(input.origin, unit, true)),
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
  const direction = tripDirection(stops);
  if (!direction || (input.direction && input.direction !== direction))
    throw new DomainPolicyError(
      'El viaje debe conectar un extremo USC del catálogo y un extremo externo, en el sentido seleccionado',
    );
  if (
    direction === 'HACIA_USC' &&
    stops.slice(1, -1).some(({ access }) => access !== 'WAYPOINT')
  )
    throw new DomainPolicyError(
      'Hacia la USC sólo se aborda en el origen y se desciende en la USC. Los puntos intermedios son sólo de paso',
    );
  if (
    direction === 'DESDE_USC' &&
    stops
      .slice(1, -1)
      .some(({ access }) => access === 'PICKUP' || access === 'BOTH')
  )
    throw new DomainPolicyError(
      'En viajes desde la USC se aborda en el punto de encuentro de origen',
    );
  return stops;
}

export async function assertPublicationCampus(
  stops: PlannedItinerary['stops'],
  unit: PublicationUnit,
  allowDemo: boolean,
) {
  const siteId = stops[0]?.campusSiteId ?? stops.at(-1)?.campusSiteId;
  const site = siteId ? await unit.destination(siteId) : null;
  if (
    !site?.active ||
    !(site.code === pampalindaCode || (allowDemo && site.demo))
  )
    throw new DomainPolicyError(
      'Las nuevas publicaciones se realizan desde o hacia Ciudadela Pampalinda.',
    );
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
