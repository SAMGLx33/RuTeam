import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useForm } from 'react-hook-form';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type {
  AvailableTrip,
  CampusMeetingPoint,
  RequestReservationInput,
  ReservationView,
  TripSearchPage,
} from '@ruteam/contracts';
import { Field } from '../../components/forms/field';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { api } from '../../services/api/client';
import { useSession } from '../../providers/session-provider';
import { Choice } from './itinerary-form';
import { RoutePreview, travelTime } from './route-preview';

interface SearchForm {
  from: string;
  to: string;
  after: string;
  before: string;
  radiusKm: string;
  seats: string;
}
function localInstant(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(value))
    throw new Error('Usa AAAA-MM-DD HH:mm para las horas de Colombia.');
  return `${value.replace(' ', 'T')}:00-05:00`;
}

function ReserveTrip({
  trip,
  actorId,
}: {
  trip: AvailableTrip;
  actorId: string;
}) {
  const client = useQueryClient();
  const [pickupId, setPickup] = useState(trip.match.pickupId);
  const [dropoffId, setDropoff] = useState(trip.match.dropoffId);
  const group = useForm({ defaultValues: { memberCodes: '' } });
  const stops = trip.itinerary.stops;
  const pickup = stops.find((stop) => stop.id === pickupId);
  const canDrop = (access: string) => access === 'DROPOFF' || access === 'BOTH';
  const dropoffs = stops.filter(
    (stop) => pickup && stop.position > pickup.position && canDrop(stop.access),
  );
  const pickups = stops.filter(
    (stop) =>
      (stop.access === 'PICKUP' || stop.access === 'BOTH') &&
      stops.some((end) => end.position > stop.position && canDrop(end.access)),
  );
  const selectedDropoffId = dropoffs.some((stop) => stop.id === dropoffId)
    ? dropoffId
    : dropoffs[0]?.id;
  const send = useMutation({
    mutationFn: (body: RequestReservationInput) =>
      api<ReservationView>(`/trips/${trip.id}/reservation-requests`, {
        method: 'POST',
        body,
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['my-reservations'] }),
  });
  const submit = group.handleSubmit(({ memberCodes }) => {
    if (!selectedDropoffId) return;
    const members = memberCodes.split(/[\s,]+/).filter(Boolean);
    send.mutate({
      memberIds: [actorId, ...members],
      pickupId,
      dropoffId: selectedDropoffId,
    });
  });
  if (send.isSuccess)
    return (
      <View style={s.section}>
        <Text accessibilityLiveRegion="polite">
          Solicitud enviada. El conductor debe decidir.
        </Text>
        <Link href="/my-reservations" style={s.link}>
          Ver mis reservas
        </Link>
      </View>
    );
  return (
    <View style={s.section}>
      <Text style={s.title}>Selecciona el abordaje</Text>
      {pickups.map((stop) => (
        <Choice
          key={stop.id}
          label={`Abordaje · ${stop.label}`}
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
      <Field
        control={group.control}
        name="memberCodes"
        label="Códigos de acompañantes DEMO (opcional)"
      />
      <Text style={s.text}>
        Tu plaza se incluye automáticamente. Añade códigos compartidos por los
        miembros del grupo, separados por comas.
      </Text>
      {send.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {send.error.message}
        </Text>
      )}
      <Button
        title={send.isPending ? 'Enviando…' : 'Solicitar cupo'}
        disabled={send.isPending || !selectedDropoffId}
        onPress={() => {
          void submit();
        }}
      />
    </View>
  );
}

export function SearchTripsScreen() {
  const { user } = useSession();
  const [search, setSearch] = useState('');
  const [inputError, setInputError] = useState('');
  const [expanded, setExpanded] = useState<string>();
  const [catalogFor, setCatalogFor] = useState<'from' | 'to'>();
  const form = useForm<SearchForm>({
    defaultValues: {
      from: '',
      to: '',
      after: '',
      before: '',
      radiusKm: '',
      seats: '1',
    },
  });
  const catalog = useQuery({
    queryKey: ['meeting-points'],
    queryFn: () => api<CampusMeetingPoint[]>('/campus/meeting-points'),
    enabled: !!user && !!catalogFor,
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
    enabled: !!user,
  });
  const submit = form.handleSubmit((values) => {
    try {
      const params = new URLSearchParams();
      for (const [key, value] of Object.entries(values)) {
        if (value.trim())
          params.set(
            key,
            key === 'after' || key === 'before'
              ? localInstant(value.trim())
              : value.trim(),
          );
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
  const trips = results.data?.pages.flatMap(({ items }) => items) ?? [];
  return (
    <ProtectedPage title="Buscar viajes">
      <Link href="/my-reservations" style={s.link}>
        Mis reservas
      </Link>
      <Text style={s.text}>
        Busca por USC, un punto institucional o coordenadas en formato
        latitud,longitud. Usa un radio menor que 4 km cuando ingreses
        coordenadas.
      </Text>
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
                  : `${point.name}${point.demo ? ' · DEMO' : ''}`
              }
              onPress={() => {
                form.setValue(
                  catalogFor,
                  point.kind === 'CAMPUS' ? 'USC' : point.id,
                );
                setCatalogFor(undefined);
              }}
            />
          ))}
        </View>
      )}
      <Field
        control={form.control}
        name="radiusKm"
        label="Radio de búsqueda (km)"
      />
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
            <Button
              title={
                expanded === trip.id
                  ? 'Ocultar recorrido'
                  : 'Ver recorrido y reservar'
              }
              secondary
              onPress={() =>
                setExpanded(expanded === trip.id ? undefined : trip.id)
              }
            />
            {expanded === trip.id && (
              <>
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
                {user && <ReserveTrip trip={trip} actorId={user.id} />}
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
