import { useEffect, useState } from 'react';
import type { TripOperation } from '@ruteam/contracts';
import { BottomSheet } from '../../components/ui/bottom-sheet';
import { formStyles as s } from '../../components/ui/protected-page';
import { Text, View } from '../../theme/primitives';
import {
  maneuverInstruction,
  RouteGeometryPreview,
  travelTime,
} from './route-preview';
import type { NavigationEstimate, NavigationFix } from './route-progress';

export interface DriverObservation {
  fix: NavigationFix;
  receivedAt: number;
  estimate: NavigationEstimate | null;
  lastProjection: Extract<NavigationEstimate, { status: 'ON_ROUTE' }> | null;
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
  const now = Math.max(clock, observation?.receivedAt ?? clock);
  const recent =
    !!fix &&
    now - fix.timestamp <= 30000 &&
    fix.timestamp - now <= 15000 &&
    observation.estimate?.status !== 'STALE';
  const position =
    recent && fix.accuracy !== null && fix.accuracy <= 100 ? fix : undefined;
  const estimate = recent ? observation?.estimate : null;
  const next = row.progress.next;
  const publishedEta =
    next?.estimatedOffsetSeconds == null
      ? null
      : new Date(
          Date.parse(row.departureAt) + next.estimatedOffsetSeconds * 1000,
        ).toISOString();
  const projection = estimate?.status === 'ON_ROUTE' ? estimate : null;
  const arrival = projection?.arrival;
  const updatedEta =
    projection && arrival && arrival.position === next?.position
      ? projection.timestamp + arrival.remainingSeconds * 1000
      : null;
  const expiresAt = recent ? fix.timestamp + 30001 : null;
  useEffect(() => {
    if (expiresAt === null) return;
    const deadline =
      updatedEta && updatedEta > now
        ? Math.min(expiresAt, updatedEta)
        : expiresAt;
    const timer = setTimeout(
      () => setClock(Date.now()),
      Math.max(0, deadline - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiresAt, updatedEta, now]);
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
          {maneuverInstruction(guidance.maneuver)}
          {guidance.maneuver.street ? ' · ' + guidance.maneuver.street : ''}
          {' · ~' + guidance.remainingMeters + ' m'}
        </Text>
      )}
      {status && <Text style={s.text}>{status}</Text>}
      <RouteGeometryPreview
        geometry={row.itinerary.geometry}
        stops={row.itinerary.stops}
        observedPosition={position}
        projectedPosition={projection?.projected}
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
      {next && (
        <BottomSheet
          title="Próxima parada"
          summary={<Text style={s.text}>{next.label}</Text>}
        >
          {publishedEta && (
            <Text style={s.text}>
              Hora publicada · {travelTime(publishedEta)}
            </Text>
          )}
          <Text style={s.text}>
            {updatedEta && updatedEta > now
              ? 'ETA según posición y ruta · ' +
                travelTime(new Date(updatedEta).toISOString())
              : 'ETA GPS pendiente'}
          </Text>
        </BottomSheet>
      )}
      {projection && (
        <Text style={s.text}>
          Avance GPS estimado · {projection.percent}% ·{' '}
          {projection.remainingMeters} m restantes
        </Text>
      )}
      <Text style={s.text}>
        Registra las llegadas, abordajes y descensos con el vehículo detenido.
      </Text>
    </View>
  );
}
