import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { StyleSheet } from 'react-native';
import type { TripOperation, TripSummary } from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Link, Text, View } from '../../theme/primitives';
import { colors } from '../../theme/tokens';
import { PassengerBoardingPass } from '../boarding/boarding-pass';
import { TripEnvironment } from '../mobility/environment-panel';
import { TripLocation } from '../safety/trip-location';
import { TripSafetyLink } from '../safety/trip-safety-link';
import { participationLabel } from './reservations-screen';
import { TripCard } from './my-trips-screen';
import { PublicStopDirections } from './public-stop-directions';
import { RoutePreview, travelTime } from './route-preview';
import {
  TripColumns,
  TripSectionTitle,
  TripStatus,
  tripSurfaceStyles as ui,
} from './trip-surface';

function OperationSummary({
  row,
  tripId,
}: {
  row: TripOperation;
  tripId: string;
}) {
  const active = row.status === 'EN_CURSO';
  const inProgress =
    active || (row.status === 'PROGRAMADO' && row.departureState !== 'EXPIRED');
  const passenger = row.participation;
  const admitted = passenger?.status === 'CONFIRMED' && !passenger.noShowAt;
  const driver = row.role === 'DRIVER';
  const progress = row.progress.total
    ? Math.min(row.progress.reached / row.progress.total, 1)
    : 0;

  return (
    <View style={ui.panel} testID="trip-operation-summary">
      <TripStatus status={row.status} />
      <View style={ui.facts}>
        <Text style={s.text}>
          Salida programada · {travelTime(row.departureAt)}
        </Text>
        {row.departureState === 'SOON' && (
          <Text style={s.text}>Salida próxima</Text>
        )}
        {row.departureState === 'DELAYED' && (
          <Text style={s.text}>Salida retrasada</Text>
        )}
        {row.estimatedDepartureAt && (
          <Text style={s.text}>
            Nueva salida estimada · {travelTime(row.estimatedDepartureAt)}
          </Text>
        )}
        {row.departureState === 'EXPIRED' && (
          <Text style={s.text}>Vencido sin iniciar</Text>
        )}
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
      </View>
      {active && (
        <View style={ui.subdued}>
          {driver && (
            <Text style={s.text}>
              {row.trackingEnabled
                ? 'Compartición de ubicación habilitada'
                : 'Ubicación sin compartir'}
            </Text>
          )}
          <Text style={[s.text, ui.emphasized]}>
            Paradas registradas · {row.progress.reached}/{row.progress.total}
          </Text>
          <View style={styles.progress}>
            <View
              style={[styles.progressFill, { width: `${progress * 100}%` }]}
            />
          </View>
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
        </View>
      )}
      {passenger && (
        <View style={[ui.facts, ui.separated]}>
          <Text style={[s.text, ui.emphasized]}>
            Participación · {participationLabel(passenger)}
          </Text>
          {passenger.pickup && (
            <Text style={s.text}>Recogida · {passenger.pickup.label}</Text>
          )}
          {passenger.dropoff && (
            <Text style={s.text}>
              Descenso previsto · {passenger.dropoff.label}
            </Text>
          )}
          {passenger.droppedOffAt && (
            <Text style={s.text}>
              Descenso confirmado · {travelTime(passenger.droppedOffAt)}
            </Text>
          )}
          {passenger.dropoffEstimatedAt &&
            !passenger.droppedOffAt &&
            active &&
            admitted && (
              <Text style={s.text}>
                Hora estimada de descenso ·{' '}
                {travelTime(passenger.dropoffEstimatedAt)}
              </Text>
            )}
          {passenger.pickupEstimatedAt &&
            !passenger.boardedAt &&
            admitted &&
            inProgress && (
              <Text style={s.text}>
                Hora estimada de recogida ·{' '}
                {travelTime(passenger.pickupEstimatedAt)}
              </Text>
            )}
        </View>
      )}
      {row.manifest && inProgress && (
        <View style={[ui.facts, ui.separated]}>
          <Text style={[s.text, ui.emphasized]}>
            Realiza las acciones con el vehículo detenido en un lugar seguro.
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
          {active && (
            <>
              <Text style={s.text}>
                A bordo · {row.manifest.aboard} · Descensos registrados ·{' '}
                {row.manifest.droppedOff}
              </Text>
              <Text style={s.text}>
                Por descender en esta parada ·{' '}
                {row.manifest.awaitingDropoffHere}
              </Text>
            </>
          )}
          {!!row.manifest.pendingProposals && (
            <Text style={s.text}>
              Propuestas por revisar · {row.manifest.pendingProposals}
            </Text>
          )}
        </View>
      )}
      {inProgress && (admitted || driver) && (
        <Link
          href={{ pathname: '/chat/[tripId]', params: { tripId } }}
          style={s.link}
        >
          Chat del viaje
        </Link>
      )}
    </View>
  );
}

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
  const driver = row?.role === 'DRIVER';
  const active = row?.status === 'EN_CURSO';
  const complete = row?.status === 'COMPLETADO';
  const inProgress =
    active ||
    (row?.status === 'PROGRAMADO' && row.departureState !== 'EXPIRED');
  const passenger = row?.participation;
  const admitted = passenger?.status === 'CONFIRMED' && !passenger.noShowAt;
  const participated = admitted && !!passenger.boardedAt;
  const navigationStop = driver
    ? row.progress.next
    : admitted && !passenger.boardedAt
      ? passenger.pickup
      : null;
  const showLocation =
    active && user && (driver || (admitted && !passenger?.droppedOffAt));
  const showDriverMap = active && driver && !!user && !!row.itinerary;
  const showSafety = active && admitted;
  const showRecap = complete && (participated || driver);
  const showIncident =
    (active || complete || row?.status === 'INTERRUMPIDO') &&
    (driver || participated);

  return (
    <ProtectedPage title="Seguimiento y resumen del viaje">
      {operation.isPending && <Text style={s.text}>Cargando viaje…</Text>}
      {operation.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {operation.error.message}
        </Text>
      )}
      {row && !operation.error && (
        <>
          <TripColumns
            main={
              showDriverMap ? (
                <TripLocation
                  userId={user.id}
                  tripId={tripId}
                  navigation={row}
                />
              ) : row.itinerary ? (
                <RoutePreview
                  {...row.itinerary}
                  initiallyExpanded={false}
                  departureAt={
                    inProgress
                      ? (row.startedAt ??
                        row.estimatedDepartureAt ??
                        row.departureAt)
                      : undefined
                  }
                />
              ) : (
                <View style={ui.panel}>
                  <TripSectionTitle>Recorrido del conductor</TripSectionTitle>
                  <Text style={s.text}>
                    Recorrido no disponible para este viaje.
                  </Text>
                </View>
              )
            }
            side={
              <>
                <OperationSummary row={row} tripId={tripId} />
                {passenger?.canIssuePass && (
                  <PassengerBoardingPass reservationId={passenger.id} />
                )}
                {showSafety && <TripSafetyLink tripId={tripId} />}
                {inProgress && row.itinerary?.direction && navigationStop && (
                  <PublicStopDirections stops={[navigationStop]} />
                )}
              </>
            }
          />
          {ownerTrip && !complete && (
            <TripCard
              trip={ownerTrip}
              operation
              showRoutePreview={!row.itinerary}
            />
          )}
          {mine.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {mine.error.message}
            </Text>
          )}
          {showLocation && !showDriverMap && (
            <TripLocation userId={user.id} tripId={tripId} />
          )}
          {showRecap && <TripEnvironment tripId={tripId} />}
          <View style={ui.panel}>
            {showRecap && (
              <>
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
            {showIncident && (
              <Link
                href={{ pathname: '/incidents/[tripId]', params: { tripId } }}
                style={s.link}
              >
                Registrar incidencia privada
              </Link>
            )}
            <Link
              href={driver ? '/my-trips' : '/my-reservations'}
              style={s.link}
            >
              Ver mi historial de viajes
            </Link>
          </View>
        </>
      )}
    </ProtectedPage>
  );
}

const styles = StyleSheet.create({
  progress: {
    height: 5,
    overflow: 'hidden',
    backgroundColor: colors.border,
    borderRadius: 5,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 5,
  },
});
