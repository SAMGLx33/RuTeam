import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SavedTripView } from '@ruteam/contracts';
import { Text, View } from 'react-native';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { travelTime } from '../trips/route-preview';

const base = '/mobility/saved-trips';
const availabilityLabel: Record<SavedTripView['availability'], string> = {
  AVAILABLE: 'Con plazas disponibles',
  FULL: 'Sin plazas disponibles',
  EXPIRED: 'Hora de salida vencida',
  CANCELLED: 'Viaje cancelado',
  IN_PROGRESS: 'Viaje en curso',
  COMPLETED: 'Viaje finalizado',
  INTERRUPTED: 'Viaje interrumpido',
  UNAVAILABLE: 'Viaje no disponible',
};
function useSavedTrips() {
  const { user } = useSession();
  return useQuery({
    queryKey: ['saved-trips', user?.id],
    enabled: !!user?.capabilities.passenger,
    queryFn: () => api<SavedTripView[]>(base),
    refetchInterval: 15_000,
  });
}

export function SavedTripActions({
  tripId,
  canSave,
}: {
  tripId: string;
  canSave: boolean;
}) {
  const trips = useSavedTrips();
  const item = trips.data?.find((trip) => trip.tripId === tripId);
  if ((!canSave && !item) || !trips.data) return null;
  return <SavedActions tripId={tripId} item={item} />;
}

function SavedActions({
  tripId,
  item,
}: {
  tripId: string;
  item?: SavedTripView;
}) {
  const { user } = useSession();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: ({
      suffix = '',
      method,
    }: {
      suffix?: string;
      method: 'PUT' | 'DELETE';
    }) => api(`${base}/${tripId}${suffix}`, { method }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['saved-trips', user?.id] });
    },
  });
  return (
    <>
      <Button
        secondary
        disabled={mutation.isPending}
        title={item ? 'Quitar de guardados' : 'Guardar viaje'}
        onPress={() => mutation.mutate({ method: item ? 'DELETE' : 'PUT' })}
      />
      {item && (item.canRequestAlert || item.alertRequested) && (
        <>
          <Button
            secondary
            disabled={mutation.isPending}
            title={
              item.alertRequested
                ? 'Cancelar aviso de plaza'
                : 'Avisarme si se libera una plaza'
            }
            onPress={() =>
              mutation.mutate({
                suffix: '/availability-alert',
                method: item.alertRequested ? 'DELETE' : 'PUT',
              })
            }
          />
          <Text style={s.text}>
            {item.alertRequested
              ? 'El aviso está activado. La disponibilidad se verifica al confirmar.'
              : 'La disponibilidad puede cambiar después del aviso.'}
          </Text>
        </>
      )}
      {mutation.error && (
        <Text style={s.error} accessibilityRole="alert">
          {mutation.error.message}
        </Text>
      )}
    </>
  );
}

export function SavedTripsScreen() {
  const trips = useSavedTrips();
  return (
    <ProtectedPage title="Viajes guardados">
      <Link href="/available-trips" style={s.link}>
        Explorar viajes disponibles
      </Link>
      {trips.isPending && (
        <Text style={s.text}>Cargando viajes guardados…</Text>
      )}
      {trips.error && (
        <Text style={s.error} accessibilityRole="alert">
          {trips.error.message}
        </Text>
      )}
      {trips.data?.length === 0 && (
        <Text style={s.text}>
          Guarda un viaje desde su detalle para consultarlo aquí.
        </Text>
      )}
      {trips.data?.map((item) => (
        <View key={item.tripId} style={s.section}>
          <Link
            href={{ pathname: '/trip/[id]', params: { id: item.tripId } }}
            style={s.link}
          >
            {item.direction === 'DESDE_USC'
              ? 'Desde la USC'
              : item.direction === 'HACIA_USC'
                ? 'Hacia la USC'
                : 'Ver viaje'}{' '}
            · {travelTime(item.departureAt)}
          </Link>
          <Text style={s.text}>
            {availabilityLabel[item.availability]}
            {item.availableSeats > 0 ? ` · ${item.availableSeats}` : ''}
          </Text>
          <SavedActions tripId={item.tripId} item={item} />
        </View>
      ))}
    </ProtectedPage>
  );
}
