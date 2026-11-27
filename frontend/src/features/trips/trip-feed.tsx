import { pesos } from '../expenses/economic-terms';
import { ReputationLabel } from '../ratings/reputation-label';
import { useState } from 'react';
import { Link } from 'expo-router';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { FeedTab, TripFeedCard, TripFeedPage } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';

const tabs: { key: FeedTab; label: string }[] = [
  { key: 'FOR_YOU', label: 'Para ti' },
  { key: 'ALL', label: 'Todos' },
  { key: 'DESDE_USC', label: 'Desde la USC' },
  { key: 'HACIA_USC', label: 'Hacia la USC' },
];
export const directionLabel = {
  DESDE_USC: 'Desde la USC',
  HACIA_USC: 'Hacia la USC',
};
export function tripDate(iso: string) {
  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function useTripFeed(tab: FeedTab, userId: string | undefined) {
  return useInfiniteQuery({
    queryKey: ['trip-feed', userId, tab],
    enabled: !!userId,
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const query = new URLSearchParams({ tab });
      if (pageParam) query.set('cursor', pageParam);
      return api<TripFeedPage>(`/trips/feed?${query.toString()}`);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    refetchInterval: 30000,
  });
}

function TripCard({ trip }: { trip: TripFeedCard }) {
  const recommendation = trip.recommendation;
  return (
    <View style={styles.card}>
      <View style={styles.meta}>
        <Text style={styles.kind}>{directionLabel[trip.direction]}</Text>
        <Text style={styles.seats}>
          {trip.availableSeats} {trip.availableSeats === 1 ? 'plaza' : 'plazas'}
        </Text>
      </View>
      <Text style={styles.date}>{tripDate(trip.departureAt)}</Text>
      <View style={styles.route}>
        <Text style={styles.place}>
          <Text style={styles.field}>Origen · </Text>
          {trip.originLabel}
        </Text>
        <Text style={styles.place}>
          <Text style={styles.field}>Destino · </Text>
          {trip.destinationLabel}
        </Text>
      </View>
      <Text style={s.text}>
        {trip.driverName ?? 'Conductor'} · {trip.vehicle.brand}{' '}
        {trip.vehicle.color.toLowerCase()}
      </Text>
      {trip.economics && (
        <Text style={s.text}>
          {trip.economics.suggestedContributionCop
            ? `Aporte sugerido · ${pesos(trip.economics.suggestedContributionCop)} COP`
            : 'Viaje gratuito'}
        </Text>
      )}
      <ReputationLabel summary={trip.driverReputation} />
      <Text style={s.text}>{trip.meetingLabel}</Text>
      {trip.rules.length > 0 && (
        <Text style={s.text}>
          {trip.rules.map(({ description }) => description).join(' · ')}
        </Text>
      )}
      {recommendation && (
        <Text
          style={[
            styles.kind,
            recommendation.type === 'POTENTIAL' && styles.potential,
          ]}
        >
          {recommendation.type === 'DIRECT'
            ? 'Recogida compatible'
            : 'Puedes proponer una recogida'}
        </Text>
      )}
      {recommendation?.pickupEstimatedAt &&
        recommendation.pickupEstimatedAt !== trip.departureAt && (
          <Text style={s.text}>
            Recogida estimada · {tripDate(recommendation.pickupEstimatedAt)}
          </Text>
        )}
      <Link
        href={{ pathname: '/trip/[id]', params: { id: trip.id } }}
        style={s.link}
      >
        Ver detalle del viaje
      </Link>
    </View>
  );
}

export function TripCards({ trips }: { trips: TripFeedCard[] }) {
  const { width } = useWindowDimensions();
  const columns = width >= 1000;
  return (
    <View style={styles.grid}>
      {trips.map((trip) => (
        <View key={trip.id} style={columns ? styles.half : styles.full}>
          <TripCard trip={trip} />
        </View>
      ))}
    </View>
  );
}

export function TripFeedScreen() {
  const { user } = useSession();
  const [tab, setTab] = useState<FeedTab>('FOR_YOU');
  const query = useTripFeed(
    tab,
    user?.capabilities.passenger ? user.id : undefined,
  );
  const trips = query.data?.pages.flatMap(({ items }) => items) ?? [];
  const empty = !query.isPending && !query.error && !trips.length;

  return (
    <ProtectedPage title="Viajes disponibles">
      <Link href="/saved-trips" style={s.link}>
        Mis viajes guardados
      </Link>
      <View accessibilityRole="tablist" style={styles.tabs}>
        {tabs.map(({ key, label }) => (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === key }}
            aria-selected={tab === key}
            onPress={() => setTab(key)}
            style={[styles.tab, tab === key && styles.tabSelected]}
          >
            <Text style={styles.tabText}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {query.isPending && <Text style={s.text}>Cargando viajes…</Text>}
      {query.error && (
        <View style={s.section}>
          <Text accessibilityRole="alert" style={s.error}>
            {query.error.message}
          </Text>
          <Button
            title="Reintentar"
            secondary
            onPress={() => {
              void query.refetch();
            }}
          />
        </View>
      )}
      <TripCards trips={trips} />
      {empty && (
        <View style={s.section}>
          <Text style={s.title}>
            {tab === 'FOR_YOU'
              ? 'Todavía no hay recomendaciones'
              : 'No hay viajes con plazas'}
          </Text>
          <Text style={s.text}>
            {tab === 'FOR_YOU'
              ? query.data?.pages[0]?.hasActivePreferences
                ? 'Puedes ver otros viajes o ajustar tus zonas y horarios.'
                : 'Agrega una zona y un horario para recibir recomendaciones de viaje.'
              : 'Prueba otra modalidad o vuelve a consultar más tarde.'}
          </Text>
          {tab === 'FOR_YOU' && (
            <Button
              title="Ver todos los viajes"
              secondary
              onPress={() => setTab('ALL')}
            />
          )}
          <Link href="/mobility" style={s.link}>
            Preferencias de movilidad
          </Link>
        </View>
      )}
      {query.hasNextPage && (
        <Button
          title="Ver más viajes"
          secondary
          disabled={query.isFetchingNextPage}
          onPress={() => {
            void query.fetchNextPage();
          }}
        />
      )}
      <Link href="/search-trips" style={s.link}>
        Buscar con filtros
      </Link>
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tab: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.selected,
  },
  tabText: { color: colors.ink, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  half: { width: '48%', flexGrow: 1, maxWidth: '50%' },
  full: { width: '100%' },
  card: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    padding: 16,
    gap: 9,
    backgroundColor: colors.surface,
    flex: 1,
  },
  meta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  kind: {
    color: colors.primary,
    backgroundColor: colors.selected,
    alignSelf: 'flex-start',
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 4,
    fontSize: 13,
    fontWeight: '700',
  },
  potential: { backgroundColor: colors.banner, color: colors.bannerText },
  seats: {
    color: colors.primary,
    fontWeight: '800',
    alignSelf: 'center',
    fontSize: 14,
  },
  date: { color: colors.ink, fontSize: 19, fontWeight: '800', marginTop: 4 },
  route: {
    gap: 5,
    borderLeftWidth: 2,
    borderColor: colors.border,
    paddingLeft: 9,
    marginVertical: 3,
  },
  place: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  field: { color: colors.muted, fontWeight: '400' },
});
