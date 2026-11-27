import { EconomicTerms } from '../expenses/economic-terms';
import { ReputationLabel } from '../ratings/reputation-label';
import { TripSafetyLink } from '../safety/trip-safety-link';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ReservationView,
  CancellationReason,
  TripAction,
  TripSummary,
  TripEditInput,
  TripOperation,
} from '@ruteam/contracts';
import { ApiError, api } from '../../services/api/client';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { ReservationSummary } from './reservations-screen';
import { RoutePreview, travelTime, tripStatusLabel } from './route-preview';
import { DriverBoardingScanner } from '../boarding/boarding-pass';
import { Choice } from './itinerary-form';
import { cancellationLabel, CancellationReasons } from './cancellation-reasons';
import { DriverPickupProposals } from './pickup-proposals';

function DuplicateTrip({ trip }: { trip: TripSummary }) {
  const { user } = useSession();
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [departure, setDeparture] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      api<TripSummary>('/trips/' + trip.id + '/duplicate', {
        method: 'POST',
        body: { departureAt: departure.replace(' ', 'T') + ':00-05:00' },
      }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['my-trips'] }),
  });
  if (!user?.capabilities.driver || !trip.itinerary) return null;
  return open ? (
    <View style={s.section}>
      <Text style={s.text}>
        Elige otra salida. El recorrido y las condiciones se reutilizan para una
        publicación independiente.
      </Text>
      <TextInput
        accessibilityLabel="Nueva salida Colombia (AAAA-MM-DD HH:mm)"
        placeholder="AAAA-MM-DD HH:mm"
        value={departure}
        onChangeText={setDeparture}
        style={{ minHeight: 48, borderWidth: 1, borderRadius: 8, padding: 10 }}
      />
      <Button
        title="Publicar copia"
        disabled={
          mutation.isPending ||
          !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(departure)
        }
        onPress={() => mutation.mutate()}
      />
      <Button
        title="Cerrar duplicación"
        secondary
        disabled={mutation.isPending}
        onPress={() => setOpen(false)}
      />
      {mutation.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {mutation.error.message}
        </Text>
      )}
      {mutation.isSuccess && (
        <Text accessibilityLiveRegion="polite">Copia publicada.</Text>
      )}
    </View>
  ) : (
    <Button title="Duplicar viaje" secondary onPress={() => setOpen(true)} />
  );
}

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
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: 'board' | 'no-show' | 'drop-off';
    }) =>
      api<ReservationView>(`/participations/${id}/${action}`, {
        method: 'POST',
      }),
    onSuccess: () => {
      setConfirmAbsence(null);
      void client.invalidateQueries({ queryKey });
      void client.invalidateQueries({ queryKey: ['my-reservations'] });
      void client.invalidateQueries({ queryKey: ['trip-operation'] });
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
      {!trip.expiredAt &&
        requests.data?.some(
          (item) =>
            item.status === 'CONFIRMED' &&
            item.quantity === 1 &&
            !item.boardedAt &&
            !item.noShowAt &&
            item.pickup.id === pickup?.id &&
            (item.tripStatus === 'PROGRAMADO' ||
              item.tripStatus === 'EN_CURSO'),
        ) && <DriverBoardingScanner tripId={trip.id} />}
      {requests.data?.map((item) => (
        <View key={item.id} style={s.section}>
          <Text style={s.text}>
            {item.requesterName ?? 'Estudiante RuTeam'}
          </Text>
          <ReservationSummary item={item} />
          {item.tripStatus === 'COMPLETADO' &&
            item.boardedAt &&
            !item.noShowAt &&
            item.quantity === 1 &&
            !!item.economics?.suggestedContributionCop && (
              <Link
                href={{
                  pathname: '/compensations/[id]',
                  params: { id: item.id },
                }}
                style={s.link}
              >
                Ver compensación
              </Link>
            )}
          {item.passengerReputation && (
            <ReputationLabel summary={item.passengerReputation} />
          )}
          {item.tripStatus === 'EN_CURSO' &&
            item.stage === 'ABOARD' &&
            item.quantity === 1 &&
            item.dropoff.id === pickup?.id && (
              <Button
                title="Registrar descenso"
                disabled={recordPresence.isPending}
                onPress={() =>
                  recordPresence.mutate({ id: item.id, action: 'drop-off' })
                }
              />
            )}
          {!trip.expiredAt &&
            item.status === 'CONFIRMED' &&
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

function ScheduledActions({ trip }: { trip: TripSummary }) {
  const client = useQueryClient();
  const [editing, setEditing] = useState<'description' | 'delay'>();
  const [draftVersion, setDraftVersion] = useState<number>();
  const [description, setDescription] = useState(
    trip.itinerary?.description ?? '',
  );
  const [estimate, setEstimate] = useState('');
  const validEstimate = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(estimate);
  const update = useMutation({
    mutationFn: () => {
      if (editing === 'delay')
        return api('/trips/' + trip.id + '/delay', {
          method: 'POST',
          body: {
            estimatedDepartureAt: estimate.replace(' ', 'T') + ':00-05:00',
          },
        });
      if (draftVersion === undefined)
        throw new Error('Vuelve a cargar la publicación.');
      const body: TripEditInput = {
        version: draftVersion,
        description: description.trim(),
      };
      return api('/trips/' + trip.id, { method: 'PATCH', body });
    },
    onSuccess: () => {
      setEditing(undefined);
      for (const key of [
        'my-trips',
        'trip-operation',
        'trip-detail',
        'agenda',
        'saved-trips',
        'available-trips',
        'trip-feed',
      ])
        void client.invalidateQueries({ queryKey: [key] });
    },
  });
  if (trip.expiredAt) return null;
  return (
    <View style={s.section}>
      {trip.canEdit &&
        trip.itinerary &&
        (trip.descriptiveEditsOnly ? (
          <Button
            title="Editar descripción"
            secondary
            onPress={() => {
              update.reset();
              setDescription(trip.itinerary?.description ?? '');
              setDraftVersion(trip.version);
              setEditing('description');
            }}
          />
        ) : (
          <Link
            href={{ pathname: '/publish', params: { editTripId: trip.id } }}
            style={s.link}
          >
            Editar publicación
          </Link>
        ))}
      <Button
        title="Informar demora"
        secondary
        onPress={() => {
          update.reset();
          setEditing('delay');
        }}
      />
      {editing && (
        <>
          {editing === 'delay' && (
            <Text style={s.text}>
              La nueva estimación se comparte con los participantes. La hora
              publicada se conserva.
            </Text>
          )}
          <TextInput
            accessibilityLabel={
              editing === 'delay'
                ? 'Nueva salida estimada en Colombia'
                : 'Descripción del recorrido'
            }
            placeholder={editing === 'delay' ? 'AAAA-MM-DD HH:mm' : undefined}
            value={editing === 'delay' ? estimate : description}
            onChangeText={editing === 'delay' ? setEstimate : setDescription}
            maxLength={editing === 'delay' ? 16 : 240}
            style={{
              minHeight: 48,
              borderWidth: 1,
              borderRadius: 8,
              padding: 10,
            }}
          />
          <Button
            title={
              editing === 'delay' ? 'Guardar demora' : 'Guardar descripción'
            }
            disabled={
              update.isPending ||
              (editing === 'delay'
                ? !validEstimate
                : description.trim().length < 2)
            }
            onPress={() => update.mutate()}
          />
          <Button
            title="Volver"
            secondary
            disabled={update.isPending}
            onPress={() => setEditing(undefined)}
          />
        </>
      )}
      {update.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {update.error.message}
        </Text>
      )}
      {update.isSuccess && (
        <Text accessibilityLiveRegion="polite">Cambio guardado.</Text>
      )}
    </View>
  );
}

export function TripCard({
  trip,
  operation = false,
}: {
  trip: TripSummary;
  operation?: boolean;
}) {
  const client = useQueryClient();
  const [expanded, setExpanded] = useState(operation);
  const { user } = useSession();
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [interrupt, setInterrupt] = useState(false);
  const [safe, setSafe] = useState(false);
  const [reason, setReason] =
    useState<Exclude<CancellationReason, 'ACCOUNT_CLOSED'>>();
  const stops = trip.itinerary?.stops ?? [];
  const currentStop = [...stops].reverse().find((stop) => stop.reachedAt);
  const nextStop = stops.find((stop) => !stop.reachedAt);
  const manifest = useQuery({
    queryKey: ['trip-operation', user?.id, trip.id],
    enabled: trip.status === 'EN_CURSO' && !!user,
    queryFn: () => api<TripOperation>('/trips/' + trip.id + '/operation'),
  });
  const markArrival = useMutation({
    mutationFn: (stopId: string) =>
      api(`/trips/${trip.id}/stops/${stopId}/reach`, { method: 'POST' }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['my-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-operation'] });
      void client.invalidateQueries({ queryKey: ['trip-detail', trip.id] });
    },
  });
  const change = useMutation({
    mutationFn: (action: TripAction) =>
      api(`/trips/${trip.id}/transition`, {
        method: 'POST',
        body: {
          action,
          reason:
            action === 'CANCEL' || action === 'INTERRUPT' ? reason : undefined,
          confirmMissingDropoffs:
            action === 'FINISH' && confirmFinish ? true : undefined,
          confirmedSafe: action === 'INTERRUPT' ? safe : undefined,
        },
      }),
    onError: (error) => {
      if (
        error instanceof ApiError &&
        error.code === 'TRIP_CLOSE_REQUIRES_CONFIRMATION'
      )
        setConfirmFinish(true);
    },
    onSuccess: () => {
      setConfirmCancel(false);
      setConfirmFinish(false);
      setInterrupt(false);
      setSafe(false);
      setReason(undefined);
      void client.invalidateQueries({ queryKey: ['my-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-operation'] });
      void client.invalidateQueries({
        queryKey: ['driver-participations', trip.id],
      });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
    },
  });
  return (
    <View style={s.section} testID={`driver-trip-${trip.id}`}>
      <Text style={s.title}>
        {trip.origin.label} → {trip.destination.name}
      </Text>
      <Text style={s.text}>{travelTime(trip.departureAt)}</Text>
      {trip.estimatedDepartureAt && (
        <Text style={s.text}>
          Nueva estimación · {travelTime(trip.estimatedDepartureAt)}
        </Text>
      )}
      {trip.expiredAt && <Text style={s.text}>Vencido sin iniciar</Text>}
      {trip.status === 'PROGRAMADO' && <ScheduledActions trip={trip} />}
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
      {trip.terminationReason && (
        <Text style={s.text}>
          Motivo · {cancellationLabel[trip.terminationReason]}
        </Text>
      )}
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
      <EconomicTerms terms={trip.economics} />
      {expanded && <DuplicateTrip trip={trip} />}
      {expanded && trip.itinerary && (
        <Link
          href={{ pathname: '/publish', params: { sourceTripId: trip.id } }}
          style={s.link}
        >
          Revisar y reutilizar publicación
        </Link>
      )}
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
      {change.error &&
        !(
          confirmFinish &&
          change.error instanceof ApiError &&
          change.error.code === 'TRIP_CLOSE_REQUIRES_CONFIRMATION'
        ) && (
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
            disabled={change.isPending || !!trip.expiredAt}
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
          <CancellationReasons reason={reason} choose={setReason} asDriver />
          <Button
            title="Confirmar cancelación del viaje"
            disabled={change.isPending}
            onPress={() => change.mutate('CANCEL')}
          />
          <Button
            title="Conservar viaje"
            secondary
            disabled={change.isPending}
            onPress={() => {
              setConfirmCancel(false);
              setReason(undefined);
            }}
          />
        </>
      )}
      {(trip.status === 'COMPLETADO' || trip.status === 'INTERRUMPIDO') && (
        <Link
          href={{
            pathname: '/incidents/[tripId]',
            params: { tripId: trip.id },
          }}
          style={s.link}
        >
          Incidencias privadas
        </Link>
      )}
      {trip.status === 'COMPLETADO' && (
        <Link
          href={{ pathname: '/ratings/[tripId]', params: { tripId: trip.id } }}
          style={s.link}
        >
          Calificar participantes
        </Link>
      )}
      {trip.status === 'EN_CURSO' &&
        (interrupt ? (
          <View style={s.section}>
            <Text style={s.title}>Interrumpir el viaje</Text>
            <Text style={s.text}>
              Detén el vehículo en un lugar seguro. Informa a las personas a
              bordo y coordina su descenso antes de confirmar.
            </Text>
            <CancellationReasons reason={reason} choose={setReason} asDriver />
            <Choice
              label="El vehículo está detenido y coordiné el descenso seguro"
              checkbox
              checked={safe}
              onPress={() => setSafe(!safe)}
            />
            <Button
              title="Confirmar interrupción"
              disabled={!reason || !safe || change.isPending}
              onPress={() => change.mutate('INTERRUPT')}
            />
            <Button
              title="Volver al viaje activo"
              secondary
              disabled={change.isPending}
              onPress={() => {
                setInterrupt(false);
                setSafe(false);
                setReason(undefined);
              }}
            />
          </View>
        ) : (
          <Button
            title="Interrumpir viaje"
            secondary
            disabled={change.isPending}
            onPress={() => setInterrupt(true)}
          />
        ))}
      {trip.status === 'EN_CURSO' && <TripSafetyLink tripId={trip.id} />}
      {!operation && (
        <Link
          href={{
            pathname: '/trip-operation/[tripId]',
            params: { tripId: trip.id },
          }}
          style={s.link}
        >
          Operación y resumen del viaje
        </Link>
      )}
      {trip.status === 'EN_CURSO' && !interrupt && (
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
          {manifest.error && (
            <Text accessibilityRole="alert" style={s.error}>
              {manifest.error.message}
            </Text>
          )}
          {confirmFinish ? (
            <View style={s.section}>
              <Text style={s.text}>
                Hay pasajeros sin descenso registrado. Si cierras el viaje, esos
                descensos quedarán sin confirmar.
              </Text>
              <Button
                title="Finalizar sin registrar descensos"
                disabled={change.isPending}
                onPress={() => change.mutate('FINISH')}
              />
              <Button
                title="Volver"
                secondary
                disabled={change.isPending}
                onPress={() => {
                  change.reset();
                  setConfirmFinish(false);
                }}
              />
            </View>
          ) : (
            <Button
              title="Finalizar viaje"
              secondary
              disabled={
                change.isPending ||
                markArrival.isPending ||
                manifest.isPending ||
                !!manifest.error
              }
              onPress={() =>
                manifest.data?.manifest?.aboard
                  ? setConfirmFinish(true)
                  : change.mutate('FINISH')
              }
            />
          )}
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
    refetchInterval: 30000,
  });
  return (
    <ProtectedPage title="Mis viajes publicados" requires="driverAccess">
      {user?.capabilities.driver && (
        <Link href="/publish" style={s.link}>
          Publicar otro viaje
        </Link>
      )}
      <Link
        href={{ pathname: '/economic-history', params: { role: 'DRIVER' } }}
        style={s.link}
      >
        Historial económico de mis viajes
      </Link>
      <Link href="/recurring-trips" style={s.link}>
        Viajes recurrentes
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
