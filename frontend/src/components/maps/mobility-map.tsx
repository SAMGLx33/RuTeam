import { useEffect, useState } from 'react';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import {
  Image,
  Platform,
  StyleSheet,
  type GestureResponderEvent,
} from 'react-native';
import type { RouteGeometry } from '@ruteam/contracts';
import { Text, View, Pressable } from '../../theme/primitives';
import { useAppearance } from '../../theme/appearance';
import { colors, radii } from '../../theme/tokens';
import { Button, IconButton } from '../ui/button';
import { Icon, type IconName } from '../ui/icon';
import {
  caliCenter,
  clamp,
  coordinatesFromWorld,
  fitCamera,
  tileSize,
  worldPoint,
  type Camera,
  type Coordinates,
  type WorldPoint,
} from './mercator';

import { createMapGestures } from './map-gestures';

export type MarkerKind =
  | 'origin'
  | 'destination'
  | 'campus'
  | 'pickup'
  | 'dropoff'
  | 'waypoint'
  | 'current'
  | 'projected';
export interface MapMarker extends Coordinates {
  id: string;
  label: string;
  kind: MarkerKind;
  description?: string | null;
}
const symbols: Record<MarkerKind, IconName> = {
  origin: 'circle',
  destination: 'flag',
  campus: 'book-open',
  pickup: 'arrow-up-right',
  dropoff: 'arrow-down-left',
  waypoint: 'more-horizontal',
  current: 'crosshair',
  projected: 'circle',
};

function tilesConfiguration() {
  const url: unknown = Constants.expoConfig?.extra?.routeTileUrl;
  const attribution: unknown =
    Constants.expoConfig?.extra?.routeTileAttribution;
  return typeof url === 'string' &&
    /^https?:\/\//.test(url) &&
    ['{z}', '{x}', '{y}'].every((part) => url.includes(part)) &&
    typeof attribution === 'string' &&
    attribution.trim()
    ? { url, attribution }
    : null;
}
export const hasMapTiles = () => tilesConfiguration() !== null;

function valid(point: Coordinates) {
  return (
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}
export function MobilityMap({
  label,
  geometry,
  markers = [],
  reference = caliCenter,
  height = 330,
  onPick,
  allowTiles = true,
  locate = false,
  followPoint,
}: {
  label: string;
  geometry?: RouteGeometry | null;
  markers?: MapMarker[];
  reference?: Coordinates;
  height?: number;
  onPick?: (coordinates: Coordinates) => void;
  allowTiles?: boolean;
  locate?: boolean;
  followPoint?: Coordinates;
}) {
  const { palette } = useAppearance();
  const [width, setWidth] = useState(0);
  const [camera, setCamera] = useState<{
    view: Camera;
    privateViewport: boolean;
  } | null>(null);
  const [selection, setSelection] = useState<string | null>(null);
  const [following, setFollowing] = useState(false);
  const [position, setPosition] = useState<Coordinates | null>(null);
  const [locationError, setLocationError] = useState('');
  const [locating, setLocating] = useState(false);
  const [tileAttempt, setTileAttempt] = useState(0);
  const [tileStatus, setTileStatus] = useState<
    Record<string, 'loaded' | 'failed'>
  >({});
  const points = markers.filter(valid);
  const line = (geometry?.coordinates ?? []).map(([lon, lat]) =>
    worldPoint(lon, lat),
  );
  const markerWorld = points.map((point) =>
    worldPoint(point.longitude, point.latitude),
  );
  const fitted = fitCamera([...line, ...markerWorld], reference, width, height);
  const follows = following && followPoint && valid(followPoint);
  const privateViewport = !allowTiles || !!follows || !!camera?.privateViewport;
  const tileConfig = privateViewport ? null : tilesConfiguration();
  const active = follows
    ? {
        center: worldPoint(followPoint.longitude, followPoint.latitude),
        zoom: camera?.view.zoom ?? 16,
      }
    : (camera?.view ?? fitted);
  const [gestures] = useState(() =>
    createMapGestures(fitted, (next, isPrivate) => {
      setFollowing(false);
      setCamera({ view: next, privateViewport: isPrivate });
    }),
  );
  const {
    center: { x: activeX, y: activeY },
    zoom: activeZoom,
  } = active;
  useEffect(() => {
    gestures.setActive(
      { center: { x: activeX, y: activeY }, zoom: activeZoom },
      privateViewport,
    );
  }, [activeX, activeY, activeZoom, gestures, privateViewport]);
  const count = 2 ** active.zoom;
  const scale = count * tileSize;
  const left = active.center.x * scale - width / 2;
  const top = active.center.y * scale - height / 2;
  const project = ({ x, y }: WorldPoint) => ({
    x: x * scale - left,
    y: y * scale - top,
  });
  const path = line.map(project);
  const location =
    position && project(worldPoint(position.longitude, position.latitude));
  const tileKey = (x: number, y: number) =>
    `${active.zoom}/${x}/${y}/${tileAttempt}`;
  const tiles: { key: string; uri: string; x: number; y: number }[] = [];
  if (tileConfig && width > 0) {
    for (
      let x = Math.max(0, Math.floor(left / tileSize));
      x < Math.min(count, Math.ceil((left + width) / tileSize));
      x++
    ) {
      for (
        let y = Math.max(0, Math.floor(top / tileSize));
        y < Math.min(count, Math.ceil((top + height) / tileSize));
        y++
      ) {
        tiles.push({
          key: tileKey(x, y),
          uri: tileConfig.url
            .replace('{z}', String(active.zoom))
            .replace('{x}', String(x))
            .replace('{y}', String(y)),
          x: x * tileSize - left,
          y: y * tileSize - top,
        });
      }
    }
  }
  const selected = points.find(({ id }) => id === selection);
  const tileError = tiles.some(({ key }) => tileStatus[key] === 'failed');
  const isLoadedAt = (x: number, y: number) =>
    !!tileConfig &&
    tileStatus[
      tileKey(
        Math.floor((left + x) / tileSize),
        Math.floor((top + y) / tileSize),
      )
    ] === 'loaded';
  const centreSelectable = isLoadedAt(width / 2, height / 2);

  function rememberTile(key: string, status: 'loaded' | 'failed') {
    setTileStatus((current) => {
      if (current[key] === status) return current;
      const next = { ...current, [key]: status };
      const keys = Object.keys(next);
      if (keys.length > 192) delete next[keys[0]];
      return next;
    });
  }
  const zoomBy = (delta: number) =>
    setCamera({
      view: { ...active, zoom: clamp(active.zoom + delta, 3, 19) },
      privateViewport,
    });

  function moveBy(x: number, y: number) {
    setCamera({
      privateViewport,
      view: {
        ...active,
        center: {
          x: clamp(active.center.x + x / scale, 0, 1),
          y: clamp(active.center.y + y / scale, 0, 1),
        },
      },
    });
  }

  function choose(event: GestureResponderEvent) {
    if (!onPick || gestures.didDrag()) return;
    let { locationX: x, locationY: y } = event.nativeEvent;
    if (Platform.OS === 'web') {
      const target = event.currentTarget as unknown as HTMLElement;
      const pointer = event.nativeEvent as unknown as MouseEvent;
      const bounds = target.getBoundingClientRect();
      x = pointer.clientX - bounds.left;
      y = pointer.clientY - bounds.top;
    }
    if (
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      x < 0 ||
      x > width ||
      y < 0 ||
      y > height ||
      !isLoadedAt(x, y)
    )
      return;
    onPick(
      coordinatesFromWorld({ x: (left + x) / scale, y: (top + y) / scale }),
    );
  }

  async function centerOnMe() {
    setLocating(true);
    setLocationError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError(
          'Permiso de ubicación denegado. Puedes seguir explorando el mapa.',
        );
        return;
      }
      const sample = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPosition(sample.coords);
      // The tile provider never receives the viewport of a private position.
      setFollowing(false);
      setCamera({
        privateViewport: true,
        view: {
          center: worldPoint(sample.coords.longitude, sample.coords.latitude),
          zoom: 15,
        },
      });
    } catch {
      setLocationError(
        'No se pudo obtener tu ubicación. Reintenta cuando esté disponible.',
      );
    } finally {
      setLocating(false);
    }
  }

  return (
    <View style={styles.frame}>
      <View
        accessibilityLabel={onPick ? undefined : label}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        style={[styles.map, { height }]}
        {...gestures.panHandlers}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {tiles.map(({ key, uri, x, y }) => (
            <Image
              key={key}
              source={
                Platform.OS === 'web'
                  ? { uri }
                  : { uri, headers: { 'User-Agent': 'RuTeam/1.0' } }
              }
              onLoad={() => rememberTile(key, 'loaded')}
              onError={() => rememberTile(key, 'failed')}
              style={[styles.tile, { left: x, top: y }]}
              accessible={false}
            />
          ))}
          {width > 0 &&
            path.slice(1).map((point, index) => {
              const previous = path[index];
              const dx = point.x - previous.x;
              const dy = point.y - previous.y;
              const length = Math.hypot(dx, dy);
              return (
                <View
                  key={index}
                  style={[
                    styles.line,
                    {
                      left: (point.x + previous.x - length) / 2,
                      top: (point.y + previous.y) / 2 - 2,
                      width: length,
                      transform: [{ rotate: `${Math.atan2(dy, dx)}rad` }],
                    },
                  ]}
                />
              );
            })}
        </View>
        {onPick && (
          <Pressable
            onPressIn={() => {
              gestures.resetDrag();
            }}
            onPress={choose}
            accessibilityRole="button"
            accessibilityLabel={label}
            style={StyleSheet.absoluteFill}
          />
        )}
        {width > 0 &&
          points.map((marker, index) => {
            const position = project(markerWorld[index]);
            return (
              <Pressable
                key={marker.id}
                accessibilityRole="button"
                accessibilityLabel={marker.label}
                accessibilityState={{ selected: selection === marker.id }}
                onPress={() =>
                  setSelection(selection === marker.id ? null : marker.id)
                }
                style={[
                  styles.touchPin,
                  { left: position.x - 22, top: position.y - 22 },
                ]}
              >
                <View
                  style={[
                    styles.marker,
                    {
                      backgroundColor:
                        marker.kind === 'origin' ||
                        marker.kind === 'pickup' ||
                        marker.kind === 'projected'
                          ? palette.turquoise
                          : marker.kind === 'waypoint'
                            ? palette.muted
                            : marker.kind === 'current'
                              ? palette.bannerText
                              : palette.primary,
                      borderColor: palette.onPrimary,
                      transform: [
                        { scale: selection === marker.id ? 1.18 : 1 },
                      ],
                    },
                  ]}
                >
                  <Icon
                    name={symbols[marker.kind]}
                    color={palette.onPrimary}
                    size={15}
                  />
                </View>
              </Pressable>
            );
          })}
        {location && (
          <View
            pointerEvents="none"
            accessibilityLabel="Tu posición en este dispositivo"
            style={[
              styles.userPin,
              { left: location.x - 9, top: location.y - 9 },
            ]}
          />
        )}
        <View style={styles.controls}>
          <IconButton
            label="Ajustar mapa al recorrido"
            icon="maximize"
            onPress={() => {
              setCamera(null);
              setFollowing(false);
            }}
          />
          <IconButton
            label="Acercar"
            icon="plus"
            disabled={active.zoom >= 19}
            onPress={() => zoomBy(1)}
          />
          <IconButton
            label="Alejar"
            icon="minus"
            disabled={active.zoom <= 3}
            onPress={() => zoomBy(-1)}
          />
          {followPoint && (
            <IconButton
              label={follows ? 'Explorar mapa' : 'Seguir ubicación'}
              icon="crosshair"
              onPress={() => {
                setCamera(follows ? { view: active, privateViewport } : null);
                setFollowing(!follows);
              }}
            />
          )}
          {locate && (
            <IconButton
              label="Localizar mi posición"
              icon="crosshair"
              disabled={locating}
              onPress={() => {
                void centerOnMe();
              }}
            />
          )}
        </View>
        {tileConfig && (
          <Text style={styles.attribution}>{tileConfig.attribution}</Text>
        )}
        {!tileConfig &&
          allowTiles &&
          !geometry &&
          !points.length &&
          !position && (
            <View pointerEvents="none" style={styles.noMap}>
              <Icon name="map" size={25} color={palette.muted} />
              <Text style={styles.secondary}>Mapa base no configurado</Text>
            </View>
          )}
      </View>
      {selected && (
        <View style={styles.caption}>
          <Text style={styles.selected}>{selected.label}</Text>
          {selected.description && (
            <Text style={styles.secondary}>{selected.description}</Text>
          )}
        </View>
      )}
      {onPick && (
        <View style={styles.caption}>
          <View style={styles.directions}>
            <IconButton
              label="Mover mapa al oeste"
              icon="arrow-left"
              onPress={() => moveBy(-140, 0)}
            />
            <IconButton
              label="Mover mapa al norte"
              icon="arrow-up"
              onPress={() => moveBy(0, -140)}
            />
            <IconButton
              label="Mover mapa al sur"
              icon="arrow-down"
              onPress={() => moveBy(0, 140)}
            />
            <IconButton
              label="Mover mapa al este"
              icon="arrow-right"
              onPress={() => moveBy(140, 0)}
            />
          </View>
          <Button
            secondary
            title="Marcar centro del mapa"
            disabled={!centreSelectable}
            onPress={() => onPick(coordinatesFromWorld(active.center))}
          />
        </View>
      )}
      {!tileConfig &&
        allowTiles &&
        (privateViewport || !!geometry || points.length > 0) && (
          <Text style={styles.notice}>
            {privateViewport
              ? 'Posición centrada en este dispositivo.'
              : 'Mapa base no configurado.'}
          </Text>
        )}
      {tileError && (
        <View style={styles.caption}>
          <Text
            accessibilityRole={onPick ? 'alert' : undefined}
            accessibilityLiveRegion="polite"
            style={styles.secondary}
          >
            Algunas teselas del mapa base no se cargaron.
          </Text>
          <Button
            secondary
            title="Reintentar mapa"
            onPress={() => {
              setTileStatus({});
              setTileAttempt((attempt) => attempt + 1);
            }}
          />
        </View>
      )}
      {!!locationError && (
        <Text accessibilityRole="alert" style={styles.notice}>
          {locationError}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.panel,
    overflow: 'hidden',
  },
  map: { backgroundColor: colors.map, overflow: 'hidden' },
  tile: { position: 'absolute', width: tileSize, height: tileSize },
  line: {
    position: 'absolute',
    height: 4,
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  touchPin: {
    position: 'absolute',
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  marker: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userPin: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: colors.onPrimary,
    backgroundColor: colors.primary,
  },
  controls: { position: 'absolute', right: 10, top: 10, gap: 6 },
  attribution: {
    position: 'absolute',
    bottom: 4,
    left: 5,
    paddingHorizontal: 5,
    paddingVertical: 2,
    fontSize: 10,
    color: colors.ink,
    backgroundColor: colors.surface,
    borderRadius: 4,
    maxWidth: '83%',
  },
  noMap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 52,
  },
  caption: { padding: 12, gap: 7 },
  directions: { flexDirection: 'row', gap: 5, justifyContent: 'center' },
  notice: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    color: colors.muted,
    fontSize: 12,
  },
  selected: { fontSize: 15, color: colors.ink, fontWeight: '700' },
  secondary: { fontSize: 13, color: colors.muted },
});
