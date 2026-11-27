import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RecurringTripView } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { travelTime, tripStatusLabel } from './route-preview';

type Action = 'PAUSE' | 'RESUME' | 'CANCEL' | 'CANCEL_FUTURE' | 'RETRY';
const states = { ACTIVE: 'Activa', PAUSED: 'Pausada', CANCELLED: 'Cancelada' };
const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function ScheduleCard({
  schedule,
  asOf,
}: {
  schedule: RecurringTripView;
  asOf: number;
}) {
  const client = useQueryClient();
  const { user } = useSession();
  const [confirm, setConfirm] = useState(false);
  const change = useMutation({
    mutationFn: (action: Action) =>
      api<RecurringTripView>('/trip-schedules/' + schedule.id + '/action', {
        method: 'POST',
        body: { action },
      }),
    onSuccess: () => {
      setConfirm(false);
      return client.invalidateQueries({ queryKey: ['trip-schedules'] });
    },
  });
  return (
    <View style={s.section} testID={`recurring-schedule-${schedule.id}`}>
      <Text style={s.title}>{schedule.name}</Text>
      <Text style={s.text}>
        {states[schedule.state]} ·{' '}
        {schedule.weekdays.map((day) => days[day - 1]).join(', ')} ·{' '}
        {schedule.time} Colombia
      </Text>
      <Text style={s.text}>
        {schedule.startsOn} a {schedule.endsOn} ·{' '}
        {schedule.template.offeredSeats} plazas
      </Text>
      {schedule.state !== 'CANCELLED' && (
        <>
          {user?.capabilities.driver && (
            <Link
              href={{
                pathname: '/publish',
                params: { scheduleId: schedule.id },
              }}
              style={s.link}
            >
              Editar futuras publicaciones
            </Link>
          )}
          <Button
            title={
              schedule.state === 'PAUSED'
                ? 'Reactivar recurrencia'
                : 'Pausar recurrencia'
            }
            secondary
            disabled={change.isPending}
            onPress={() =>
              change.mutate(schedule.state === 'PAUSED' ? 'RESUME' : 'PAUSE')
            }
          />
          {schedule.state === 'ACTIVE' &&
            schedule.occurrences.some(({ failure }) => !!failure) && (
              <Button
                title="Reintentar fechas pendientes"
                secondary
                disabled={change.isPending}
                onPress={() => change.mutate('RETRY')}
              />
            )}
          {confirm ? (
            <>
              <Text style={s.text}>
                Puedes detener solo la generación o cancelar también todas las
                fechas publicadas que sigan programadas y sin abordajes.
                Avisaremos a los participantes afectados.
              </Text>
              <Button
                title="Detener solo la generación"
                disabled={change.isPending}
                onPress={() => change.mutate('CANCEL')}
              />
              <Button
                title="Detener y cancelar fechas publicadas"
                disabled={change.isPending}
                onPress={() => change.mutate('CANCEL_FUTURE')}
              />
              <Button
                title="Conservar recurrencia"
                secondary
                onPress={() => setConfirm(false)}
              />
            </>
          ) : (
            <Button
              title="Cancelar recurrencia"
              secondary
              onPress={() => setConfirm(true)}
            />
          )}
        </>
      )}
      {schedule.state === 'CANCELLED' &&
        schedule.occurrences.some(
          ({ trip, departureAt }) =>
            trip?.status === 'PROGRAMADO' && Date.parse(departureAt) > asOf,
        ) &&
        (confirm ? (
          <>
            <Text style={s.text}>
              Se cancelarán las fechas que sigan programadas y sin abordajes.
              Avisaremos a los participantes afectados.
            </Text>
            <Button
              title="Confirmar cancelación de fechas"
              disabled={change.isPending}
              onPress={() => change.mutate('CANCEL_FUTURE')}
            />
            <Button
              title="Volver sin cancelar fechas"
              secondary
              onPress={() => setConfirm(false)}
            />
          </>
        ) : (
          <Button
            title="Cancelar fechas futuras publicadas"
            secondary
            onPress={() => setConfirm(true)}
          />
        ))}
      {change.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {change.error.message}
        </Text>
      )}
      <Text style={s.title}>Fechas recientes y próximas</Text>
      {!schedule.occurrences.length && (
        <Text style={s.text}>Aún no hay fechas procesadas.</Text>
      )}
      {schedule.occurrences.map((occurrence) => (
        <View key={occurrence.date} style={s.section}>
          <Text style={s.text}>{travelTime(occurrence.departureAt)}</Text>
          {occurrence.trip ? (
            <Link
              href={{
                pathname: '/trip/[id]',
                params: { id: occurrence.trip.id },
              }}
              style={s.link}
            >
              {tripStatusLabel[occurrence.trip.status]} ·{' '}
              {occurrence.trip.occupiedSeats} plazas confirmadas
            </Link>
          ) : (
            <Text style={s.text}>
              Fecha pendiente de publicar · {occurrence.failure}
            </Text>
          )}
        </View>
      ))}
      <Link href="/my-trips" style={s.link}>
        Gestionar un viaje publicado
      </Link>
    </View>
  );
}

export function RecurringTripsScreen() {
  const { user } = useSession();
  const { scheduleId } = useLocalSearchParams<{ scheduleId?: string }>();
  const query = useQuery({
    queryKey: ['trip-schedules', user?.id],
    queryFn: () => api<RecurringTripView[]>('/trip-schedules'),
    enabled: !!user?.capabilities.driverAccess,
    refetchInterval: 15000,
  });
  return (
    <ProtectedPage title="Viajes recurrentes" requires="driverAccess">
      {scheduleId && (
        <Link href="/recurring-trips" style={s.link}>
          Ver todas mis recurrencias
        </Link>
      )}
      {user?.capabilities.driver && (
        <Link href="/publish" style={s.link}>
          Configurar desde la publicación de viaje
        </Link>
      )}
      {query.isPending && <Text style={s.text}>Cargando recurrencias…</Text>}
      {query.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error.message}
        </Text>
      )}
      {query.data?.length === 0 && (
        <Text style={s.text}>Aún no tienes recorridos recurrentes.</Text>
      )}
      {query.data
        ?.filter((item) => !scheduleId || item.id === scheduleId)
        .map((schedule) => (
          <ScheduleCard
            key={schedule.id}
            schedule={schedule}
            asOf={query.dataUpdatedAt}
          />
        ))}
    </ProtectedPage>
  );
}
