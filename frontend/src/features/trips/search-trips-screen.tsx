import { Link, Text, View } from '../../theme/primitives';
import { FrequentPlacePicker } from '../mobility/frequent-place-picker';
import { ReputationLabel } from '../ratings/reputation-label';
import { EconomicTerms } from '../expenses/economic-terms';
import { useState } from 'react';

import { useForm, useWatch } from 'react-hook-form';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AvailableTrip,
  CampusMeetingPoint,
  ConfirmParticipationInput,
  ReservationView,
  TripSearchPage,
} from '@ruteam/contracts';
import { Field } from '../../components/forms/field';
import { caliCenter } from '../../components/maps/mercator';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { useSession } from '../../providers/session-provider';
import { GroupInvitationForm } from '../groups/group-invitations';
import { Choice } from './itinerary-form';
import { RoutePreview, travelTime } from './route-preview';
import { MeetingMapPicker, type Coordinates } from './meeting-map-picker';
import { PickupProposalForm } from './pickup-proposals';

interface SearchForm {
  from: string;
  to: string;
  after: string;
  before: string;
  seats: string;
  direction: string;
}
function localInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw new Error('Usa AAAA-MM-DD HH:mm para las horas de Colombia.');
  return `${value.replace(' ', 'T')}:00-05:00`;
}

export function ReserveTrip({
  trip,
  onConfirmed,
  groupCapacity = 0,
}: {
  trip: Omit<AvailableTrip, 'match'> & { match: AvailableTrip['match'] | null };
  onConfirmed: () => void;
  groupCapacity?: number;
}) {
  const client = useQueryClient();
  const [pickupId, setPickup] = useState(trip.match?.pickupId ?? '');
  const [dropoffId, setDropoff] = useState(trip.match?.dropoffId ?? '');
  const stops = trip.itinerary.stops;
  const pickup = stops.find((stop) => stop.id === pickupId);
  const canDrop = (access: string) => access === 'DROPOFF' || access === 'BOTH';
  const dropoffs = stops.filter(
    (stop) => pickup && stop.position > pickup.position && canDrop(stop.access),
  );
  const pickups = stops.filter(
    (stop) =>
      (trip.itinerary.direction !== 'DESDE_USC' || stop === stops[0]) &&
      (stop.access === 'PICKUP' || stop.access === 'BOTH') &&
      stops.some((end) => end.position > stop.position && canDrop(end.access)),
  );
  const selectedDropoffId = dropoffs.some((stop) => stop.id === dropoffId)
    ? dropoffId
    : dropoffs[0]?.id;
  const send = useMutation({
    mutationFn: (body: ConfirmParticipationInput) =>
      api<ReservationView>(`/trips/${trip.id}/participations`, {
        method: 'POST',
        body,
      }),
    onSettled: () => {
      void client.invalidateQueries({ queryKey: ['trip-detail', trip.id] });
      void client.invalidateQueries({ queryKey: ['trip-feed'] });
    },
    onSuccess: () => {
      onConfirmed();
      void client.invalidateQueries({ queryKey: ['my-reservations'] });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
    },
  });
  const submit = () => {
    if (!pickupId || !selectedDropoffId) return;
    send.mutate({ pickupId, dropoffId: selectedDropoffId });
  };
  if (send.isSuccess) return null;
  return (
    <View style={s.section}>
      <Text style={s.title}>Selecciona el punto de encuentro</Text>
      {pickups.map((stop) => (
        <Choice
          key={stop.id}
          label={`Encuentro · ${stop.label}`}
          checked={pickupId === stop.id}
          onPress={() => setPickup(stop.id)}
        />
      ))}
      <Text style={s.title}>Selecciona el descenso</Text>
      {dropoffs.map((stop) => (
        <Choice
          key={stop.id}
          label={`Descenso · ${stop.label}`}
          checked={selectedDropoffId === stop.id}
          onPress={() => setDropoff(stop.id)}
        />
      ))}
      <Text style={s.text}>
        La confirmación individual registra únicamente tu plaza.
      </Text>
      {send.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {send.error.message}
        </Text>
      )}
      <Button
        title={send.isPending ? 'Confirmando…' : 'Confirmar participación'}
        disabled={send.isPending || !selectedDropoffId}
        onPress={() => {
          void submit();
        }}
      />
      {groupCapacity >= 2 && (
        <GroupInvitationForm
          tripId={trip.id}
          pickupId={pickupId}
          dropoffId={selectedDropoffId}
          offeredSeats={groupCapacity}
        />
      )}
    </View>
  );
}

export function SearchTripsScreen() {
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [inputError, setInputError] = useState('');
  const [expanded, setExpanded] = useState<string>();
  const [catalogFor, setCatalogFor] = useState<'from' | 'to'>();
  const [showNearby, setShowNearby] = useState(false);
  const [near, setNear] = useState<Coordinates>();
  const [nearIsPrivate, setNearIsPrivate] = useState(false);
  const [radiusKm, setRadiusKm] = useState(0.5);
  const [confirmed, setConfirmed] = useState(false);
  const [selectedPoints, setSelectedPoints] = useState<
    Partial<Record<'from' | 'to', { id: string; label: string }>>
  >({});
  const form = useForm<SearchForm>({
    defaultValues: {
      from: '',
      to: '',
      after: '',
      before: '',
      seats: '1',
      direction: '',
    },
  });
  const direction = useWatch({ control: form.control, name: 'direction' });
  const catalog = useQuery({
    queryKey: ['meeting-points'],
    queryFn: () => api<CampusMeetingPoint[]>('/campus/meeting-points'),
    enabled: !!user?.capabilities.passenger && (!!catalogFor || showNearby),
  });
  const results = useInfiniteQuery({
    queryKey: ['available-trips', user?.id, search],
    initialPageParam: null as string | null,
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams(search);
      if (pageParam) params.set('cursor', pageParam);
      return api<TripSearchPage>(`/trips/available?${params.toString()}`);
    },
    getNextPageParam: (page) => page.nextCursor ?? undefined,
    enabled: !!user?.capabilities.passenger,
  });
  const submit = form.handleSubmit((values) => {
    try {
      const params = new URLSearchParams();
      for (const [key, raw] of Object.entries(values)) {
        const value = raw.trim();
        if (!value) continue;
        if (key === 'from' || key === 'to') {
          const selected = selectedPoints[key];
          if (selected && selected.label === value)
            params.set(key, selected.id);
          else if (value.toUpperCase() === 'USC') params.set(key, 'USC');
          else params.set(`${key}Text`, value);
        } else {
          params.set(
            key,
            key === 'after' || key === 'before' ? localInstant(value) : value,
          );
        }
      }
      if (showNearby && near) {
        params.set(
          'near',
          `${near.latitude.toFixed(6)},${near.longitude.toFixed(6)}`,
        );
        params.set('radiusKm', String(radiusKm));
      }
      setInputError('');
      setExpanded(undefined);
      const next = params.toString();
      if (next === search) void results.refetch();
      else setSearch(next);
    } catch (error) {
      setInputError(
        error instanceof Error ? error.message : 'Revisa los filtros.',
      );
    }
  });
  const reference = catalog.data?.find(
    ({ latitude, longitude }) => latitude !== null && longitude !== null,
  );
  const trips = results.data?.pages.flatMap(({ items }) => items) ?? [];
  return (
    <ProtectedPage title="Buscar viajes">
      <Link href="/my-reservations" style={s.link}>
        Mis participaciones
      </Link>
      <Text style={s.text}>
        Busca por barrio, dirección o lugar y elige puntos de encuentro de la
        USC. Los resultados respetan las paradas y el recorrido publicados.
      </Text>
      {confirmed && (
        <View style={s.section}>
          <Text accessibilityLiveRegion="polite">
            Participación confirmada. Tu plaza ya está registrada.
          </Text>
          <Link href="/my-reservations" style={s.link}>
            Ver mis participaciones
          </Link>
        </View>
      )}
      <Text style={s.title}>Sentido del viaje</Text>
      {[
        ['', 'Todos los sentidos'],
        ['DESDE_USC', 'Desde la USC'],
        ['HACIA_USC', 'Hacia la USC'],
      ].map(([value, label]) => (
        <Choice
          key={value}
          label={label}
          checked={direction === value}
          onPress={() => form.setValue('direction', value)}
        />
      ))}
      <Field control={form.control} name="from" label="Origen deseado" />
      <Button
        title="Elegir punto USC para el origen"
        secondary
        onPress={() =>
          setCatalogFor(catalogFor === 'from' ? undefined : 'from')
        }
      />
      <Field control={form.control} name="to" label="Destino deseado" />
      <Button
        title="Elegir punto USC para el destino"
        secondary
        onPress={() => setCatalogFor(catalogFor === 'to' ? undefined : 'to')}
      />
      {catalogFor && (
        <View style={s.section}>
          <Text style={s.title}>
            Puntos para {catalogFor === 'from' ? 'el origen' : 'el destino'}
          </Text>
          {catalog.isPending && <Text>Cargando puntos institucionales…</Text>}
          {catalog.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {catalog.error.message}
            </Text>
          )}
          {catalog.data?.map((point) => (
            <Button
              key={point.id}
              secondary
              title={
                point.kind === 'CAMPUS'
                  ? 'Toda la USC'
                  : `${point.name}${point.demo ? ' · Punto de prueba' : ''}`
              }
              onPress={() => {
                const label = point.kind === 'CAMPUS' ? 'USC' : point.name;
                setSelectedPoints((current) => ({
                  ...current,
                  [catalogFor]: {
                    id: point.kind === 'CAMPUS' ? 'USC' : point.id,
                    label,
                  },
                }));
                form.setValue(catalogFor, label);
                setCatalogFor(undefined);
              }}
            />
          ))}
        </View>
      )}
      <Button
        title={
          showNearby
            ? 'Quitar filtro de proximidad'
            : 'Buscar cerca de un lugar en el mapa'
        }
        secondary
        onPress={() => {
          setShowNearby(!showNearby);
          setNear(undefined);
          setNearIsPrivate(false);
        }}
      />
      {showNearby && (
        <View style={s.section}>
          <Text style={s.text}>
            Se muestran recorridos que pasan cerca. Para abordar, elige una
            parada autorizada.
          </Text>
          <FrequentPlacePicker
            onSelect={({ latitude, longitude }) => {
              setNear({ latitude, longitude });
              setNearIsPrivate(true);
            }}
          />
          <MeetingMapPicker
            title="Lugar de interés"
            key={
              near && nearIsPrivate
                ? `private:${near.latitude}:${near.longitude}`
                : 'public'
            }
            reference={
              reference?.latitude != null && reference.longitude != null
                ? {
                    latitude: reference.latitude,
                    longitude: reference.longitude,
                  }
                : caliCenter
            }
            privateReference={nearIsPrivate ? near : undefined}
            value={nearIsPrivate ? undefined : near}
            initiallyOpen={nearIsPrivate || !!near}
            onSelect={(point) => {
              setNear(point);
              setNearIsPrivate(false);
            }}
          />
          {catalog.isPending && <Text>Cargando referencias del mapa…</Text>}
          {catalog.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {catalog.error.message}
            </Text>
          )}
          {[0.5, 1, 2].map((distance) => (
            <Choice
              key={distance}
              label={
                distance === 0.5 ? 'Hasta 500 metros' : `Hasta ${distance} km`
              }
              checked={radiusKm === distance}
              onPress={() => setRadiusKm(distance)}
            />
          ))}
        </View>
      )}
      <Field
        control={form.control}
        name="after"
        label="Desde (AAAA-MM-DD HH:mm, Colombia)"
      />
      <Field
        control={form.control}
        name="before"
        label="Hasta (AAAA-MM-DD HH:mm, Colombia)"
      />
      <Field control={form.control} name="seats" label="Cupos necesarios" />
      <Button
        title="Buscar viajes disponibles"
        onPress={() => {
          void submit();
        }}
      />
      {inputError && (
        <Text accessibilityRole="alert" style={s.error}>
          {inputError}
        </Text>
      )}
      {results.isPending && <Text>Buscando viajes…</Text>}
      {results.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {results.error.message}
        </Text>
      )}
      {results.isSuccess && trips.length === 0 && (
        <Text>
          {results.hasNextPage
            ? 'Esta página no contiene coincidencias.'
            : 'No hay viajes compatibles con esos filtros.'}
        </Text>
      )}
      {trips.map((trip) => {
        const [origin] = trip.itinerary.stops;
        const destination = trip.itinerary.stops.at(-1);
        return (
          <View style={s.section} key={trip.id}>
            <Text style={s.title}>
              {origin.label} → {destination?.label}
            </Text>
            <Text style={s.text}>
              {travelTime(trip.departureAt)} · {trip.availableSeats} plazas
            </Text>
            <Text style={s.text}>
              {trip.driverName ?? 'Conductor RuTeam'} · {trip.vehicle.brand} ·{' '}
              {trip.vehicle.color}
              {trip.vehicle.type === 'MOTORCYCLE' ? ' · Moto' : ' · Auto'}
            </Text>
            <ReputationLabel summary={trip.driverReputation} />
            <Button
              title={
                expanded === trip.id
                  ? 'Ocultar recorrido'
                  : 'Ver recorrido y participar'
              }
              secondary
              onPress={() =>
                setExpanded(expanded === trip.id ? undefined : trip.id)
              }
            />
            {expanded === trip.id && (
              <>
                <Link
                  href={{ pathname: '/trip/[id]', params: { id: trip.id } }}
                  style={s.link}
                >
                  Ver detalle y guardar viaje
                </Link>
                <RoutePreview {...trip.itinerary} />
                <Text style={s.text}>
                  Duración declarada {trip.estimatedDurationMinutes} min ·{' '}
                  {trip.rules.map(({ description }) => description).join(' · ')}
                </Text>
                {trip.vehicle.type === 'MOTORCYCLE' && (
                  <Text style={s.text}>
                    {trip.providesHelmet
                      ? 'Casco incluido'
                      : 'Trae tu propio casco'}
                  </Text>
                )}
                <EconomicTerms terms={trip.economics} />
                {user && (
                  <ReserveTrip
                    trip={trip}
                    onConfirmed={() => setConfirmed(true)}
                  />
                )}
                <PickupProposalForm trip={trip} />
              </>
            )}
          </View>
        );
      })}
      {results.hasNextPage && (
        <Button
          title={
            results.isFetchingNextPage ? 'Cargando…' : 'Ver más resultados'
          }
          disabled={results.isFetchingNextPage}
          secondary
          onPress={() => {
            void results.fetchNextPage();
          }}
        />
      )}
    </ProtectedPage>
  );
}
