import { pesos } from '../expenses/economic-terms';
import { ReputationLabel } from '../ratings/reputation-label';
import { useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { StyleSheet, useWindowDimensions } from 'react-native';
import type {
  FeedTab,
  TripDetail,
  TripFeedCard,
  TripFeedPage,
  VehicleType,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Link, Pressable, Text, View } from '../../theme/primitives';
import { Icon } from '../../components/ui/icon';
import { initials } from '../../components/navigation/app-navigation';
import { RouteGeometryPreview } from './route-preview';
import { colors, radii } from '../../theme/tokens';

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
          {trip.availableSeats === 1
            ? 'Última plaza'
            : `${trip.availableSeats} plazas`}
        </Text>
      </View>
      <Text style={styles.date}>{tripDate(trip.departureAt)}</Text>
      <View style={styles.route}>
        <View style={styles.stop}>
          <View style={[styles.dot, styles.originDot]} />
          <Text style={styles.place}>{trip.originLabel}</Text>
        </View>
        <View style={styles.stop}>
          <View style={styles.dot} />
          <Text style={styles.place}>{trip.destinationLabel}</Text>
        </View>
      </View>
      <View style={styles.driver}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials(trip.driverName ?? 'Conductor')}
          </Text>
        </View>
        <View style={styles.driverText}>
          <Text style={styles.place}>{trip.driverName ?? 'Conductor'}</Text>
          <Text style={s.text}>
            {trip.vehicle.type === 'CAR' ? 'Auto' : 'Moto'} ·{' '}
            {trip.vehicle.brand} · {trip.vehicle.color.toLowerCase()}
          </Text>
        </View>
      </View>
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
  const [mode, setMode] = useState<'list' | 'map'>('list');
  const [vehicleType, setVehicleType] = useState<VehicleType | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);
  const query = useTripFeed(
    tab,
    user?.capabilities.passenger ? user.id : undefined,
  );
  const all = query.data?.pages.flatMap(({ items }) => items) ?? [];
  const trips =
    vehicleType === 'all'
      ? all
      : all.filter((trip) => trip.vehicle.type === vehicleType);
  const active = trips.find(({ id }) => id === selected) ?? trips[0];
  const details = useQuery({
    queryKey: ['trip-detail', active?.id, user?.id],
    enabled: !!user?.capabilities.passenger && mode === 'map' && !!active,
    queryFn: () => api<TripDetail>(`/trips/${active.id}`),
  });
  const empty = !query.isPending && !query.error && !trips.length;

  return (
    <ProtectedPage title="Viajes disponibles">
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
      <View style={styles.filters}>
        <View style={styles.tabs} accessibilityLabel="Vista de resultados">
          {(['list', 'map'] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: mode === item }}
              aria-pressed={mode === item}
              onPress={() => setMode(item)}
              style={[styles.filter, mode === item && styles.tabSelected]}
            >
              <Icon name={item === 'list' ? 'list' : 'map'} size={16} />
              <Text style={styles.tabText}>
                {item === 'list' ? 'Lista' : 'Mapa'}
              </Text>
            </Pressable>
          ))}
        </View>
        <View
          style={styles.tabs}
          accessibilityLabel="Vehículo en los resultados cargados"
        >
          {(['all', 'CAR', 'MOTORCYCLE'] as const).map((item) => (
            <Pressable
              key={item}
              accessibilityRole="button"
              accessibilityState={{ selected: vehicleType === item }}
              aria-pressed={vehicleType === item}
              onPress={() => setVehicleType(item)}
              style={[
                styles.filter,
                vehicleType === item && styles.tabSelected,
              ]}
            >
              <Text style={styles.tabText}>
                {item === 'all'
                  ? 'Cualquier vehículo'
                  : item === 'CAR'
                    ? 'Auto'
                    : 'Moto'}
              </Text>
            </Pressable>
          ))}
        </View>
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
      {mode === 'list' && <TripCards trips={trips} />}
      {mode === 'map' && active && (
        <View style={styles.mapResults}>
          {details.isPending && (
            <Text style={s.text}>Consultando el recorrido…</Text>
          )}
          {details.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {details.error.message}
            </Text>
          )}
          {!details.error && details.data?.itinerary && (
            <RouteGeometryPreview
              geometry={details.data.itinerary.geometry}
              stops={details.data.itinerary.stops}
            />
          )}
          <View style={styles.tabs} accessibilityLabel="Elegir viaje del mapa">
            {trips.map((trip) => (
              <Pressable
                key={trip.id}
                accessibilityRole="button"
                accessibilityState={{ selected: active.id === trip.id }}
                onPress={() => setSelected(trip.id)}
                style={[
                  styles.filter,
                  active.id === trip.id && styles.tabSelected,
                ]}
              >
                <Text style={styles.tabText}>
                  {trip.destinationLabel} · {tripDate(trip.departureAt)}
                </Text>
              </Pressable>
            ))}
          </View>
          <TripCard trip={active} />
        </View>
      )}
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
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
  },
  filter: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: radii.control,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    gap: 7,
    alignItems: 'center',
  },
  mapResults: { gap: 12 },
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
    borderRadius: radii.panel,
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
    paddingLeft: 12,
    marginVertical: 5,
    marginLeft: 6,
  },
  stop: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 28 },
  dot: {
    position: 'absolute',
    left: -18,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  originDot: { backgroundColor: colors.turquoise },
  driver: { flexDirection: 'row', gap: 9, alignItems: 'center' },
  driverText: { flex: 1 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.selected,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: colors.primary, fontWeight: '800' },
  place: { color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
});
