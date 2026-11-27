import { SavedTripActions } from '../mobility/saved-trips-screen';
import { cancellationLabel } from './cancellation-reasons';
import { EconomicTerms } from '../expenses/economic-terms';
import { ReputationLabel } from '../ratings/reputation-label';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import type { ReservationView, TripDetail } from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Link, Text, View } from '../../theme/primitives';
import { EconomicTerms } from '../expenses/economic-terms';
import { ReputationLabel } from '../ratings/reputation-label';
import { cancellationLabel } from './cancellation-reasons';
import { PickupProposalForm } from './pickup-proposals';
import { PublicStopDirections } from './public-stop-directions';
import { RoutePreview, travelTime } from './route-preview';
import { ReserveTrip } from './search-trips-screen';
import { directionLabel } from './trip-feed';
import {
  TripColumns,
  TripSectionTitle,
  TripStatus,
  tripSurfaceStyles as ui,
} from './trip-surface';

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
    <TripColumns
      main={<RoutePreview {...trip.itinerary} departureAt={trip.departureAt} />}
      side={
        <>
          <View style={ui.panel} testID="trip-detail-summary">
            <View style={ui.row}>
              <TripStatus status={trip.status} />
              <Text style={s.text}>
                {direction ? directionLabel[direction] : 'Viaje compartido'}
              </Text>
            </View>
            <TripSectionTitle>
              {first?.label ?? 'Origen'} → {last?.label ?? 'Destino'}
            </TripSectionTitle>
            <View style={ui.facts}>
              <Text style={s.text}>
                {travelTime(trip.departureAt)} · {trip.estimatedDurationMinutes}{' '}
                min estimados
              </Text>
              <Text style={s.text}>
                Conduce {trip.driverName ?? 'un estudiante'} ·{' '}
                {trip.vehicle.brand} {trip.vehicle.color.toLowerCase()}
              </Text>
              <ReputationLabel summary={trip.driverReputation} />
              {trip.terminationReason && (
                <Text style={s.text}>
                  Motivo · {cancellationLabel[trip.terminationReason]}
                </Text>
              )}
            </View>
            <View style={ui.subdued}>
              <Text style={[s.text, ui.emphasized]}>
                {trip.availableSeats}{' '}
                {trip.availableSeats === 1
                  ? 'plaza disponible'
                  : 'plazas disponibles'}
              </Text>
              <EconomicTerms terms={trip.economics} />
            </View>
            {(trip.rules.length > 0 ||
              (trip.providesHelmet !== null &&
                trip.vehicle.type === 'MOTORCYCLE')) && (
              <View style={[ui.facts, ui.separated]}>
                {trip.rules.map(({ id, description }) => (
                  <Text key={id} style={s.text}>
                    {description}
                  </Text>
                ))}
                {trip.providesHelmet !== null &&
                  trip.vehicle.type === 'MOTORCYCLE' && (
                    <Text style={s.text}>
                      {trip.providesHelmet
                        ? 'El conductor proporciona casco.'
                        : 'Lleva tu propio casco.'}
                    </Text>
                  )}
              </View>
            )}
            {trip.recommendation?.type === 'POTENTIAL' && (
              <Text style={s.text}>
                La ruta pasa cerca de tu zona habitual. El conductor debe
                aceptar una nueva recogida antes de que puedas elegir ese punto.
              </Text>
            )}
            {(confirmed || trip.isDriver) && (
              <View style={ui.separated}>
                <Link
                  href={{
                    pathname: '/trip-operation/[tripId]',
                    params: { tripId: trip.id },
                  }}
                  style={s.link}
                >
                  Seguimiento y resumen
                </Link>
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
                {(trip.status === 'PROGRAMADO' ||
                  trip.status === 'EN_CURSO') && (
                  <Link
                    href={{
                      pathname: '/chat/[tripId]',
                      params: { tripId: trip.id },
                    }}
                    style={s.link}
                  >
                    Chat del viaje
                  </Link>
                )}
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
              </View>
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
          {canParticipate && trip.match && (
            <ReserveTrip
              trip={trip}
              groupCapacity={trip.offeredSeats}
              onConfirmed={() => setConfirmation(true)}
            />
          )}
          {!confirmed && trip.acceptsPickupProposal && (
            <PickupProposalForm trip={trip} />
          )}
          {direction && trip.status === 'PROGRAMADO' && (
            <PublicStopDirections stops={trip.itinerary.stops} />
          )}
        </>
      }
    />
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
      <Link href="/saved-trips" style={s.link}>
        Mis viajes guardados
      </Link>
      {trip.data && !trip.data.isDriver && (
        <SavedTripActions
          tripId={trip.data.id}
          canSave={!!trip.data.canSaveInterest}
        />
      )}
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
