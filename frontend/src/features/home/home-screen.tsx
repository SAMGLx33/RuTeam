import type {
  Account,
  MobilityStatistics,
  NotificationPage,
  ReservationView,
  TripSummary,
} from '@ruteam/contracts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';
import { notificationContent } from './notification-content';
import { TripCards, tripDate, useTripFeed } from '../trips/trip-feed';

export function HomeScreen({ user }: { user: Account }) {
  const recommended = useTripFeed('FOR_YOU', user.id);
  const next = useQuery({
    queryKey: ['my-reservations', user.id],
    queryFn: () => api<ReservationView[]>('/reservations/my'),
  });
  const trips = useQuery({
    queryKey: ['my-trips', user.id],
    queryFn: () => api<TripSummary[]>('/trips/my'),
    enabled: user.capabilities.driverAccess,
  });
  const mobility = useQuery({
    queryKey: ['mobility-statistics', user.id, 1],
    queryFn: () => api<MobilityStatistics>('/mobility/statistics?months=1'),
  });
  const notifications = useQuery({
    queryKey: ['notifications', user.id],
    queryFn: () => api<NotificationPage>('/notifications'),
    refetchInterval: 30000,
  });
  const nextParticipation = next.data
    ?.filter(
      (item) =>
        item.status === 'CONFIRMED' &&
        (item.tripStatus === 'EN_CURSO' ||
          (item.tripStatus === 'PROGRAMADO' &&
            Date.parse(item.departureAt) > next.dataUpdatedAt)),
    )
    .sort((a, b) => Date.parse(a.departureAt) - Date.parse(b.departureAt))[0];
  const upcoming =
    trips.data?.filter(
      (trip) =>
        trip.status === 'EN_CURSO' ||
        (trip.status === 'PROGRAMADO' &&
          Date.parse(trip.departureAt) > trips.dataUpdatedAt),
    ) ?? [];
  const matches = recommended.data?.pages[0]?.items.slice(0, 4) ?? [];
  const unread =
    notifications.data?.items.filter(({ readAt }) => !readAt) ?? [];

  const reminders = unread
    .filter(({ kind, available }) => available && kind.endsWith('_REMINDER'))
    .slice(0, 3);

  return (
    <ProtectedPage title="Inicio">
      <View style={styles.welcome}>
        <Text style={styles.title}>Hola, {user.profile.displayName}</Text>
        <Text style={styles.intro}>
          {user.capabilities.driver
            ? 'Organiza tus próximos viajes o encuentra una plaza con otro estudiante.'
            : 'Encuentra un viaje desde o hacia la Universidad Santiago de Cali.'}
        </Text>
        <View style={styles.actions}>
          <Link style={styles.action} href="/available-trips">
            Explorar viajes
          </Link>
          {user.capabilities.driver && (
            <Link style={styles.action} href="/publish">
              Publicar viaje
            </Link>
          )}
        </View>
      </View>
      <View style={s.section}>
        <Link href="/activity" style={s.link}>
          Mis actividades
        </Link>
        <Link href="/agenda" style={s.link}>
          Agenda de viajes
        </Link>
      </View>
      {reminders.length > 0 && (
        <View style={s.section}>
          <Text style={s.title}>Recordatorios</Text>
          {reminders.map((notice) => (
            <Link
              key={notice.id}
              href={`/open/notice/${notice.id}`}
              style={s.link}
            >
              {notificationContent(notice).title}
            </Link>
          ))}
        </View>
      )}
      {user.capabilities.driverAccess && (
        <View style={s.section}>
          <Text style={s.title}>Tus próximos viajes publicados</Text>
          {!user.capabilities.driver && (
            <Text style={s.text}>Revisa tus documentos antes de publicar.</Text>
          )}
          {trips.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {trips.error.message}
            </Text>
          )}
          {trips.isPending && <Text style={s.text}>Cargando tus viajes…</Text>}
          {!trips.isPending && !trips.error && !upcoming.length && (
            <Text style={s.text}>Aún no tienes viajes próximos.</Text>
          )}
          {upcoming.slice(0, 3).map((trip) => (
            <Text key={trip.id} style={s.text}>
              {tripDate(trip.departureAt)} · {trip.origin.label} →{' '}
              {trip.destination.name} · {trip.occupiedSeats}/{trip.offeredSeats}{' '}
              plazas ocupadas
            </Text>
          ))}
          <Link href="/my-trips" style={s.link}>
            Mis viajes publicados
          </Link>
          <Link href="/recurring-trips" style={s.link}>
            Viajes recurrentes
          </Link>
          {!user.capabilities.driver && (
            <Link href="/vehicles" style={s.link}>
              Vehículos y licencia
            </Link>
          )}
        </View>
      )}
      <View style={s.section}>
        <Text style={s.title}>Próxima participación</Text>
        {next.isPending ? (
          <Text style={s.text}>Consultando tus participaciones…</Text>
        ) : next.error ? (
          <Text accessibilityRole="alert" style={s.error}>
            {next.error.message}
          </Text>
        ) : (
          <Text style={s.text}>
            {nextParticipation
              ? `${tripDate(nextParticipation.departureAt)} · ${nextParticipation.pickup.label} → ${nextParticipation.dropoff.label}`
              : 'Todavía no tienes participaciones próximas.'}
          </Text>
        )}
        <Link href="/my-reservations" style={s.link}>
          Mis participaciones
        </Link>
      </View>
      <View style={s.section}>
        <Text style={s.title}>Movilidad este mes</Text>
        {mobility.data && (
          <Text style={s.text}>
            Desplazamientos compartidos · {mobility.data.totals.sharedTrips}
          </Text>
        )}
        <Link href="/mobility-statistics" style={s.link}>
          Mis estadísticas
        </Link>
      </View>
      <Text style={s.title}>Viajes para ti</Text>
      {recommended.isPending && (
        <Text style={s.text}>Buscando viajes compatibles…</Text>
      )}
      {recommended.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {recommended.error.message}
        </Text>
      )}
      <TripCards trips={matches} />
      {!recommended.isPending && !recommended.error && !matches.length && (
        <View style={s.section}>
          <Text style={s.text}>
            Todavía no hay viajes compatibles con tus horarios habituales.
          </Text>
          <Link href="/available-trips" style={s.link}>
            Consultar viajes disponibles
          </Link>
          <Link href="/mobility" style={s.link}>
            Ajustar preferencias
          </Link>
        </View>
      )}
      <View style={s.section}>
        <Text style={s.title}>Notificaciones recientes</Text>
        {notifications.error && (
          <Text accessibilityRole="alert" style={s.error}>
            {notifications.error.message}
          </Text>
        )}
        {!notifications.error && !notifications.isPending && (
          <Text style={s.text}>
            {unread.length
              ? `${unread.length} avisos sin leer`
              : 'Estás al día.'}
          </Text>
        )}
        {unread.some((item) => item.kind === 'RATING_AVAILABLE') && (
          <Link href="/ratings" style={s.link}>
            Consultar calificaciones pendientes
          </Link>
        )}
        <Link href="/notifications" style={s.link}>
          Ver notificaciones
        </Link>
      </View>
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  welcome: {
    backgroundColor: colors.dark,
    padding: 24,
    gap: 9,
    borderRadius: 15,
  },
  title: { color: colors.surface, fontSize: 29, fontWeight: '800' },
  intro: { color: '#d1e9dc', fontSize: 16, lineHeight: 24 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
  action: {
    color: colors.dark,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 8,
    minHeight: 44,
    fontWeight: '700',
  },
});
