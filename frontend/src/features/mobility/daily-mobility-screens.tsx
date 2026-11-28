import { useLocalSearchParams, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';
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
import { Link, Pressable, Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';
import { travelTime, tripStatusLabel } from '../trips/route-preview';

const agendaLabel: Record<AgendaEntry['kind'], string> = {
  PUBLISHED: 'Viaje publicado',
  PARTICIPATION: 'Mi participación',
  PENDING: 'Pendiente de generar',
  PROJECTED: 'Fecha prevista por plantilla',
  FAILED: 'Generación fallida',
  PAUSED: 'Recurrencia pausada',
};
const activityCategory: Record<PendingActivity['category'], string> = {
  TRIP: 'Viaje',
  PICKUP: 'Recogida',
  PICKUP_RESOLVED: 'Recogida',
  CHAT: 'Mensajes',
  GROUP: 'Grupo',
  RATING: 'Calificación',
  COMPENSATION: 'Compensación',
  DISPUTE: 'Compensación',
  SCHEDULE: 'Recurrencia',
  DOCUMENT: 'Documentación',
  ACCOUNT: 'Cuenta',
};
const activityFilters = [
  { id: 'all', label: 'Todas' },
  { id: 'required', label: 'Por revisar' },
  { id: 'optional', label: 'Opcionales' },
] as const;
const activitySections = [
  { id: 'required', title: 'Requieren atención', optional: false },
  { id: 'optional', title: 'Acciones opcionales', optional: true },
] as const;
const agendaDay = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  dateStyle: 'full',
});
const rangeDay = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'UTC',
  dateStyle: 'medium',
});
const agendaTime = new Intl.DateTimeFormat('es-CO', {
  timeZone: 'America/Bogota',
  timeStyle: 'short',
});
const dayDate = (day: string) => new Date(`${day}T00:00:00Z`);
const isoDay = (offset: number) =>
  new Date(Date.now() - 5 * 3600_000 + offset * 86400_000)
    .toISOString()
    .slice(0, 10);
const shift = (start: string, offset: number) =>
  new Date(dayDate(start).getTime() + offset * 86400_000)
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
  const [filter, setFilter] =
    useState<(typeof activityFilters)[number]['id']>('all');
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
  const sections = activitySections
    .filter(({ id }) => focus || filter === 'all' || id === filter)
    .map((section) => ({
      ...section,
      items: items?.filter((item) => item.optional === section.optional) ?? [],
    }))
    .filter(({ items }) => items.length > 0);
  return (
    <ProtectedPage title="Mis actividades">
      <View style={styles.toolbar}>
        <View
          role="group"
          accessibilityLabel="Filtrar actividades"
          style={styles.filterRow}
        >
          {activityFilters.map(({ id, label }) => (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === id }}
              aria-pressed={filter === id}
              onPress={() => setFilter(id)}
              style={[styles.filter, filter === id && styles.selectedFilter]}
            >
              <Text style={styles.filterLabel}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Link href="/agenda" style={styles.actionLink}>
          Ver agenda
        </Link>
      </View>
      {activity.isPending && <Text style={s.text}>Cargando actividades…</Text>}
      {activity.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {activity.error.message}
        </Text>
      )}
      {focus && (
        <Link href="/activity" style={styles.actionLink}>
          Ver todas mis actividades
        </Link>
      )}
      {items?.length === 0 && (
        <View style={s.section}>
          <Text style={s.text}>
            {focus
              ? 'Esta actividad ya no está pendiente para tu cuenta.'
              : 'No tienes actividades para revisar.'}
          </Text>
        </View>
      )}
      {!!items?.length && sections.length === 0 && (
        <View style={s.section}>
          <Text style={s.text} accessibilityLiveRegion="polite">
            {filter === 'required'
              ? 'No tienes actividades que requieran atención.'
              : 'No tienes acciones opcionales.'}
          </Text>
        </View>
      )}
      {sections.map(({ id, title, items }) => (
        <View key={id} style={styles.listSection}>
          <Text role="heading" aria-level={2} style={styles.listHeading}>
            {title} · {items.length}
          </Text>
          <View style={styles.list}>
            {items.map((item, index) => (
              <View
                key={item.id}
                style={[styles.row, index > 0 && styles.divider]}
              >
                <Text style={styles.meta}>
                  {activityCategory[item.category]}
                </Text>
                <Link href={destination(item)} style={styles.itemLink}>
                  {item.title}
                </Link>
                <Text style={styles.detail}>{item.detail}</Text>
              </View>
            ))}
          </View>
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
  const entriesByDay = new Map<string, AgendaEntry[]>();
  for (const entry of agenda.data?.entries ?? []) {
    const entries = entriesByDay.get(entry.day);
    if (entries) entries.push(entry);
    else entriesByDay.set(entry.day, [entry]);
  }
  return (
    <ProtectedPage title="Agenda de viajes">
      <View style={s.section}>
        <View style={styles.toolbar}>
          <View style={styles.range}>
            <Text role="heading" aria-level={2} style={styles.rangeHeading}>
              {rangeDay.format(dayDate(start))} –{' '}
              {rangeDay.format(dayDate(shift(start, days - 1)))}
            </Text>
            <Text style={styles.meta}>Horario de Colombia</Text>
          </View>
          <View
            accessibilityRole="radiogroup"
            accessibilityLabel="Duración del periodo"
            style={styles.filterRow}
          >
            {([7, 28] as const).map((windowDays) => (
              <Pressable
                key={windowDays}
                accessibilityRole="radio"
                accessibilityState={{ checked: days === windowDays }}
                aria-checked={days === windowDays}
                onPress={() => setDays(windowDays)}
                style={[
                  styles.filter,
                  days === windowDays && styles.selectedFilter,
                ]}
              >
                <Text style={styles.filterLabel}>{windowDays} días</Text>
              </Pressable>
            ))}
          </View>
        </View>
        <View style={styles.filterRow}>
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
      </View>
      {agenda.isPending && <Text style={s.text}>Cargando agenda…</Text>}
      {agenda.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {agenda.error.message}
        </Text>
      )}
      {agenda.data?.entries.length === 0 && (
        <View style={s.section}>
          <Text style={s.text}>No tienes fechas de viaje en este periodo.</Text>
        </View>
      )}
      {[...entriesByDay].map(([day, entries]) => (
        <View key={day} style={styles.listSection}>
          <Text role="heading" aria-level={2} style={styles.listHeading}>
            {agendaDay.format(dayDate(day))}
          </Text>
          <View style={styles.list}>
            {entries.map((entry, index) => (
              <View
                key={entry.id}
                style={[styles.row, index > 0 && styles.divider]}
              >
                <Text style={styles.meta}>
                  {agendaTime.format(new Date(entry.at))} ·{' '}
                  {agendaLabel[entry.kind]}
                </Text>
                <Text style={styles.entryTitle}>{entry.label}</Text>
                {entry.status && (
                  <Text style={styles.entryStatus}>
                    {entry.status === 'WITHDRAWN'
                      ? 'Participación retirada'
                      : entry.status === 'EXPIRED'
                        ? 'Viaje vencido'
                        : tripStatusLabel[entry.status]}
                  </Text>
                )}
                {entry.estimatedDepartureAt && (
                  <Text style={styles.detail}>
                    Retraso · Salida estimada{' '}
                    {travelTime(entry.estimatedDepartureAt)}
                  </Text>
                )}
                {entry.kind === 'PARTICIPATION' && (
                  <>
                    <Text style={styles.detail}>
                      {entry.pickupAt
                        ? `Recogida prevista ${travelTime(entry.pickupAt)}`
                        : 'Recogida sin hora estimada'}
                    </Text>
                    <Text style={styles.detail}>
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
                    style={styles.actionLink}
                  >
                    Ver viaje con posible conflicto de horario
                  </Link>
                ))}
                {entry.failure && (
                  <Text style={styles.detail}>{entry.failure}</Text>
                )}
                {entry.tripId ? (
                  <Link
                    href={{
                      pathname: '/trip-operation/[tripId]',
                      params: { tripId: entry.tripId },
                    }}
                    style={styles.actionLink}
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
                      style={styles.actionLink}
                    >
                      Gestionar plantilla
                    </Link>
                  )
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  toolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  filter: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selectedFilter: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  filterLabel: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  range: { gap: 3 },
  rangeHeading: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  listSection: { gap: 8 },
  listHeading: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  list: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  row: { paddingHorizontal: 16, paddingVertical: 13, gap: 2 },
  divider: { borderTopWidth: 1, borderColor: colors.border },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  detail: { color: colors.muted, fontSize: 14, lineHeight: 20 },
  itemLink: {
    alignSelf: 'flex-start',
    color: colors.primary,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
    minHeight: 44,
    paddingVertical: 11,
  },
  entryTitle: {
    color: colors.ink,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  entryStatus: {
    color: colors.muted,
    fontSize: 13,
    textTransform: 'capitalize',
  },
  actionLink: {
    color: colors.primary,
    alignSelf: 'flex-start',
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    paddingVertical: 12,
  },
});
