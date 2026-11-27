import { useEffect, useState } from 'react';
import type {
  Account,
  CampusMeetingPoint,
  MobilityStatistics,
  NotificationPage,
  ReservationView,
  TripOperation,
  TripSummary,
} from '@ruteam/contracts';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import {
  MobilityMap,
  type MapMarker,
} from '../../components/maps/mobility-map';
import { BottomSheet } from '../../components/ui/bottom-sheet';
import { Button } from '../../components/ui/button';
import { Icon } from '../../components/ui/icon';
import { api } from '../../services/api/client';
import { breakpoints, colors, radii } from '../../theme/tokens';
import { Link, Pressable, Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';
import { notificationContent } from './notification-content';
import { TripCards, tripDate, useTripFeed } from '../trips/trip-feed';

type TravelContext = 'passenger' | 'driver';
export function HomeScreen({ user }: { user: Account }) {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const wide = width >= breakpoints.columns;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(clock);
  }, []);
  const [context, setContext] = useState<TravelContext>(
    user.capabilities.driver && user.usagePreference === 'DRIVER_AND_PASSENGER'
      ? 'driver'
      : 'passenger',
  );
  const driving = user.capabilities.driver && context === 'driver';
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
  const campuses = useQuery({
    queryKey: ['meeting-points', user.id],
    queryFn: () => api<CampusMeetingPoint[]>('/campus/meeting-points'),
  });
  const mobility = useQuery({
    queryKey: ['mobility-statistics', user.id, 1],
    queryFn: () => api<MobilityStatistics>('/mobility/statistics?months=1'),
  });
  const notices = useQuery({
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
            Date.parse(item.departureAt) > now)),
    )
    .sort(
      (a, b) =>
        Number(b.tripStatus === 'EN_CURSO') -
          Number(a.tripStatus === 'EN_CURSO') ||
        Date.parse(a.departureAt) - Date.parse(b.departureAt),
    )[0];
  const upcoming = (trips.data ?? [])
    .filter(
      (trip) =>
        trip.status === 'EN_CURSO' ||
        (trip.status === 'PROGRAMADO' && Date.parse(trip.departureAt) > now),
    )
    .sort(
      (a, b) =>
        Number(b.status === 'EN_CURSO') - Number(a.status === 'EN_CURSO') ||
        Date.parse(a.departureAt) - Date.parse(b.departureAt),
    );
  const nextTrip = upcoming[0];
  const passengerTripId = nextParticipation?.tripId;
  const operation = useQuery({
    queryKey: ['trip-operation', user.id, passengerTripId],
    enabled: !driving && !!passengerTripId,
    queryFn: () => api<TripOperation>(`/trips/${passengerTripId}/operation`),
  });

  const itinerary = driving
    ? nextTrip?.itinerary
    : operation.error
      ? null
      : operation.data?.itinerary;
  const markers: MapMarker[] = [];
  for (const campus of campuses.data ?? []) {
    if (
      campus.kind === 'CAMPUS' &&
      campus.latitude !== null &&
      campus.longitude !== null
    )
      markers.push({
        id: campus.id,
        label: campus.name,
        latitude: campus.latitude,
        longitude: campus.longitude,
        kind: 'campus',
      });
  }
  if (itinerary?.stops.length) {
    itinerary.stops.forEach((point, index) =>
      markers.push({
        ...point,
        kind:
          index === 0
            ? 'origin'
            : index === itinerary.stops.length - 1
              ? 'destination'
              : point.access === 'DROPOFF'
                ? 'dropoff'
                : point.access === 'WAYPOINT'
                  ? 'waypoint'
                  : 'pickup',
        description: point.instructions,
      }),
    );
  } else if (!driving && nextParticipation && !next.error) {
    markers.push({
      ...nextParticipation.pickup,
      kind: 'pickup',
      description: nextParticipation.pickup.instructions,
    });
    markers.push({
      ...nextParticipation.dropoff,
      kind: 'dropoff',
      description: nextParticipation.dropoff.instructions,
    });
  }
  const matches = recommended.data?.pages[0]?.items.slice(0, 4) ?? [];
  const unread = notices.data?.items.filter(({ readAt }) => !readAt) ?? [];
  const relevantId = driving ? nextTrip?.id : passengerTripId;
  const hasTrip = driving ? !!nextTrip : !!nextParticipation;
  const currentQuery = driving ? trips : next;

  const reminders = unread
    .filter(({ kind, available }) => available && kind.endsWith('_REMINDER'))
    .slice(0, 3);

  return (
    <ProtectedPage title="Inicio" compactTitle>
      <View style={styles.welcome}>
        <Text style={[styles.greeting, !wide && styles.greetingCompact]}>
          Hola, {user.profile.displayName}
        </Text>
        <Text style={styles.intro}>
          {driving
            ? 'Organiza tus próximos viajes compartidos.'
            : 'Encuentra un viaje desde o hacia la Universidad Santiago de Cali.'}
        </Text>
        {user.capabilities.driver && (
          <View
            accessibilityRole="tablist"
            accessibilityLabel="Contexto de viaje"
            style={styles.modeSwitch}
          >
            {(['passenger', 'driver'] as const).map((mode) => (
              <Pressable
                key={mode}
                accessibilityRole="tab"
                accessibilityState={{ selected: context === mode }}
                onPress={() => setContext(mode)}
                style={[
                  styles.modeOption,
                  context === mode && styles.modeSelected,
                ]}
              >
                <Icon
                  name={mode === 'driver' ? 'navigation' : 'users'}
                  size={16}
                />
                <Text style={styles.modeText}>
                  {mode === 'driver' ? 'Conductor' : 'Pasajero'}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={[styles.mapColumn, wide && styles.mapWide]}>
          <MobilityMap
            label="Mapa de movilidad RuTeam"
            markers={markers}
            geometry={itinerary?.geometry}
            locate
            height={
              wide
                ? 456
                : Math.min(320, Math.max(220, Math.round(height * 0.36)))
            }
          />
          {campuses.error && (
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
              No pudimos consultar los puntos USC.
            </Text>
          )}
        </View>
        <View style={[styles.side, wide && styles.sideWide]}>
          <BottomSheet
            title={driving ? 'Próximo viaje publicado' : 'Próximo viaje'}
          >
            {currentQuery.isPending && (
              <Text style={s.text}>Consultando tus viajes…</Text>
            )}
            {currentQuery.error && (
              <Text accessibilityRole="alert" style={s.error}>
                {currentQuery.error.message}
              </Text>
            )}
            {!currentQuery.isPending && !currentQuery.error && !hasTrip && (
              <View style={styles.empty}>
                <Icon name="calendar" size={28} />
                <Text style={s.text}>
                  {driving
                    ? 'Aún no tienes viajes próximos.'
                    : 'Todavía no tienes un viaje confirmado.'}
                </Text>
              </View>
            )}
            {!currentQuery.error && driving && nextTrip && (
              <View style={styles.trip}>
                <Text style={styles.place}>
                  {nextTrip.origin.label} → {nextTrip.destination.name}
                </Text>
                <Text style={s.text}>{tripDate(nextTrip.departureAt)}</Text>
                <Text style={s.text}>
                  {nextTrip.occupiedSeats}/{nextTrip.offeredSeats} plazas
                  ocupadas
                </Text>
              </View>
            )}
            {!currentQuery.error && !driving && nextParticipation && (
              <View style={styles.trip}>
                <Text style={styles.place}>
                  {nextParticipation.pickup.label} →{' '}
                  {nextParticipation.dropoff.label}
                </Text>
                <Text style={s.text}>
                  {tripDate(nextParticipation.departureAt)}
                </Text>
                {nextParticipation.pickup.instructions && (
                  <Text style={s.text}>
                    {nextParticipation.pickup.instructions}
                  </Text>
                )}
              </View>
            )}
            {driving ? (
              <Link href="/publish" style={styles.cta}>
                Publicar viaje
              </Link>
            ) : (
              <Button
                title="Explorar viajes"
                icon="search"
                onPress={() => router.push('/available-trips')}
              />
            )}
            {relevantId && !currentQuery.error && (
              <Link
                href={{
                  pathname: '/trip-operation/[tripId]',
                  params: { tripId: relevantId },
                }}
                style={s.link}
              >
                Ver detalles del viaje
              </Link>
            )}
            {driving ? (
              <>
                <Link href="/my-trips" style={s.link}>
                  Mis viajes publicados
                </Link>
                <Link href="/recurring-trips" style={s.link}>
                  Viajes recurrentes
                </Link>
              </>
            ) : (
              <Link href="/my-reservations" style={s.link}>
                Mis participaciones
              </Link>
            )}
          </BottomSheet>
          <View style={s.section}>
            <Text style={s.title}>{driving ? 'Actividad' : 'Para ti'}</Text>
            {driving ? (
              <Link href="/agenda" style={s.link}>
                Agenda de viajes
              </Link>
            ) : (
              <Text style={s.text}>
                {matches.length
                  ? 'Consulta tus coincidencias debajo.'
                  : recommended.isPending
                    ? 'Buscando viajes compatibles…'
                    : recommended.error
                      ? 'No se pudieron cargar las recomendaciones.'
                      : 'Todavía no hay viajes compatibles con tus horarios habituales.'}
              </Text>
            )}
            <Link href="/activity" style={s.link}>
              Mis actividades
            </Link>
          </View>
        </View>
      </View>
      {user.capabilities.driverAccess && !user.capabilities.driver && (
        <View style={s.section}>
          <Text style={s.title}>Conducción</Text>
          <Text style={s.text}>Revisa tus documentos antes de publicar.</Text>
          <Link href="/vehicles" style={s.link}>
            Vehículos y licencia
          </Link>
          <Link href="/my-trips" style={s.link}>
            Mis viajes publicados
          </Link>
          <Link href="/recurring-trips" style={s.link}>
            Viajes recurrentes
          </Link>
        </View>
      )}
      <View style={styles.sectionTitle}>
        <Text role="heading" aria-level={2} style={s.title}>
          Viajes para ti
        </Text>
        <Link href="/available-trips" style={s.link}>
          Ver todos
        </Link>
      </View>
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
        <Link href="/mobility" style={s.link}>
          Ajustar preferencias
        </Link>
      )}
      <View style={[styles.body, wide && styles.bodyWide]}>
        <View style={[s.section, wide && styles.secondaryPanel]}>
          <Text style={s.title}>Movilidad este mes</Text>
          {mobility.data && (
            <Text style={s.text}>
              Desplazamientos compartidos · {mobility.data.totals.sharedTrips}
            </Text>
          )}
          {mobility.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {mobility.error.message}
            </Text>
          )}
          <Link href="/mobility-statistics" style={s.link}>
            Mis estadísticas
          </Link>
        </View>
        <View style={[s.section, wide && styles.secondaryPanel]}>
          <Text style={s.title}>Notificaciones recientes</Text>
          {notices.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {notices.error.message}
            </Text>
          )}
          {!notices.error && !notices.isPending && (
            <Text style={s.text}>
              {unread.length
                ? `${unread.length} avisos sin leer`
                : 'Estás al día.'}
            </Text>
          )}
          {unread.some(({ kind }) => kind === 'RATING_AVAILABLE') && (
            <Link href="/ratings" style={s.link}>
              Consultar calificaciones pendientes
            </Link>
          )}
          <Link href="/notifications" style={s.link}>
            Ver notificaciones
          </Link>
        </View>
      </View>
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  welcome: { gap: 7 },
  greeting: {
    fontSize: 33,
    lineHeight: 38,
    letterSpacing: -1,
    fontWeight: '900',
    color: colors.ink,
  },
  greetingCompact: { fontSize: 27, lineHeight: 32, letterSpacing: -0.55 },
  intro: { fontSize: 15, color: colors.muted, lineHeight: 22 },
  modeSwitch: {
    flexDirection: 'row',
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.control,
    backgroundColor: colors.surface,
    padding: 3,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    minHeight: 42,
    paddingHorizontal: 13,
    borderRadius: 9,
  },
  modeSelected: { backgroundColor: colors.selected },
  modeText: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  body: { gap: 14 },
  bodyWide: { flexDirection: 'row', alignItems: 'flex-start', gap: 18 },
  mapColumn: { minWidth: 0, gap: 8 },
  mapWide: { flex: 1 },
  side: { gap: 12, minWidth: 0 },
  sideWide: { width: '34%', maxWidth: 390 },
  empty: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.control,
    padding: 17,
    alignItems: 'center',
    gap: 9,
  },
  trip: {
    gap: 5,
    borderLeftColor: colors.turquoise,
    borderLeftWidth: 3,
    paddingLeft: 10,
  },
  place: { fontWeight: '800', fontSize: 16, color: colors.ink },
  cta: {
    color: colors.onPrimary,
    backgroundColor: '#125fda',
    borderRadius: radii.control,
    padding: 14,
    minHeight: 47,
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  secondaryPanel: { flexGrow: 1, flexBasis: 0 },
});
