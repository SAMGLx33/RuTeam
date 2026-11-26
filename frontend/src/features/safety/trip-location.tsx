import { useCallback, useRef } from 'react';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState, Text, View } from 'react-native';
import {
  Accuracy,
  getCurrentPositionAsync,
  requestForegroundPermissionsAsync,
} from 'expo-location';
import type {
  TripDriverLocationInput,
  TripTrackingView,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { RouteGeometryPreview, travelTime } from '../trips/route-preview';

function ensureForeground(signal: AbortSignal) {
  if (signal.aborted || AppState.currentState !== 'active')
    throw new Error('Mantén abierta esta pantalla para compartir.');
}

export function TripLocation({
  userId,
  tripId,
}: {
  userId: string;
  tripId: string;
}) {
  const path = `/trips/${encodeURIComponent(tripId)}/location`;
  const client = useQueryClient();
  const queryKey = ['trip-location', userId, tripId];
  const activeShare = useRef<AbortController | null>(null);
  useFocusEffect(useCallback(() => () => activeShare.current?.abort(), []));

  const location = useQuery({
    queryKey,
    queryFn: ({ signal }) => api<TripTrackingView>(path, { signal }),
    gcTime: 0,
    refetchInterval: 10000,
    retry: false,
  });
  const share = useMutation({
    mutationFn: async () => {
      const controller = new AbortController();
      activeShare.current = controller;
      const { signal } = controller;
      try {
        ensureForeground(signal);
        const permission = await requestForegroundPermissionsAsync();
        if (!permission.granted)
          throw new Error(
            'El permiso de ubicación está desactivado. Puedes permitirlo en los ajustes del dispositivo.',
          );
        ensureForeground(signal);

        const current = await api<TripTrackingView>(path, { signal });
        if (!current.canShare)
          throw new Error(
            'Sólo el conductor del viaje en curso puede compartir su ubicación.',
          );
        ensureForeground(signal);
        const fix = await getCurrentPositionAsync({
          accuracy: Accuracy.Balanced,
        });
        ensureForeground(signal);
        const body: TripDriverLocationInput = {
          capturedAt: new Date(fix.timestamp).toISOString(),
          latitude: fix.coords.latitude,
          longitude: fix.coords.longitude,
        };
        await api(path, { method: 'POST', body, signal });
      } finally {
        activeShare.current = null;
      }
    },
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  const forget = useMutation({
    mutationFn: () => api(path, { method: 'DELETE' }),
    onSuccess: () => client.invalidateQueries({ queryKey }),
  });
  const view = location.isError ? undefined : location.data;
  const pending = share.isPending || forget.isPending;
  const operationError = share.error ?? forget.error;

  return (
    <View style={s.section}>
      <Text style={s.title}>Ubicación del conductor</Text>
      {location.isPending && (
        <Text style={s.text}>Consultando la ubicación compartida…</Text>
      )}
      {location.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {location.error.message}
        </Text>
      )}
      {view && !view.sample && (
        <Text style={s.text}>No hay una ubicación reciente compartida.</Text>
      )}
      {view?.sample && view.route && (
        <>
          <Text style={s.text}>
            Última ubicación aproximada · {travelTime(view.sample.capturedAt)}
          </Text>
          <Text style={s.text}>
            Antigüedad ·{' '}
            {Math.max(
              0,
              Math.floor(
                (location.dataUpdatedAt -
                  new Date(view.sample.capturedAt).getTime()) /
                  1000,
              ),
            )}{' '}
            s al consultar
          </Text>
          <RouteGeometryPreview
            geometry={view.route.geometry}
            stops={view.route.stops}
            observedPosition={view.sample}
          />
          <Text style={s.text}>
            El marcador naranja indica la última ubicación compartida.
          </Text>
        </>
      )}
      {view?.canShare && (
        <>
          <Text style={s.text}>
            Comparte un punto con los pasajeros confirmados cuando estés
            estacionado. Caduca automáticamente.
          </Text>
          <Button
            title={
              share.isPending
                ? 'Obteniendo ubicación…'
                : 'Compartir mi ubicación ahora'
            }
            disabled={pending}
            onPress={() => {
              forget.reset();
              share.mutate();
            }}
          />
          {view.sample && (
            <Button
              title="Quitar ubicación compartida"
              secondary
              disabled={pending}
              onPress={() => {
                share.reset();
                forget.mutate();
              }}
            />
          )}
        </>
      )}
      {operationError && (
        <Text accessibilityRole="alert" style={s.error}>
          {operationError.message}
        </Text>
      )}
    </View>
  );
}
