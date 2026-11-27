import { cancellationLabel } from './cancellation-reasons';
import { EconomicTerms } from '../expenses/economic-terms';
import { ReputationLabel } from '../ratings/reputation-label';
import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { ReservationView, TripDetail } from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { PickupProposalForm } from './pickup-proposals';
import { RoutePreview, travelTime, tripStatusLabel } from './route-preview';
import { ReserveTrip } from './search-trips-screen';
import { directionLabel } from './trip-feed';

function DetailContent({
  trip,
  existing,
}: {
  trip: TripDetail;
  existing: boolean;
}) {
  const [confirmation, setConfirmation] = useState(false);
  const direction = trip.itinerary.direction;
  const first = trip.itinerary.stops[0];
  const last = trip.itinerary.stops.at(-1);
  const hasSeats = trip.availableSeats > 0;
  const confirmed = existing || confirmation;
  const canParticipate = trip.acceptsParticipation && !confirmed;
  return (
    <>
      <View style={s.section}>
        <Text style={s.title}>
          {first?.label ?? 'Origen'} → {last?.label ?? 'Destino'}
        </Text>
        <Text style={s.text}>
          {direction ? directionLabel[direction] : 'Viaje compartido'} ·{' '}
          {tripStatusLabel[trip.status]}
        </Text>
        <Text style={s.text}>
          {travelTime(trip.departureAt)} · {trip.estimatedDurationMinutes} min
          estimados
        </Text>
        <Text style={s.text}>
          Conduce {trip.driverName ?? 'un estudiante'} · {trip.vehicle.brand}{' '}
          {trip.vehicle.color.toLowerCase()}
        </Text>
        {trip.terminationReason && (
          <Text style={s.text}>
            Motivo · {cancellationLabel[trip.terminationReason]}
          </Text>
        )}
        <ReputationLabel summary={trip.driverReputation} />
        <Text style={s.text}>
          {trip.availableSeats}{' '}
          {trip.availableSeats === 1
            ? 'plaza disponible'
            : 'plazas disponibles'}
        </Text>
        <EconomicTerms terms={trip.economics} />
        {(trip.isDriver || confirmed) && (
          <Link
            href={{
              pathname: '/economic-history',
              params: {
                tripId: trip.id,
                role: trip.isDriver ? 'DRIVER' : 'PASSENGER',
              },
            }}
            style={s.link}
          >
            Historial económico de este viaje
          </Link>
        )}
        {trip.rules.map(({ id, description }) => (
          <Text key={id} style={s.text}>
            {description}
          </Text>
        ))}
        {trip.providesHelmet !== null && trip.vehicle.type === 'MOTORCYCLE' && (
          <Text style={s.text}>
            {trip.providesHelmet
              ? 'El conductor proporciona casco.'
              : 'Lleva tu propio casco.'}
          </Text>
        )}
        {trip.recommendation?.type === 'POTENTIAL' && (
          <Text style={s.text}>
            La ruta pasa cerca de tu zona habitual. El conductor debe aceptar
            una nueva recogida antes de que puedas elegir ese punto.
          </Text>
        )}
        {confirmed && (
          <Link href="/my-reservations" style={s.link}>
            Ver mi participación confirmada
          </Link>
        )}
        {trip.isDriver && (
          <Link href="/my-trips" style={s.link}>
            Gestionar mi viaje
          </Link>
        )}
        {(trip.isDriver || confirmed) &&
          (trip.status === 'PROGRAMADO' || trip.status === 'EN_CURSO') && (
            <Link
              href={{ pathname: '/chat/[tripId]', params: { tripId: trip.id } }}
              style={s.link}
            >
              Chat del viaje
            </Link>
          )}
        {!trip.isDriver &&
          !confirmed &&
          !trip.acceptsParticipation &&
          !trip.acceptsPickupProposal && (
            <Text style={s.text}>
              {trip.status === 'PROGRAMADO' && !hasSeats
                ? 'Este viaje se llenó.'
                : 'Este viaje ya no admite participaciones.'}
            </Text>
          )}
      </View>
      <RoutePreview {...trip.itinerary} departureAt={trip.departureAt} />
      {canParticipate && trip.match && (
        <ReserveTrip
          trip={trip}
          groupCapacity={trip.offeredSeats}
          onConfirmed={() => setConfirmation(true)}
        />
      )}
      {(confirmed || trip.isDriver) && (
        <Link
          href={{
            pathname: '/trip-operation/[tripId]',
            params: { tripId: trip.id },
          }}
          style={s.link}
        >
          Seguimiento y resumen
        </Link>
      )}
      {!confirmed && trip.acceptsPickupProposal && (
        <PickupProposalForm trip={trip} />
      )}
    </>
  );
}

export function TripDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const trip = useQuery({
    queryKey: ['trip-detail', id, user?.id],
    enabled: !!id && !!user?.capabilities.passenger,
    queryFn: () => api<TripDetail>(`/trips/${id}`),
    refetchInterval: 15000,
  });
  const participation = useQuery({
    queryKey: ['my-reservations', user?.id],
    enabled: !!user?.capabilities.passenger,
    queryFn: () => api<ReservationView[]>('/reservations/my'),
  });
  return (
    <ProtectedPage title="Detalle del viaje">
      <Link href="/available-trips" style={s.link}>
        Volver a viajes disponibles
      </Link>
      {trip.isPending && <Text style={s.text}>Cargando viaje…</Text>}
      {trip.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {trip.error.message}
        </Text>
      )}
      {trip.data && (
        <DetailContent
          key={trip.data.id}
          trip={trip.data}
          existing={
            !!participation.data?.some(
              (item) => item.tripId === id && item.status === 'CONFIRMED',
            )
          }
        />
      )}
    </ProtectedPage>
  );
}
