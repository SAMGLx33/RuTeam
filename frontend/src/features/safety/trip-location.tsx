import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState, Platform, Share, Text, View } from 'react-native';
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
import { api, ApiError } from '../../services/api/client';
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
  const [previewedSample, setPreviewedSample] = useState<string>();
  const [sharingError, setSharingError] = useState('');
  const [expiredSample, setExpiredSample] = useState<string>();
  const [clock, setClock] = useState(Date.now);
  const path = `/trips/${encodeURIComponent(tripId)}/location`;
  const client = useQueryClient();
  const queryKey = ['trip-location', userId, tripId];
  const activeShare = useRef<AbortController | null>(null);
  useFocusEffect(useCallback(() => () => activeShare.current?.abort(), []));

  const location = useQuery({
    queryKey,
    queryFn: ({ signal }) => api<TripTrackingView>(path, { signal }),
    gcTime: 0,
    refetchInterval: (query) =>
      query.state.data?.state === 'ENDED' ||
      (query.state.error instanceof ApiError &&
        query.state.error.status === 404)
        ? false
        : 10000,
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
  const expiration = view?.expiresAt;
  useEffect(() => {
    if (!expiration) return;
    const timer = setTimeout(
      () => setExpiredSample(expiration),
      Math.max(0, new Date(expiration).getTime() - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [expiration]);
  const recent =
    !!expiration &&
    expiredSample !== expiration &&
    new Date(expiration).getTime() > location.dataUpdatedAt;
  const effectiveState =
    view?.state === 'AVAILABLE' && !recent ? 'STALE' : view?.state;
  const exactSample = recent ? view?.sample : null;
  const capturedAt = exactSample?.capturedAt;
  useEffect(() => {
    if (!capturedAt) return;
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [capturedAt]);
  const age = capturedAt
    ? Math.max(0, Math.floor((clock - Date.parse(capturedAt)) / 1000))
    : null;

  const shareText =
    exactSample && previewedSample === exactSample.sharedAt
      ? `Última ubicación autorizada por el conductor RuTeam, registrada ${travelTime(exactSample.capturedAt)}. Coordenadas aproximadas ${exactSample.latitude}, ${exactSample.longitude}.`
      : null;
  const canOpenShare =
    Platform.OS !== 'web' || typeof globalThis.navigator?.share === 'function';

  async function sharePosition() {
    setSharingError('');
    try {
      const latest = await api<TripTrackingView>(path);
      if (
        !shareText ||
        !latest.sample ||
        latest.sample.sharedAt !== previewedSample ||
        !latest.expiresAt ||
        new Date(latest.expiresAt).getTime() <= Date.now()
      ) {
        setPreviewedSample(undefined);
        await client.invalidateQueries({ queryKey });
        throw new Error(
          'La ubicación cambió o dejó de estar disponible. Revisa el dato antes de compartir.',
        );
      }
      if (Platform.OS === 'web')
        await globalThis.navigator.share({ text: shareText });
      else await Share.share({ message: shareText });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setSharingError(
        error instanceof ApiError
          ? error.message
          : error instanceof Error &&
              error.message.startsWith('La ubicación cambió')
            ? error.message
            : 'No se pudo abrir el selector del sistema.',
      );
    }
  }

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
      {effectiveState === 'NOT_SHARED' && (
        <Text style={s.text}>No hay una ubicación reciente compartida.</Text>
      )}
      {effectiveState === 'STALE' && (
        <Text style={s.text}>
          La última ubicación caducó. Espera un nuevo punto compartido.
        </Text>
      )}
      {effectiveState === 'ENDED' && (
        <Text style={s.text}>El seguimiento del viaje finalizó.</Text>
      )}
      {exactSample && view?.route && (
        <>
          <Text style={s.text}>
            Última ubicación aproximada · {travelTime(exactSample.capturedAt)}
            {age !== null && ` · hace ${age} s`}
          </Text>
          <Text style={s.text}>
            Antigüedad ·{' '}
            {Math.max(
              0,
              Math.floor(
                (location.dataUpdatedAt -
                  new Date(exactSample.capturedAt).getTime()) /
                  1000,
              ),
            )}{' '}
            s al consultar
          </Text>
          <RouteGeometryPreview
            geometry={view.route.geometry}
            stops={view.route.stops}
            observedPosition={exactSample}
          />
          <Text style={s.text}>
            El marcador naranja indica la última ubicación compartida.
          </Text>
          {shareText ? (
            <>
              <Text selectable style={s.text}>
                {shareText}
              </Text>
              {canOpenShare && (
                <Button
                  title="Abrir selector para compartir ubicación"
                  onPress={() => void sharePosition()}
                />
              )}
              <Button
                title="Cerrar vista previa de ubicación"
                secondary
                onPress={() => setPreviewedSample(undefined)}
              />
            </>
          ) : (
            <Button
              title="Revisar ubicación para compartir"
              secondary
              onPress={() => {
                setSharingError('');
                setPreviewedSample(exactSample.sharedAt);
              }}
            />
          )}
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
          {(effectiveState === 'AVAILABLE' || effectiveState === 'STALE') && (
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
      {sharingError && (
        <Text accessibilityRole="alert" style={s.error}>
          {sharingError}
        </Text>
      )}
      {operationError && (
        <Text accessibilityRole="alert" style={s.error}>
          {operationError.message}
        </Text>
      )}
    </View>
  );
}
