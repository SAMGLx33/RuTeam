import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReservationStatus, ReservationView } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { travelTime } from './route-preview';

const statusLabel: Record<ReservationStatus, string> = {
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};
export function ReservationSummary({ item }: { item: ReservationView }) {
  return (
    <>
      <Text style={s.title}>
        {item.pickup.label} → {item.dropoff.label}
      </Text>
      <Text style={s.text}>
        {travelTime(item.departureAt)} · {item.quantity} plazas
      </Text>
      <Text style={s.text}>
        {statusLabel[item.status]} · Viaje {item.tripStatus}
      </Text>
      <Text style={s.text}>
        Abordaje · {item.pickup.label} · {item.pickup.latitude},{' '}
        {item.pickup.longitude}
        {item.pickup.instructions ? ` · ${item.pickup.instructions}` : ''}
      </Text>
      <Text style={s.text}>
        Descenso · {item.dropoff.label} · {item.dropoff.latitude},{' '}
        {item.dropoff.longitude}
        {item.dropoff.instructions ? ` · ${item.dropoff.instructions}` : ''}
      </Text>
    </>
  );
}

export function ReservationsScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const list = useQuery({
    queryKey: ['my-reservations', user?.id],
    queryFn: () => api<ReservationView[]>('/reservations/my'),
    enabled: !!user,
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api<ReservationView>(`/reservation-requests/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['my-reservations'] }),
  });
  return (
    <ProtectedPage title="Mis reservas">
      <Link href="/search-trips" style={s.link}>
        Buscar viajes
      </Link>
      {user && (
        <View style={s.section}>
          <Text style={s.text}>
            Comparte tu código DEMO con el responsable de tu grupo para
            participar.
          </Text>
          <Text selectable style={s.text}>
            {user.id}
          </Text>
        </View>
      )}
      {list.isPending && <Text>Consultando tus reservas…</Text>}
      {list.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {list.error.message}
        </Text>
      )}
      {cancel.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {cancel.error.message}
        </Text>
      )}
      {list.data?.length === 0 && (
        <Text>Aún no tienes reservas ni solicitudes.</Text>
      )}
      {list.data?.map((item) => (
        <View key={item.id} style={s.section}>
          <ReservationSummary item={item} />
          {item.isRequester && item.status === 'PENDING' && (
            <Button
              title="Retirar solicitud"
              secondary
              disabled={cancel.isPending}
              onPress={() => cancel.mutate(item.id)}
            />
          )}
        </View>
      ))}
    </ProtectedPage>
  );
}
