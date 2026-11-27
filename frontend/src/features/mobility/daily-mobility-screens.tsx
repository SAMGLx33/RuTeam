import { Link, useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type {
  AgendaEntry,
  MobilityAgenda,
  PendingActivity,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';
import { travelTime, tripStatusLabel } from '../trips/route-preview';

const agendaLabel: Record<AgendaEntry['kind'], string> = {
  PUBLISHED: 'Viaje publicado',
  PARTICIPATION: 'Mi participación',
  PENDING: 'Pendiente de generar',
  PROJECTED: 'Fecha prevista por plantilla',
  FAILED: 'Generación fallida',
  PAUSED: 'Recurrencia pausada',
};
const isoDay = (offset: number) =>
  new Date(Date.now() - 5 * 3600_000 + offset * 86400_000)
    .toISOString()
    .slice(0, 10);
const shift = (start: string, offset: number) =>
  new Date(Date.parse(start + 'T00:00:00Z') + offset * 86400_000)
    .toISOString()
    .slice(0, 10);

function destination(item: PendingActivity): Href {
  switch (item.category) {
    case 'CHAT':
      return { pathname: '/chat/[tripId]', params: { tripId: item.tripId! } };
    case 'RATING':
      return {
        pathname: '/ratings/[tripId]',
        params: { tripId: item.tripId! },
      };
    case 'COMPENSATION':
    case 'DISPUTE':
      return {
        pathname: '/compensations/[id]',
        params: { id: item.participationId! },
      };
    case 'SCHEDULE':
      return {
        pathname: '/recurring-trips',
        params: { scheduleId: item.scheduleId! },
      };
    case 'DOCUMENT':
      return '/vehicles';
    case 'ACCOUNT':
      return '/account-settings';
    case 'GROUP':
      return '/groups';
    case 'PICKUP_RESOLVED':
      return { pathname: '/trip/[id]', params: { id: item.tripId! } };
    case 'PICKUP':
    case 'TRIP':
      return {
        pathname: '/trip-operation/[tripId]',
        params: { tripId: item.tripId! },
      };
  }
}

export function ActivityScreen() {
  const { user } = useSession();
  const { activity: focus } = useLocalSearchParams<{ activity?: string }>();
  const activity = useQuery({
    queryKey: ['activity', user?.id],
    enabled: !!user?.capabilities.passenger,
    queryFn: () => api<PendingActivity[]>('/mobility/activity'),
    refetchInterval: 30000,
  });
  const items = focus
    ? activity.data?.filter(({ id }) => id === focus)
    : activity.data;
  return (
    <ProtectedPage title="Mis actividades">
      <Link href="/agenda" style={s.link}>
        Ver agenda
      </Link>
      <Link href="/saved-trips" style={s.link}>
        Viajes guardados
      </Link>
      {activity.isPending && <Text>Cargando actividades…</Text>}
      {activity.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {activity.error.message}
        </Text>
      )}
      {items?.length === 0 && (
        <Text style={s.text}>
          {focus
            ? 'Esta actividad ya no está pendiente para tu cuenta.'
            : 'No tienes actividades para revisar.'}
        </Text>
      )}
      {focus && (
        <Link href="/activity" style={s.link}>
          Ver todas mis actividades
        </Link>
      )}
      {items?.map((item) => (
        <View key={item.id} style={s.section}>
          <Link href={destination(item)} style={s.link}>
            {item.title}
          </Link>
          <Text style={s.text}>
            {item.detail}
            {item.optional ? ' · Acción opcional' : ''}
          </Text>
        </View>
      ))}
    </ProtectedPage>
  );
}

export function AgendaScreen() {
  const { user } = useSession();
  const [start, setStart] = useState(() => isoDay(0));
  const [days, setDays] = useState(7);
  const agenda = useQuery({
    queryKey: ['agenda', user?.id, start, days],
    enabled: !!user?.capabilities.passenger,
    queryFn: () =>
      api<MobilityAgenda>('/mobility/agenda?start=' + start + '&days=' + days),
    refetchInterval: 30000,
  });
  return (
    <ProtectedPage title="Agenda de viajes">
      <View style={s.section}>
        <Text style={s.title}>
          {start} a {shift(start, days - 1)}
        </Text>
        <Choice
          label="7 días"
          checked={days === 7}
          onPress={() => setDays(7)}
        />
        <Choice
          label="28 días"
          checked={days === 28}
          onPress={() => setDays(28)}
        />
        <Button
          secondary
          title="Periodo anterior"
          onPress={() => setStart(shift(start, -days))}
        />
        <Button secondary title="Hoy" onPress={() => setStart(isoDay(0))} />
        <Button
          secondary
          title="Periodo siguiente"
          onPress={() => setStart(shift(start, days))}
        />
      </View>
      {agenda.isPending && <Text>Cargando agenda…</Text>}
      {agenda.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {agenda.error.message}
        </Text>
      )}
      {agenda.data?.entries.length === 0 && (
        <Text style={s.text}>No tienes fechas de viaje en este periodo.</Text>
      )}
      {agenda.data?.entries.map((entry) => (
        <View key={entry.id} style={s.section}>
          <Text style={s.text}>
            {travelTime(entry.at)} · {agendaLabel[entry.kind]}
            {entry.scheduleId && entry.tripId ? ' · Ocurrencia recurrente' : ''}
          </Text>
          <Text style={s.title}>{entry.label}</Text>
          {entry.status && (
            <Text style={s.text}>
              {entry.status === 'WITHDRAWN'
                ? 'Participación retirada'
                : entry.status === 'EXPIRED'
                  ? 'Viaje vencido'
                  : tripStatusLabel[entry.status]}
            </Text>
          )}
          {entry.estimatedDepartureAt && (
            <Text style={s.text}>
              Retraso · Salida estimada {travelTime(entry.estimatedDepartureAt)}
            </Text>
          )}
          {entry.kind === 'PARTICIPATION' && (
            <>
              <Text style={s.text}>
                {entry.pickupAt
                  ? `Recogida prevista ${travelTime(entry.pickupAt)}`
                  : 'Recogida sin hora estimada'}
              </Text>
              <Text style={s.text}>
                {entry.dropoffAt
                  ? `Descenso estimado ${travelTime(entry.dropoffAt)}`
                  : 'Descenso sin hora estimada'}
              </Text>
            </>
          )}
          {entry.conflictWithTripIds?.map((tripId) => (
            <Link
              key={tripId}
              href={{
                pathname: '/trip-operation/[tripId]',
                params: { tripId },
              }}
              style={s.link}
            >
              Ver viaje con posible conflicto de horario
            </Link>
          ))}
          {entry.failure && <Text style={s.text}>{entry.failure}</Text>}
          {entry.tripId ? (
            <Link
              href={{
                pathname: '/trip-operation/[tripId]',
                params: { tripId: entry.tripId },
              }}
              style={s.link}
            >
              Ver viaje
            </Link>
          ) : (
            entry.scheduleId && (
              <Link
                href={{
                  pathname: '/recurring-trips',
                  params: { scheduleId: entry.scheduleId },
                }}
                style={s.link}
              >
                Gestionar plantilla
              </Link>
            )
          )}
        </View>
      ))}
    </ProtectedPage>
  );
}
