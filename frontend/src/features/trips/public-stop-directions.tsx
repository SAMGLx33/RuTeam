import { useState } from 'react';
import { Linking } from 'react-native';
import type { RouteStop } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { Text, View } from '../../theme/primitives';
import { TripSectionTitle, tripSurfaceStyles as ui } from './trip-surface';

export function PublicStopDirections({ stops }: { stops: RouteStop[] }) {
  const [selectedId, setSelectedId] = useState<string>();
  const [error, setError] = useState(false);
  // Campus stops can carry approximate site coordinates for indoor meetings.
  const publicStops = stops.filter(
    (stop) =>
      stop.access !== 'WAYPOINT' &&
      stop.campus === null &&
      stop.campusPointId === null &&
      stop.campusSiteId == null &&
      Number.isFinite(stop.latitude) &&
      Math.abs(stop.latitude) <= 90 &&
      Number.isFinite(stop.longitude) &&
      Math.abs(stop.longitude) <= 180,
  );
  const selected = publicStops.find((stop) => stop.id === selectedId);

  if (publicStops.length === 0) return null;

  return (
    <View style={ui.panel} testID="trip-public-directions">
      <TripSectionTitle>Cómo llegar</TripSectionTitle>
      {selected ? (
        <View style={ui.facts}>
          <Text style={s.text} accessibilityLiveRegion="polite">
            Se abrirá Google Maps con el destino {selected.label}.
          </Text>
          <Button
            title="Continuar en Google Maps"
            icon="external-link"
            onPress={() => {
              const destination = encodeURIComponent(
                `${selected.latitude},${selected.longitude}`,
              );
              setSelectedId(undefined);
              void Linking.openURL(
                `https://www.google.com/maps/dir/?api=1&destination=${destination}`,
              ).catch(() => setError(true));
            }}
          />
          <Button
            secondary
            title="Volver a las paradas"
            onPress={() => setSelectedId(undefined)}
          />
        </View>
      ) : (
        publicStops.map((stop) => (
          <Button
            key={stop.id}
            secondary
            title={`Indicaciones a ${stop.label}`}
            icon="navigation"
            onPress={() => {
              setError(false);
              setSelectedId(stop.id);
            }}
          />
        ))
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          No se pudo abrir Google Maps. Inténtalo de nuevo.
        </Text>
      )}
    </View>
  );
}
