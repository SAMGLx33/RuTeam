import { ReputationLabel } from '../ratings/reputation-label';
import { TripSafetyLink } from '../safety/trip-safety-link';
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
import { DriverBoardingScanner } from '../boarding/boarding-pass';
import { DriverPickupProposals } from './pickup-proposals';

function DriverParticipants({ trip }: { trip: TripSummary }) {
  const client = useQueryClient();
  const { user } = useSession();
  const [confirmAbsence, setConfirmAbsence] = useState<string | null>(null);
  const queryKey = ['driver-participations', trip.id, user?.id];
  const stops = trip.itinerary?.stops ?? [];
  const pickup =
    trip.status === 'PROGRAMADO'
      ? stops[0]
      : [...stops].reverse().find((stop) => stop.reachedAt);
  const requests = useQuery({
    queryKey,
    queryFn: () => api<ReservationView[]>(`/trips/${trip.id}/participations`),
  });
  const recordPresence = useMutation({
    mutationFn: ({ id, action }: { id: string; action: 'board' | 'no-show' }) =>
      api<ReservationView>(`/participations/${id}/${action}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      setConfirmAbsence(null);
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ['my-reservations'] });
    },
  });
  return (
    <View style={s.section}>
      <Text style={s.title}>Participantes del viaje</Text>
      <Text style={s.text}>
        Antes de salir puedes registrar el abordaje en el origen desde 30
        minutos antes de la salida. En marcha, registra la llegada a la recogida
        para habilitar el abordaje.
      </Text>
      {requests.isPending && <Text>Cargando participantes…</Text>}
      {requests.data?.length === 0 && <Text>Aún no hay participaciones.</Text>}
      {(requests.error || recordPresence.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {requests.error?.message ?? recordPresence.error?.message}
        </Text>
      )}
      {requests.data?.some(
        (item) =>
          item.status === 'CONFIRMED' &&
          item.quantity === 1 &&
          !item.boardedAt &&
          !item.noShowAt &&
          item.pickup.id === pickup?.id &&
          (item.tripStatus === 'PROGRAMADO' || item.tripStatus === 'EN_CURSO'),
      ) && <DriverBoardingScanner tripId={trip.id} />}
      {requests.data?.map((item) => (
        <View key={item.id} style={s.section}>
          <Text style={s.text}>
            {item.requesterName ?? 'Estudiante RuTeam'}
          </Text>
          <ReservationSummary item={item} />
          {item.passengerReputation && (
            <ReputationLabel summary={item.passengerReputation} />
          )}
          {item.status === 'CONFIRMED' &&
            !item.boardedAt &&
            !item.noShowAt &&
            item.quantity === 1 &&
            item.pickup.id === pickup?.id &&
            (item.tripStatus === 'PROGRAMADO' ||
              item.tripStatus === 'EN_CURSO') && (
              <>
                <Button
                  title="Confirmar abordaje"
                  disabled={recordPresence.isPending}
                  onPress={() =>
                    recordPresence.mutate({ id: item.id, action: 'board' })
                  }
                />
                {item.tripStatus === 'EN_CURSO' &&
                  (confirmAbsence === item.id ? (
                    <>
                      <Button
                        title="Confirmar ausencia"
                        disabled={recordPresence.isPending}
                        onPress={() =>
                          recordPresence.mutate({
                            id: item.id,
                            action: 'no-show',
                          })
                        }
                      />
                      <Button
                        title="Volver"
                        secondary
                        onPress={() => setConfirmAbsence(null)}
                      />
                    </>
                  ) : (
                    <Button
                      title="Registrar ausencia"
                      secondary
                      disabled={recordPresence.isPending}
                      onPress={() => setConfirmAbsence(item.id)}
                    />
                  ))}
              </>
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
  const stops = trip.itinerary?.stops ?? [];
  const currentStop = [...stops].reverse().find((stop) => stop.reachedAt);
  const nextStop = stops.find((stop) => !stop.reachedAt);
  const markArrival = useMutation({
    mutationFn: (stopId: string) =>
      api(`/trips/${trip.id}/stops/${stopId}/reach`, { method: 'POST' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['my-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-detail', trip.id] });
    },
  });
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
      {trip.startedAt && (
        <Text style={s.text}>
          Inicio registrado · {travelTime(trip.startedAt)}
        </Text>
      )}
      {trip.finishedAt && (
        <Text style={s.text}>
          Finalización registrada · {travelTime(trip.finishedAt)}
        </Text>
      )}
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
            ? 'Casco incluido'
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
          <DriverParticipants trip={trip} />
          <DriverPickupProposals trip={trip} />
        </>
      )}
      {change.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {change.error.message}
        </Text>
      )}
      {trip.status !== 'CANCELADO' && (
        <Link
          href={{ pathname: '/expenses/[tripId]', params: { tripId: trip.id } }}
          style={s.link}
        >
          Costos estimados
        </Link>
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
      {trip.status === 'COMPLETADO' && (
        <Link
          href={{ pathname: '/ratings/[tripId]', params: { tripId: trip.id } }}
          style={s.link}
        >
          Calificar participantes
        </Link>
      )}
      {trip.status === 'EN_CURSO' && <TripSafetyLink tripId={trip.id} />}
      {trip.status === 'EN_CURSO' && (
        <>
          {currentStop && (
            <Text style={s.text}>
              Última parada alcanzada · {currentStop.label}
            </Text>
          )}
          {nextStop && (
            <Button
              title={`Registrar llegada · ${nextStop.label}`}
              disabled={markArrival.isPending || change.isPending}
              onPress={() => markArrival.mutate(nextStop.id)}
            />
          )}
          {markArrival.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {markArrival.error.message}
            </Text>
          )}
          <Button
            title="Finalizar viaje"
            secondary
            disabled={change.isPending || markArrival.isPending}
            onPress={() => change.mutate('FINISH')}
          />
        </>
      )}
    </View>
  );
}

export function MyTripsScreen() {
  const { user } = useSession();
  const trips = useQuery({
    queryKey: ['my-trips', user?.id],
    queryFn: () => api<TripSummary[]>('/trips/my'),
    enabled: !!user?.capabilities.driverAccess,
  });
  return (
    <ProtectedPage title="Mis viajes publicados" requires="driverAccess">
      {user?.capabilities.driver && (
        <Link href="/publish" style={s.link}>
          Publicar otro viaje
        </Link>
      )}
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
