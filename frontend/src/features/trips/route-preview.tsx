import { StyleSheet } from 'react-native';
import type {
  RouteGeometry,
  RouteManeuver,
  StopAccess,
  TripPoint,
  TripSummary,
} from '@ruteam/contracts';
import {
  MobilityMap,
  type MapMarker,
} from '../../components/maps/mobility-map';
import { BottomSheet } from '../../components/ui/bottom-sheet';
import { formStyles as s } from '../../components/ui/protected-page';
import { colors } from '../../theme/tokens';
import { Text, View } from '../../theme/primitives';

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

export function maneuverInstruction({ kind, modifier }: RouteManeuver) {
  const turn = modifier ? ' ' + direction[modifier] : '';
  switch (kind) {
    case 'DEPART':
      return 'Salida desde la parada de la ruta';
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

export const tripStatusLabel: Record<TripSummary['status'], string> = {
  PROGRAMADO: 'programado',
  EN_CURSO: 'en curso',
  COMPLETADO: 'completado',
  CANCELADO: 'cancelado',
  INTERRUMPIDO: 'interrumpido',
};

export const accessLabel: Record<StopAccess, string> = {
  PICKUP: 'Abordaje',
  DROPOFF: 'Descenso',
  BOTH: 'Abordaje y descenso',
  WAYPOINT: 'Sólo paso',
};
type PreviewStop = TripPoint & {
  access: StopAccess;
  instructions?: string | null;
  estimatedOffsetSeconds?: number | null;
  reachedAt?: string | null;
};

type MapPoint = Pick<TripPoint, 'latitude' | 'longitude'>;
type MapStop = MapPoint &
  Partial<Pick<PreviewStop, 'label' | 'access' | 'instructions'>>;

export function RouteGeometryPreview({
  geometry,
  stops,
  observedPosition,
  projectedPosition,
  devicePosition = false,
}: {
  geometry: RouteGeometry | null;
  stops: MapStop[];
  observedPosition?: MapPoint;
  projectedPosition?: MapPoint;
  devicePosition?: boolean;
}) {
  const markers = stops.map((point, index): MapMarker => ({
    id: String(index),
    latitude: point.latitude,
    longitude: point.longitude,
    label: point.label ?? `Parada ${index + 1}`,
    description: point.instructions,
    kind:
      index === 0
        ? 'origin'
        : index === stops.length - 1
          ? 'destination'
          : point.access === 'DROPOFF'
            ? 'dropoff'
            : point.access === 'WAYPOINT'
              ? 'waypoint'
              : 'pickup',
  }));
  if (observedPosition)
    markers.push({
      ...observedPosition,
      id: 'shared-position',
      label: devicePosition
        ? 'Tu posición observada'
        : 'Última posición compartida',
      kind: 'current',
    });
  if (projectedPosition)
    markers.push({
      ...projectedPosition,
      id: 'projected-position',
      label: 'Posición estimada sobre el recorrido',
      kind: 'projected',
    });
  return (
    <MobilityMap
      label={
        observedPosition
          ? devicePosition
            ? 'Tu posición observada y la ruta publicada.'
            : 'Vista esquemática de la última ubicación compartida y las paradas publicadas.'
          : 'Vista geográfica de la geometría publicada. Los números corresponden al orden de paradas.'
      }
      allowTiles={!observedPosition && !projectedPosition}
      followPoint={devicePosition ? observedPosition : undefined}
      geometry={geometry}
      markers={markers}
      height={330}
    />
  );
}

export function RoutePreview({
  geometry,
  stops,
  description,
  distanceMeters,
  departureAt,
  initiallyExpanded,
}: {
  geometry: RouteGeometry | null;
  stops: PreviewStop[];
  description: string;
  distanceMeters?: number | null;
  departureAt?: string;
  initiallyExpanded?: boolean;
}) {
  return (
    <View style={styles.route}>
      {(geometry || stops.length > 0) && (
        <RouteGeometryPreview geometry={geometry} stops={stops} />
      )}
      <BottomSheet
        title="Recorrido del conductor"
        initiallyExpanded={initiallyExpanded}
        summary={<Text style={s.text}>{description}</Text>}
      >
        {geometry ? (
          distanceMeters ? (
            <Text style={s.text}>
              {(distanceMeters / 1000).toFixed(1)} km estimados
            </Text>
          ) : null
        ) : (
          <Text style={s.text}>
            Geometría vial no disponible. Consulta los puntos en el orden
            publicado.
          </Text>
        )}
        {stops.map((stop, index) => (
          <View key={index} style={styles.stop}>
            <View style={[styles.dot, index === 0 && styles.origin]} />
            <View style={styles.stopContent}>
              <Text style={styles.stopName}>
                {index + 1}. {stop.label} · {accessLabel[stop.access]}
              </Text>
              {stop.instructions && (
                <Text style={s.text}>{stop.instructions}</Text>
              )}
              {stop.reachedAt ? (
                <Text style={s.text}>
                  Llegada registrada · {travelTime(stop.reachedAt)}
                </Text>
              ) : departureAt && stop.estimatedOffsetSeconds != null ? (
                <Text style={s.text}>
                  Hora estimada ·{' '}
                  {travelTime(
                    new Date(
                      Date.parse(departureAt) +
                        stop.estimatedOffsetSeconds * 1000,
                    ).toISOString(),
                  )}
                </Text>
              ) : null}
            </View>
          </View>
        ))}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  route: { gap: 8, minWidth: 0 },
  stop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    marginLeft: 4,
    borderLeftWidth: 2,
    borderColor: colors.border,
    paddingLeft: 13,
    minHeight: 32,
  },
  dot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    left: -6,
    top: 5,
    backgroundColor: colors.primary,
  },
  origin: { backgroundColor: colors.turquoise },
  stopContent: { flex: 1, gap: 3 },
  stopName: { color: colors.ink, fontSize: 15, fontWeight: '700' },
});

export function travelTime(iso: string) {
  return `${new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · Colombia`;
}
