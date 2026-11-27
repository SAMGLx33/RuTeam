import { PassengerBoardingPass } from '../boarding/boarding-pass';
import { Link, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { TripOperation, TripSummary } from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { TripEnvironment } from '../mobility/environment-panel';
import { TripLocation } from '../safety/trip-location';
import { TripSafetyLink } from '../safety/trip-safety-link';
import { TripCard } from './my-trips-screen';
import { RoutePreview, travelTime, tripStatusLabel } from './route-preview';

export function TripOperationScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useSession();
  const operation = useQuery({
    queryKey: ['trip-operation', user?.id, tripId],
    enabled: !!user?.capabilities.passenger && !!tripId,
    queryFn: () => api<TripOperation>('/trips/' + tripId + '/operation'),
    refetchInterval: 15000,
  });
  const row = operation.data;
  const mine = useQuery({
    queryKey: ['my-trips', user?.id],
    enabled: row?.role === 'DRIVER',
    queryFn: () => api<TripSummary[]>('/trips/my'),
    refetchInterval: 15000,
  });
  const ownerTrip = mine.data?.find(({ id }) => id === tripId);
  const active = row?.status === 'EN_CURSO';
  const complete = row?.status === 'COMPLETADO';
  const passenger = row?.participation;
  const participated =
    passenger?.status === 'CONFIRMED' &&
    !!passenger.boardedAt &&
    !passenger.noShowAt;
  const admitted = passenger?.status === 'CONFIRMED' && !passenger.noShowAt;
  return (
    <ProtectedPage title="Seguimiento y resumen del viaje">
      {operation.isPending && <Text>Cargando viaje…</Text>}
      {operation.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {operation.error.message}
        </Text>
      )}
      {row && !operation.error && (
        <>
          <View style={s.section}>
            <Text style={s.title}>Viaje {tripStatusLabel[row.status]}</Text>
            <Text style={s.text}>
              Salida programada · {travelTime(row.departureAt)}
            </Text>
            {row.startedAt && (
              <Text style={s.text}>
                Inicio registrado · {travelTime(row.startedAt)}
              </Text>
            )}
            {row.finishedAt && (
              <Text style={s.text}>
                Cierre registrado · {travelTime(row.finishedAt)}
              </Text>
            )}
            <Text style={s.text}>
              {row.driver ?? 'Conductor'} · {row.vehicle.brand} ·{' '}
              {row.vehicle.color} · {row.vehicle.plate}
            </Text>
            {active && (
              <>
                <Text style={s.text}>
                  Paradas registradas · {row.progress.reached}/
                  {row.progress.total}
                </Text>
                {row.progress.current && (
                  <Text style={s.text}>
                    Última parada · {row.progress.current.label}
                  </Text>
                )}
                {row.progress.next && (
                  <Text style={s.text}>
                    Próxima parada · {row.progress.next.label}
                  </Text>
                )}
              </>
            )}
            {passenger && (
              <>
                <Text style={s.text}>
                  Participación ·{' '}
                  {passenger.noShowAt
                    ? 'Ausencia registrada'
                    : passenger.boardedAt
                      ? 'Abordaje registrado'
                      : passenger.status === 'CONFIRMED'
                        ? 'Confirmada'
                        : passenger.status === 'CANCELLED'
                          ? 'Cancelada'
                          : 'Sin confirmación'}
                </Text>
                {passenger.pickup && (
                  <Text style={s.text}>
                    Recogida · {passenger.pickup.label}
                  </Text>
                )}
                {passenger.dropoff && (
                  <Text style={s.text}>
                    Descenso previsto · {passenger.dropoff.label}
                  </Text>
                )}
                {passenger.pickupEstimatedAt &&
                  !passenger.boardedAt &&
                  admitted &&
                  (row.status === 'PROGRAMADO' || active) && (
                    <Text style={s.text}>
                      Hora estimada de recogida ·{' '}
                      {travelTime(passenger.pickupEstimatedAt)}
                    </Text>
                  )}
              </>
            )}
            {row.manifest && (active || row.status === 'PROGRAMADO') && (
              <>
                <Text style={s.text}>
                  Realiza las acciones con el vehículo detenido en un lugar
                  seguro.
                </Text>
                <Text style={s.text}>
                  Por abordar en esta parada · {row.manifest.awaitingHere}
                </Text>
                <Text style={s.text}>
                  Pendientes en otras paradas · {row.manifest.awaitingLater}
                </Text>
                <Text style={s.text}>
                  Abordaron · {row.manifest.boarded} · Ausencias ·{' '}
                  {row.manifest.noShows}
                </Text>
                {!!row.manifest.pendingProposals && (
                  <Text style={s.text}>
                    Propuestas por revisar · {row.manifest.pendingProposals}
                  </Text>
                )}
              </>
            )}
            {row.role === 'PASSENGER' && row.itinerary && (
              <RoutePreview {...row.itinerary} />
            )}
          </View>
          {ownerTrip && !complete && <TripCard trip={ownerTrip} operation />}
          {mine.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {mine.error.message}
            </Text>
          )}
          {active && user && (row.role === 'DRIVER' || admitted) && (
            <TripLocation userId={user.id} tripId={tripId} />
          )}
          {active && admitted && <TripSafetyLink tripId={tripId} />}
          {(row.status === 'PROGRAMADO' || active) &&
            (admitted || row.role === 'DRIVER') && (
              <Link
                href={{ pathname: '/chat/[tripId]', params: { tripId } }}
                style={s.link}
              >
                Chat del viaje
              </Link>
            )}
          {passenger?.canIssuePass && (
            <PassengerBoardingPass reservationId={passenger.id} />
          )}
          {complete && (participated || row.role === 'DRIVER') && (
            <>
              <TripEnvironment tripId={tripId} />
              <Link
                href={{ pathname: '/ratings/[tripId]', params: { tripId } }}
                style={s.link}
              >
                Calificar
              </Link>
              {participated && passenger && (
                <Link
                  href={{
                    pathname: '/compensations/[id]',
                    params: { id: passenger.id },
                  }}
                  style={s.link}
                >
                  Consultar compensación voluntaria
                </Link>
              )}
              <Link
                href={{
                  pathname: '/economic-history',
                  params: { tripId, role: row.role },
                }}
                style={s.link}
              >
                Historial económico de este viaje
              </Link>
              <Link href="/mobility-statistics" style={s.link}>
                Mis estadísticas
              </Link>
            </>
          )}
          {(active || complete || row.status === 'INTERRUMPIDO') &&
            (row.role === 'DRIVER' || participated) && (
              <Link
                href={{ pathname: '/incidents/[tripId]', params: { tripId } }}
                style={s.link}
              >
                Registrar incidencia privada
              </Link>
            )}
          <Link
            href={row.role === 'DRIVER' ? '/my-trips' : '/my-reservations'}
            style={s.link}
          >
            Ver mi historial de viajes
          </Link>
        </>
      )}
    </ProtectedPage>
  );
}
