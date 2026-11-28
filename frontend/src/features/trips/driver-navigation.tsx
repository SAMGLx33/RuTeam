import { useEffect, useState } from 'react';
import type { RouteManeuver, TripOperation } from '@ruteam/contracts';
import { formStyles as s } from '../../components/ui/protected-page';
import { Text, View } from '../../theme/primitives';
import { RouteGeometryPreview, travelTime } from './route-preview';
import type { NavigationEstimate, NavigationFix } from './route-progress';

export interface DriverObservation {
  fix: NavigationFix;
  estimate: NavigationEstimate | null;
  lastProjection: Extract<NavigationEstimate, { status: 'ON_ROUTE' }> | null;
}

const direction: Record<NonNullable<RouteManeuver['modifier']>, string> = {
  LEFT: 'a la izquierda',
  RIGHT: 'a la derecha',
  SHARP_LEFT: 'cerrado a la izquierda',
  SHARP_RIGHT: 'cerrado a la derecha',
  SLIGHT_LEFT: 'ligeramente a la izquierda',
  SLIGHT_RIGHT: 'ligeramente a la derecha',
  STRAIGHT: 'recto',
  UTURN: 'en retorno',
};

function instruction({
  site,
  movement,
}: {
  site: RouteManeuver['kind'];
  movement: RouteManeuver['modifier'];
}) {
  const turn = movement ? ' ' + direction[movement] : '';
  switch (site) {
    case 'ARRIVE':
      return 'Llegada prevista a la parada de la ruta';
    case 'TURN':
      return 'Gira' + turn;
    case 'FORK':
      return 'Bifurcación' + turn;
    case 'END_OF_ROAD':
      return 'Final de vía' + turn;
    case 'MERGE':
      return 'Incorporación' + turn;
    case 'ON_RAMP':
    case 'OFF_RAMP':
    case 'RAMP':
      return 'Ramal' + turn;
    case 'ROUNDABOUT':
    case 'ROUNDABOUT_TURN':
    case 'ROTARY':
      return 'Glorieta' + turn;
    case 'EXIT_ROUNDABOUT':
    case 'EXIT_ROTARY':
      return 'Salida de glorieta' + turn;
    case 'NEW_NAME':
    case 'CONTINUE':
      return 'Continúa' + turn;
    default:
      return 'Maniobra indicada por el motor vial';
  }
}

export function DriverNavigation({
  row,
  observation,
}: {
  row: TripOperation;
  observation: DriverObservation | null;
}) {
  const [clock, setClock] = useState(Date.now);
  const fix = observation?.fix;
  useEffect(() => {
    if (!fix) return;
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [fix?.timestamp, fix?.latitude, fix?.longitude, fix]);
  const recent = !!fix && clock - fix.timestamp <= 30000;
  const position =
    recent && fix.accuracy !== null && fix.accuracy <= 100 ? fix : undefined;
  const estimate = recent ? observation?.estimate : null;
  const next = row.progress.next;
  const basis = row.startedAt ?? row.estimatedDepartureAt ?? row.departureAt;
  const eta =
    next?.estimatedOffsetSeconds == null
      ? null
      : new Date(
          Date.parse(basis) + next.estimatedOffsetSeconds * 1000,
        ).toISOString();
  const orientation = position?.heading;
  const guidance = estimate?.status === 'ON_ROUTE' ? estimate.next : null;
  const status = !row.maneuvers?.length
    ? 'Las indicaciones viales no están disponibles para esta publicación.'
    : !fix
      ? 'Activa la ubicación compartida para estimar el avance sobre la ruta.'
      : !recent || estimate?.status === 'STALE'
        ? 'La última ubicación es antigua.'
        : estimate?.status === 'IMPRECISE'
          ? 'La precisión de la ubicación es insuficiente para orientar.'
          : estimate?.status === 'OFF_ROUTE'
            ? 'Ubicación fuera de la ruta publicada. Revisa el mapa cuando estés detenido.'
            : estimate?.status === 'AMBIGUOUS'
              ? 'Ubicación ambigua cerca de la ruta. Espera una mejor posición.'
              : null;
  if (!row.itinerary) return null;

  return (
    <View style={s.section} testID="driver-navigation">
      <Text style={s.title}>Navegación del conductor</Text>
      {guidance && (
        <Text style={s.text} testID="next-route-maneuver">
          {instruction({
            site: guidance.maneuver.kind,
            movement: guidance.maneuver.modifier,
          })}
          {guidance.maneuver.street ? ' · ' + guidance.maneuver.street : ''}
          {' · ~' + guidance.remainingMeters + ' m'}
        </Text>
      )}
      {status && <Text style={s.text}>{status}</Text>}
      <RouteGeometryPreview
        geometry={row.itinerary.geometry}
        stops={row.itinerary.stops}
        observedPosition={position}
        devicePosition
      />
      {position && (
        <Text style={s.text}>
          Posición observada · precisión{' '}
          {Math.max(1, Math.ceil(position.accuracy ?? 0))} m
          {typeof orientation === 'number' &&
          orientation >= 0 &&
          orientation <= 360
            ? ' · rumbo ' + Math.round(orientation) + '°'
            : ''}
        </Text>
      )}
      {estimate?.status === 'ON_ROUTE' && (
        <Text style={s.text}>
          Avance GPS estimado · {estimate.percent}% del recorrido
        </Text>
      )}
      {next && (
        <Text style={s.text}>
          Próxima parada sin registrar · {next.label}
          {eta ? ' · estimada ' + travelTime(eta) : ''}
        </Text>
      )}
      <Text style={s.text}>
        Registra las llegadas, abordajes y descensos con el vehículo detenido.
      </Text>
    </View>
  );
}
