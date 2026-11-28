import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Platform, Share } from 'react-native';
import type { TripOperation, TripTrackingView } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { api, ApiError } from '../../services/api/client';
import { useSession } from '../../providers/session-provider';
import { Text, View } from '../../theme/primitives';
import {
  DriverNavigation,
  type DriverObservation,
} from '../trips/driver-navigation';
import {
  estimateRouteProgress,
  prepareNavigation,
  type NavigationFix,
} from '../trips/route-progress';
import { RouteGeometryPreview, travelTime } from '../trips/route-preview';
import { useLocationSharing } from './use-location-sharing';

interface TripLocationProps {
  userId: string;
  tripId: string;
  navigation?: TripOperation;
}

export function TripLocation(props: TripLocationProps) {
  return (
    <TripLocationContent key={`${props.userId}:${props.tripId}`} {...props} />
  );
}

function TripLocationContent({
  userId,
  tripId,
  navigation,
}: TripLocationProps) {
  const { user, connection } = useSession();
  const [previewedSample, setPreviewedSample] = useState<string>();
  const [sharingError, setSharingError] = useState('');
  const [expiredSample, setExpiredSample] = useState<string>();
  const [clock, setClock] = useState(Date.now);
  const path = `/trips/${encodeURIComponent(tripId)}/location`;
  const client = useQueryClient();
  const queryKey = ['trip-location', userId, tripId];
  const refresh = useCallback(() => {
    void client.invalidateQueries({
      queryKey: ['trip-location', userId, tripId],
    });
  }, [client, userId, tripId]);

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
  const view =
    location.isError || connection === 'lost' ? undefined : location.data;
  const isCurrentDriver = user?.id === userId && view?.canShare === true;
  const maneuvers = navigation?.maneuvers;
  const model = useMemo(
    () => (maneuvers?.length ? prepareNavigation(maneuvers) : null),
    [maneuvers],
  );
  const [observation, setObservation] = useState<DriverObservation | null>(
    null,
  );
  const observe = useCallback(
    (fix: NavigationFix | null) => {
      if (!fix) return setObservation(null);
      setObservation((previous) => {
        const lastProjection = previous?.lastProjection ?? null;
        const estimate = model
          ? estimateRouteProgress(model, fix, lastProjection, fix.timestamp)
          : null;
        return {
          fix,
          estimate,
          lastProjection:
            estimate?.status === 'ON_ROUTE' ? estimate : lastProjection,
        };
      });
    },
    [model],
  );
  const sharing = useLocationSharing(
    path,
    isCurrentDriver && connection !== 'lost',
    refresh,
    navigation ? observe : undefined,
  );
  const forget = useMutation({ mutationFn: sharing.stop, onSettled: refresh });
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
  const sample = recent ? view?.sample : null;
  const accuracy =
    sample?.accuracyMeters === undefined
      ? undefined
      : Math.max(1, Math.ceil(sample.accuracyMeters));
  const imprecise = accuracy === undefined || accuracy > 100;
  const capturedAt = sample?.capturedAt;
  useEffect(() => {
    if (!capturedAt) return;
    const timer = setInterval(() => setClock(Date.now()), 5000);
    return () => clearInterval(timer);
  }, [capturedAt]);
  const age = capturedAt
    ? Math.max(
        0,
        Math.floor(
          (Math.max(clock, location.dataUpdatedAt) - Date.parse(capturedAt)) /
            1000,
        ),
      )
    : null;

  const shareText =
    sample && previewedSample === sample.sharedAt
      ? `Última ubicación autorizada por el conductor RuTeam, registrada ${travelTime(sample.capturedAt)}. Coordenadas aproximadas ${sample.latitude}, ${sample.longitude}.${accuracy === undefined ? ' Precisión desconocida.' : ` Precisión estimada: ${accuracy} m.`}`
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

  const pending = sharing.state === 'starting' || forget.isPending;
  const operationError = forget.error?.message ?? sharing.error;

  return (
    <View style={s.section}>
      {navigation && (
        <DriverNavigation
          row={navigation}
          observation={
            isCurrentDriver && sharing.state === 'active' ? observation : null
          }
        />
      )}
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
      {sample && view?.route && (
        <>
          <Text style={s.text}>
            Última ubicación aproximada · {travelTime(sample.capturedAt)}
            {age !== null && ` · hace ${age} s`}
          </Text>
          <Text style={s.text}>
            {accuracy === undefined
              ? 'Precisión desconocida'
              : `Precisión estimada · ${accuracy} m`}
          </Text>
          {!navigation && (
            <>
              <RouteGeometryPreview
                geometry={view.route.geometry}
                stops={view.route.stops}
                observedPosition={imprecise ? undefined : sample}
              />
              <Text style={s.text}>
                {imprecise
                  ? 'La precisión es insuficiente para dibujar un punto. El esquema muestra el recorrido publicado.'
                  : 'El marcador naranja muestra la posición aproximada. El recorrido publicado es independiente.'}
              </Text>
            </>
          )}
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
                setPreviewedSample(sample.sharedAt);
              }}
            />
          )}
        </>
      )}
      {isCurrentDriver && (
        <>
          <Text style={s.text} accessibilityLiveRegion="polite">
            {sharing.state === 'active'
              ? 'Compartición activa.'
              : sharing.state === 'starting'
                ? 'Consultando permiso y ubicación…'
                : sharing.state === 'paused'
                  ? 'Compartición pausada. El último punto caduca automáticamente.'
                  : 'Activa la ubicación sólo mientras estés estacionado. Se comparte con los pasajeros autorizados durante el viaje activo.'}
          </Text>
          {sharing.state === 'active' ? (
            <Button title="Pausar compartición" onPress={sharing.pause} />
          ) : (
            <Button
              title={
                sharing.state === 'paused'
                  ? 'Reanudar compartición'
                  : 'Activar compartición'
              }
              disabled={pending || connection === 'lost'}
              onPress={() => {
                forget.reset();
                void sharing.start();
              }}
            />
          )}
          {(sharing.state !== 'idle' ||
            effectiveState === 'AVAILABLE' ||
            effectiveState === 'STALE') && (
            <Button
              title="Detener y quitar ubicación"
              secondary
              disabled={forget.isPending}
              onPress={() => forget.mutate()}
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
          {operationError}
        </Text>
      )}
    </View>
  );
}
