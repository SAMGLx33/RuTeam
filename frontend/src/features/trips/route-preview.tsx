import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import type {
  RouteGeometry,
  StopAccess,
  TripPoint,
  TripSummary,
} from '@ruteam/contracts';
import { formStyles as s } from '../../components/ui/protected-page';
import { Button } from '../../components/ui/button';
import { colors } from '../../theme/tokens';

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
const height = 200;
const padding = 22;

const tileSize = 256;
export function worldPoint(longitude: number, latitude: number) {
  const degrees = Math.max(-85.05113, Math.min(85.05113, latitude));
  const sine = Math.sin((degrees * Math.PI) / 180);
  return {
    x: (180 + longitude) / 360,
    y: 0.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI),
  };
}

type MapPoint = Pick<TripPoint, 'latitude' | 'longitude'>;

export function RouteGeometryPreview({
  geometry,
  stops,
  observedPosition,
}: {
  geometry: RouteGeometry | null;
  stops: MapPoint[];
  observedPosition?: MapPoint;
}) {
  const [width, setWidth] = useState(0);
  const [showTiles, setShowTiles] = useState(false);
  const [tileError, setTileError] = useState(false);
  const tileUrl: unknown = Constants.expoConfig?.extra?.routeTileUrl;
  const attribution: unknown =
    Constants.expoConfig?.extra?.routeTileAttribution;
  const tilesConfigured =
    !observedPosition &&
    typeof tileUrl === 'string' &&
    /^https?:\/\//.test(tileUrl) &&
    ['{z}', '{x}', '{y}'].every((part) => tileUrl.includes(part)) &&
    typeof attribution === 'string' &&
    attribution.trim().length > 0;
  const coordinates = geometry?.coordinates ?? [];
  const observed =
    observedPosition &&
    worldPoint(observedPosition.longitude, observedPosition.latitude);
  const points = [
    ...coordinates.map(([longitude, latitude]) =>
      worldPoint(longitude, latitude),
    ),
    ...stops.map(({ longitude, latitude }) => worldPoint(longitude, latitude)),
    ...(observed ? [observed] : []),
  ];
  const horizontal = points.map(({ x }) => x);
  const vertical = points.map(({ y }) => y);
  const minX = Math.min(...horizontal);
  const minY = Math.min(...vertical);
  const dx = Math.max(...horizontal) - minX;
  const dy = Math.max(...vertical) - minY;
  const fitScale = Math.min(
    (Math.max(width, 2 * padding + 1) - 2 * padding) / (dx || Number.EPSILON),
    (height - 2 * padding) / (dy || Number.EPSILON),
  );
  const zoom = Math.min(
    19,
    Math.max(0, Math.floor(Math.log2(fitScale / tileSize))),
  );
  const tileCount = 2 ** zoom;
  const scale = showTiles
    ? tileCount * tileSize
    : Math.min(fitScale, 2 ** 19 * tileSize);
  const left = (minX + dx / 2) * scale - width / 2;
  const top = (minY + dy / 2) * scale - height / 2;
  const project = (longitude: number, latitude: number) => {
    const point = worldPoint(longitude, latitude);
    return { x: point.x * scale - left, y: point.y * scale - top };
  };
  const tiles: { uri: string; x: number; y: number }[] = [];
  if (showTiles && tilesConfigured && width > 0 && !tileError) {
    for (
      let x = Math.max(0, Math.floor(left / tileSize));
      x < Math.min(tileCount, Math.ceil((left + width) / tileSize));
      x++
    ) {
      for (
        let y = Math.max(0, Math.floor(top / tileSize));
        y < Math.min(tileCount, Math.ceil((top + height) / tileSize));
        y++
      ) {
        tiles.push({
          uri: tileUrl
            .replace('{z}', String(zoom))
            .replace('{x}', String(x))
            .replace('{y}', String(y)),
          x: x * tileSize - left,
          y: y * tileSize - top,
        });
      }
    }
  }
  const path = coordinates.map(([longitude, latitude]) =>
    project(longitude, latitude),
  );
  return (
    <>
      <View
        accessible
        accessibilityLabel={
          observed
            ? 'Vista esquemática de la última ubicación compartida y las paradas publicadas.'
            : 'Vista geográfica de la geometría publicada. Los números corresponden al orden de paradas.'
        }
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={styles.map}
      >
        {tiles.map(({ uri, x, y }) => (
          <Image
            key={uri}
            source={{ uri }}
            onError={() => setTileError(true)}
            accessible={false}
            style={[styles.tile, { left: x, top: y }]}
          />
        ))}
        {width > 0 &&
          path.slice(1).map(({ x, y }, index) => {
            const previous = path[index];
            const length = Math.hypot(x - previous.x, y - previous.y);
            const angle = Math.atan2(y - previous.y, x - previous.x);
            return (
              <View
                key={index}
                style={[
                  styles.line,
                  {
                    left: (x + previous.x - length) / 2,
                    top: (y + previous.y) / 2 - 2,
                    width: length,
                    transform: [{ rotate: `${angle}rad` }],
                  },
                ]}
              />
            );
          })}
        {width > 0 &&
          stops.map((point, index) => {
            const { x, y } = project(point.longitude, point.latitude);
            return (
              <View
                key={index}
                style={[styles.pin, { left: x - 11, top: y - 11 }]}
              >
                <Text style={styles.pinLabel}>{index + 1}</Text>
              </View>
            );
          })}
        {width > 0 && observed && (
          <View
            style={[
              styles.observedPin,
              {
                left: observed.x * scale - left - 8,
                top: observed.y * scale - top - 8,
              },
            ]}
          />
        )}
      </View>
      {tilesConfigured && (
        <Button
          title={showTiles ? 'Ocultar mapa base' : 'Mostrar mapa base'}
          secondary
          onPress={() => {
            setTileError(false);
            setShowTiles(!showTiles);
          }}
        />
      )}
      {showTiles &&
        (tileError ? (
          <Text style={s.text}>
            El mapa base no está disponible. La geometría sigue visible.
          </Text>
        ) : (
          <Text style={s.text}>{String(attribution)}</Text>
        ))}
    </>
  );
}

export function RoutePreview({
  geometry,
  stops,
  description,
  distanceMeters,
  departureAt,
}: {
  geometry: RouteGeometry | null;
  stops: PreviewStop[];
  description: string;
  distanceMeters?: number | null;
  departureAt?: string;
}) {
  return (
    <View style={s.section}>
      <Text style={s.title}>Recorrido del conductor</Text>
      <Text style={s.text}>{description}</Text>
      {geometry ? (
        <>
          <RouteGeometryPreview geometry={geometry} stops={stops} />
          <Text style={s.text}>
            Geometría aportada por el conductor
            {distanceMeters
              ? ` · ${(distanceMeters / 1000).toFixed(1)} km estimados`
              : ''}
          </Text>
        </>
      ) : (
        <Text style={s.text}>
          Geometría vial no disponible. Consulta los puntos en el orden
          publicado.
        </Text>
      )}
      {stops.map((stop, index) => (
        <View key={index}>
          <Text style={s.text}>
            {index + 1}. {stop.label} · {accessLabel[stop.access]}
          </Text>
          {stop.instructions && <Text style={s.text}>{stop.instructions}</Text>}
          {stop.reachedAt ? (
            <Text style={s.text}>
              Llegada registrada · {travelTime(stop.reachedAt)}
            </Text>
          ) : departureAt && stop.estimatedOffsetSeconds != null ? (
            <Text style={s.text}>
              Hora estimada ·{' '}
              {travelTime(
                new Date(
                  Date.parse(departureAt) + stop.estimatedOffsetSeconds * 1000,
                ).toISOString(),
              )}
            </Text>
          ) : null}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  map: {
    height,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.selected,
    borderRadius: 10,
    overflow: 'hidden',
  },
  observedPin: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#9a4108',
  },
  tile: { position: 'absolute', width: tileSize, height: tileSize },
  line: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  pin: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinLabel: { color: '#fff', fontWeight: '700', fontSize: 11 },
});

export function travelTime(iso: string) {
  return `${new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · Colombia`;
}
