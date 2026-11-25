import { useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ReservationView,
  TripAction,
  TripSummary,
} from '@ruteam/contracts';
import { api } from '../../services/api/client';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { ReservationSummary } from './reservations-screen';
import { RoutePreview, travelTime, tripStatusLabel } from './route-preview';
import { DriverPickupProposals } from './pickup-proposals';

function DriverParticipants({ tripId }: { tripId: string }) {
  const client = useQueryClient();
  const { user } = useSession();
  const queryKey = ['driver-participations', tripId, user?.id];
  const requests = useQuery({
    queryKey,
    queryFn: () => api<ReservationView[]>(`/trips/${tripId}/participations`),
  });
  const board = useMutation({
    mutationFn: (id: string) =>
      api<ReservationView>(`/participations/${id}/board`, { method: 'POST' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
  return (
    <View style={s.section}>
      <Text style={s.title}>Participantes del viaje</Text>
      <Text style={s.text}>
        El abordaje registra presencia desde 30 minutos antes de la salida y
        hasta el final declarado, sin ocupar otra plaza.
      </Text>
      {requests.isPending && <Text>Cargando participantes…</Text>}
      {requests.data?.length === 0 && <Text>Aún no hay participaciones.</Text>}
      {(requests.error || board.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {requests.error?.message ?? board.error?.message}
        </Text>
      )}
      {requests.data?.map((item) => (
        <View key={item.id} style={s.section}>
          <Text style={s.text}>
            {item.requesterName ?? 'Estudiante RuTeam'}
          </Text>
          <ReservationSummary item={item} />
          {item.status === 'CONFIRMED' &&
            !item.boardedAt &&
            item.quantity === 1 &&
            (item.tripStatus === 'PROGRAMADO' ||
              item.tripStatus === 'EN_CURSO') && (
              <Button
                title="Confirmar abordaje"
                disabled={board.isPending}
                onPress={() => board.mutate(item.id)}
              />
            )}
        </View>
      ))}
    </View>
  );
}

function TripCard({ trip }: { trip: TripSummary }) {
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const change = useMutation({
    mutationFn: (action: TripAction) =>
      api(`/trips/${trip.id}/transition`, { method: 'POST', body: { action } }),
    onSuccess: () => {
      setConfirmCancel(false);
      void client.invalidateQueries({ queryKey: ['my-trips'] });
      void client.invalidateQueries({
        queryKey: ['driver-participations', trip.id],
      });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
    },
  });
  return (
    <View style={s.section}>
      <Text style={s.title}>
        {trip.origin.label} → {trip.destination.name}
      </Text>
      <Text style={s.text}>{travelTime(trip.departureAt)}</Text>
      <Text style={s.text}>
        Viaje {tripStatusLabel[trip.status]} ·{' '}
        {trip.occupancy === 'LLENO' ? 'Completo' : 'Con plazas'} ·{' '}
        {trip.availableSeats}/{trip.offeredSeats} plazas
      </Text>
      <Text style={s.text}>
        {trip.vehicle.plate} · duración declarada{' '}
        {trip.estimatedDurationMinutes} min
      </Text>
      {trip.vehicle.type === 'MOTORCYCLE' && (
        <Text style={s.text}>
          {trip.providesHelmet
            ? 'Casco incluido DEMO'
            : 'Cada pasajero debe traer casco'}
        </Text>
      )}
      <Text style={s.text}>
        {trip.rules.map((rule) => rule.description).join(' · ')}
      </Text>
      {trip.itinerary ? (
        <Button
          title={
            expanded
              ? 'Ocultar detalles del viaje'
              : 'Ver recorrido y participantes'
          }
          secondary
          onPress={() => setExpanded(!expanded)}
        />
      ) : (
        <>
          <Text style={s.text}>
            Publicación histórica. Conserva las recogidas registradas.
          </Text>
          {trip.stops.map((stop) => (
            <Text key={stop.position} style={s.text}>
              {stop.position}. {stop.label}
            </Text>
          ))}
        </>
      )}
      {expanded && trip.itinerary && (
        <>
          <RoutePreview {...trip.itinerary} />
          <DriverParticipants tripId={trip.id} />
          <DriverPickupProposals trip={trip} />
        </>
      )}
      {change.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {change.error.message}
        </Text>
      )}
      {trip.status === 'PROGRAMADO' && !confirmCancel && (
        <>
          <Button
            title="Iniciar viaje"
            secondary
            disabled={change.isPending}
            onPress={() => change.mutate('START')}
          />
          <Button
            title="Cancelar viaje"
            secondary
            disabled={change.isPending}
            onPress={() => setConfirmCancel(true)}
          />
        </>
      )}
      {confirmCancel && (
        <>
          <Text style={s.text}>
            Se cancelarán las participaciones del viaje y se conservará su
            historial.
          </Text>
          <Button
            title="Confirmar cancelación del viaje"
            disabled={change.isPending}
            onPress={() => change.mutate('CANCEL')}
          />
          <Button
            title="Conservar viaje"
            secondary
            disabled={change.isPending}
            onPress={() => setConfirmCancel(false)}
          />
        </>
      )}
      {trip.status === 'EN_CURSO' && (
        <Button
          title="Finalizar viaje"
          secondary
          disabled={change.isPending}
          onPress={() => change.mutate('FINISH')}
        />
      )}
    </View>
  );
}

export function MyTripsScreen() {
  const { user } = useSession();
  const trips = useQuery({
    queryKey: ['my-trips', user?.id],
    queryFn: () => api<TripSummary[]>('/trips/my'),
    enabled: !!user,
  });
  return (
    <ProtectedPage title="Mis viajes publicados">
      <Link href="/publish" style={s.link}>
        Publicar otro viaje
      </Link>
      {trips.isPending && <Text>Cargando viajes…</Text>}
      {trips.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {trips.error.message}
        </Text>
      )}
      {trips.data?.length === 0 && <Text>Aún no has publicado viajes.</Text>}
      {trips.data?.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </ProtectedPage>
  );
}
