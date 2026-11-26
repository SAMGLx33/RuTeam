import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Linking, Platform, Share, Text, View } from 'react-native';
import type { TripSafetyContext } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { TripLocation } from './trip-location';
import { travelTime } from '../trips/route-preview';

const directionLabel = {
  DESDE_USC: 'desde la USC',
  HACIA_USC: 'hacia la USC',
} as const;

function shareableSummary(context: TripSafetyContext) {
  const direction = context.direction
    ? ` ${directionLabel[context.direction]}`
    : '';
  return `Viaje RuTeam en curso${direction}. Salida prevista ${travelTime(context.departureAt)}.`;
}

function ShareTripSummary({ context }: { context: TripSafetyContext }) {
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canOpenShare =
    Platform.OS !== 'web' || typeof globalThis.navigator?.share === 'function';
  const message = shareableSummary(context);

  async function openShare() {
    setError(null);
    try {
      if (Platform.OS === 'web') {
        await globalThis.navigator.share({ text: message });
      } else {
        await Share.share({ message });
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      setError(
        'El selector del sistema no se pudo abrir. Puedes seleccionar el texto.',
      );
    }
  }

  return (
    <View style={s.section}>
      <Text style={s.title}>Compartir con una persona de confianza</Text>
      {showPreview ? (
        <>
          <Text style={s.text} selectable>
            {message}
          </Text>
          {canOpenShare ? (
            <>
              <Text style={s.text}>
                Elige la aplicación y el destinatario en tu dispositivo.
              </Text>
              <Button
                title="Abrir selector del sistema"
                onPress={() => void openShare()}
              />
            </>
          ) : (
            <Text style={s.text}>
              Puedes seleccionar el texto y copiarlo a la aplicación que elijas.
            </Text>
          )}
          <Button
            title="Cerrar resumen"
            secondary
            onPress={() => setShowPreview(false)}
          />
        </>
      ) : (
        <Button
          title="Revisar resumen para compartir"
          secondary
          onPress={() => {
            setError(null);
            setShowPreview(true);
          }}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

function EmergencyDialer() {
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return (
    <View style={s.section}>
      <Text style={s.title}>Emergencias en Cali</Text>
      {confirm ? (
        <>
          <Text style={s.text}>
            Se abrirá el marcador de tu dispositivo con el 123. Si no hay
            marcador, usa un teléfono para llamar al 123.
          </Text>
          <Button
            title="Abrir marcador del 123"
            onPress={() => {
              setError(null);
              void Linking.openURL('tel:123').catch(() =>
                setError(
                  'El marcador no está disponible. Llama al 123 desde un teléfono.',
                ),
              );
            }}
          />
          <Button
            title="Volver a seguridad"
            secondary
            onPress={() => {
              setConfirm(false);
              setError(null);
            }}
          />
        </>
      ) : (
        <Button
          title="Línea de emergencias 123"
          secondary
          onPress={() => setConfirm(true)}
        />
      )}
      {error && (
        <Text accessibilityRole="alert" style={s.error}>
          {error}
        </Text>
      )}
    </View>
  );
}

export function TripSafetyScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useSession();
  const query = useQuery({
    queryKey: ['trip-safety', user?.id, tripId],
    enabled: !!user?.capabilities.passenger && typeof tripId === 'string',
    queryFn: ({ signal }) =>
      api<TripSafetyContext>(`/trips/${encodeURIComponent(tripId)}/safety`, {
        signal,
      }),
    gcTime: 0,
    refetchInterval: (query) => (query.state.error ? false : 15000),
    retry: false,
  });
  const context = query.isError ? undefined : query.data;

  return (
    <ProtectedPage title="Seguridad del viaje">
      {query.isPending && (
        <Text style={s.text}>Consultando el viaje en curso…</Text>
      )}
      {query.error && (
        <>
          <Text accessibilityRole="alert" style={s.error}>
            {query.error.message}
          </Text>
          <Button
            title="Volver a consultar el viaje"
            secondary
            onPress={() => void query.refetch()}
          />
        </>
      )}
      {context && (
        <>
          <View style={s.section}>
            <Text style={s.title}>Viaje en curso</Text>
            {context.startedAt && (
              <Text style={s.text}>
                Inicio registrado · {travelTime(context.startedAt)}
              </Text>
            )}
            <Text style={s.text}>
              Salida prevista · {travelTime(context.departureAt)}
            </Text>
            {context.reachedStop && (
              <Text style={s.text}>
                Última parada registrada · {context.reachedStop.label} ·{' '}
                {travelTime(context.reachedStop.reachedAt)}
              </Text>
            )}
            {context.nextStop && (
              <Text style={s.text}>
                Próxima parada · {context.nextStop.label}
                {context.nextStop.estimatedAt &&
                  ` · Hora prevista ${travelTime(context.nextStop.estimatedAt)}`}
              </Text>
            )}
          </View>
          {user && <TripLocation userId={user.id} tripId={tripId} />}
          <ShareTripSummary context={context} />
        </>
      )}
      <EmergencyDialer />
    </ProtectedPage>
  );
}
