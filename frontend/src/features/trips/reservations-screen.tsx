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
import { travelTime, tripStatusLabel } from './route-preview';

const statusLabel: Record<ReservationStatus, string> = {
  PENDING: 'Solicitud histórica pendiente (no confirmada)',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Solicitud histórica rechazada',
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
        {item.status === 'CONFIRMED' && item.tripStatus === 'COMPLETADO'
          ? 'Completada'
          : item.boardedAt && item.status === 'CONFIRMED'
            ? 'Abordada'
            : statusLabel[item.status]}{' '}
        · Viaje {tripStatusLabel[item.tripStatus]}
      </Text>
      <Text style={s.text}>
        Encuentro · {item.pickup.label} · {item.pickup.latitude},{' '}
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
      api<ReservationView>(`/participations/${id}/cancel`, {
        method: 'POST',
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['my-reservations'] });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
    },
  });
  return (
    <ProtectedPage title="Mis participaciones">
      <Link href="/search-trips" style={s.link}>
        Buscar viajes
      </Link>
      <Text style={s.text}>
        Cada estudiante confirma su propia plaza. Retirarte de un viaje futuro
        antes de abordar libera la plaza y conserva tu historial.
      </Text>
      {list.isPending && <Text>Consultando tus participaciones…</Text>}
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
      {list.data?.length === 0 && <Text>Aún no tienes participaciones.</Text>}
      {list.data?.map((item) => (
        <View key={item.id} style={s.section}>
          <ReservationSummary item={item} />
          {item.canCancel && (
            <Button
              title={
                item.status === 'PENDING'
                  ? 'Retirar solicitud histórica'
                  : 'Cancelar participación'
              }
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
