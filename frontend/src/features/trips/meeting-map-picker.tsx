import { useState } from 'react';
import {
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
} from 'react-native';
import Constants from 'expo-constants';
import type { TripPoint } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { worldPoint } from './route-preview';

export type Coordinates = Pick<TripPoint, 'latitude' | 'longitude'>;
const tileSize = 256;
const height = 224;
const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

function coordinatesFromWorld(x: number, y: number): Coordinates {
  return {
    longitude: clamp(x, 0, 1) * 360 - 180,
    latitude:
      (Math.atan(Math.sinh(Math.PI * (1 - 2 * clamp(y, 0, 1)))) * 180) /
      Math.PI,
  };
}

export function MeetingMapPicker({
  title,
  reference,
  value,
  onSelect,
}: {
  title: string;
  reference: Coordinates;
  value?: Coordinates;
  onSelect: (coordinates: Coordinates) => void;
}) {
  const [open, setOpen] = useState(false);
  const [zoom, setZoom] = useState(13);
  const [width, setWidth] = useState(0);
  const [failed, setFailed] = useState(false);
  const [center, setCenter] = useState(() =>
    worldPoint(
      value?.longitude ?? reference.longitude,
      value?.latitude ?? reference.latitude,
    ),
  );
  const template: unknown = Constants.expoConfig?.extra?.routeTileUrl;
  const attribution: unknown =
    Constants.expoConfig?.extra?.routeTileAttribution;
  if (
    typeof template !== 'string' ||
    !/^https?:\/\//.test(template) ||
    !['{z}', '{x}', '{y}'].every((part) => template.includes(part)) ||
    typeof attribution !== 'string' ||
    !attribution.trim()
  )
    return (
      <Text style={s.text}>
        El mapa de selección requiere un proveedor de teselas configurado.
      </Text>
    );

  const count = 2 ** zoom;
  const scale = count * tileSize;
  const left = center.x * scale - width / 2;
  const top = center.y * scale - height / 2;
  const marker = value && worldPoint(value.longitude, value.latitude);
  const tiles: { uri: string; left: number; top: number }[] = [];
  if (open && width && !failed) {
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
          uri: template
            .replace('{z}', String(zoom))
            .replace('{x}', String(x))
            .replace('{y}', String(y)),
          left: x * tileSize - left,
          top: y * tileSize - top,
        });
      }
    }
  }
  function move(x: number, y: number) {
    setFailed(false);
    setCenter((point) => ({
      x: clamp(point.x + x / scale, 0, 1),
      y: clamp(point.y + y / scale, 0, 1),
    }));
  }
  function select(event: GestureResponderEvent) {
    if (!width || failed) return;
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
      y > height
    )
      return;
    onSelect(coordinatesFromWorld((left + x) / scale, (top + y) / scale));
  }

  return (
    <>
      <Button
        title={open ? `Cerrar mapa · ${title}` : `Elegir en mapa · ${title}`}
        secondary
        onPress={() => {
          setOpen(!open);
          setFailed(false);
        }}
      />
      {value && <Text style={s.text}>Ubicación seleccionada · {title}</Text>}
      {open && (
        <>
          <Text style={s.text}>
            Mueve o acerca el mapa. Toca un lugar público para marcarlo.
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Mapa para seleccionar · ${title}`}
            onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
            onPress={select}
            style={styles.map}
          >
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              {tiles.map(({ uri, left, top }) => (
                <Image
                  key={uri}
                  source={{ uri }}
                  onError={() => setFailed(true)}
                  style={[styles.tile, { left, top }]}
                />
              ))}
              {marker && (
                <Text
                  style={[
                    styles.marker,
                    {
                      left: marker.x * scale - left - 8,
                      top: marker.y * scale - top - 12,
                    },
                  ]}
                >
                  ●
                </Text>
              )}
            </View>
          </Pressable>
          <View style={styles.controls}>
            <Button
              title="Marcar centro del mapa"
              secondary
              disabled={failed}
              onPress={() => onSelect(coordinatesFromWorld(center.x, center.y))}
            />
            <Button title="Oeste" secondary onPress={() => move(-140, 0)} />
            <Button title="Este" secondary onPress={() => move(140, 0)} />
            <Button title="Norte" secondary onPress={() => move(0, -140)} />
            <Button title="Sur" secondary onPress={() => move(0, 140)} />
            <Button
              title="Acercar"
              secondary
              disabled={zoom >= 18}
              onPress={() => {
                setFailed(false);
                setZoom(zoom + 1);
              }}
            />
            <Button
              title="Alejar"
              secondary
              disabled={zoom <= 6}
              onPress={() => {
                setFailed(false);
                setZoom(zoom - 1);
              }}
            />
          </View>
          {failed ? (
            <Text style={s.error} accessibilityRole="alert">
              No se cargó el mapa. Reabre el mapa para reintentar.
            </Text>
          ) : (
            <Text style={s.text}>{attribution}</Text>
          )}
        </>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  map: {
    height,
    overflow: 'hidden',
    backgroundColor: '#e8eef0',
    borderRadius: 8,
  },
  tile: { position: 'absolute', width: tileSize, height: tileSize },
  marker: { position: 'absolute', color: '#0e766e', fontSize: 20 },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
