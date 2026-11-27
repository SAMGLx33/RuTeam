import { useState } from 'react';
import { cancellationLabel, CancellationReasons } from './cancellation-reasons';
import { Text, View } from 'react-native';
import { EconomicTerms } from '../expenses/economic-terms';
import { TripSafetyLink } from '../safety/trip-safety-link';
import { Link } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CancellationReason,
  ReservationStatus,
  ReservationView,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { PassengerBoardingPass } from '../boarding/boarding-pass';
import { travelTime, tripStatusLabel } from './route-preview';

const statusLabel: Record<ReservationStatus, string> = {
  PENDING: 'Solicitud histórica pendiente (no confirmada)',
  CONFIRMED: 'Confirmada',
  REJECTED: 'Solicitud histórica rechazada',
  CANCELLED: 'Cancelada',
};
function participationLabel(item: ReservationView): string {
  if (item.status !== 'CONFIRMED') return statusLabel[item.status];
  if (item.noShowAt) return 'Ausencia registrada';
  if (item.tripStatus === 'COMPLETADO')
    return item.boardedAt ? 'Completada' : 'Sin abordaje registrado';
  return item.boardedAt ? 'Abordada' : statusLabel[item.status];
}

export function ReservationSummary({ item }: { item: ReservationView }) {
  return (
    <>
      <Text style={s.title}>
        {item.pickup.label} → {item.dropoff.label}
      </Text>
      <Text style={s.text}>
        {travelTime(item.departureAt)} · {item.quantity}{' '}
        {item.quantity === 1 ? 'plaza' : 'plazas'}
      </Text>
      {item.isRequester && (
        <Text style={s.text}>
          Conduce {item.driverName ?? 'un estudiante'} · {item.vehicle.brand}{' '}
          {item.vehicle.color.toLowerCase()}
        </Text>
      )}
      <Text style={s.text}>
        {participationLabel(item)} · Viaje {tripStatusLabel[item.tripStatus]}
      </Text>
      <Text style={s.text}>
        Encuentro · {item.pickup.label}
        {item.pickup.instructions ? ` · ${item.pickup.instructions}` : ''}
      </Text>
      <Text style={s.text}>
        Descenso · {item.dropoff.label}
        {item.dropoff.instructions ? ` · ${item.dropoff.instructions}` : ''}
      </Text>
    </>
  );
}

export function ReservationsScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const [withdrawing, setWithdrawing] = useState<string>();
  const [reason, setReason] =
    useState<Exclude<CancellationReason, 'ACCOUNT_CLOSED'>>();
  const list = useQuery({
    queryKey: ['my-reservations', user?.id],
    queryFn: () => api<ReservationView[]>('/reservations/my'),
    enabled: !!user?.capabilities.passenger,
    refetchInterval: 30000,
  });
  const cancel = useMutation({
    mutationFn: (id: string) =>
      api<ReservationView>(`/participations/${id}/cancel`, {
        method: 'POST',
        body: { reason },
      }),
    onSuccess: (item) => {
      setWithdrawing(undefined);
      setReason(undefined);
      void client.invalidateQueries({ queryKey: ['my-reservations'] });
      void client.invalidateQueries({ queryKey: ['available-trips'] });
      void client.invalidateQueries({ queryKey: ['trip-feed'] });
      void client.invalidateQueries({ queryKey: ['trip-detail', item.tripId] });
    },
  });
  return (
    <ProtectedPage title="Mis participaciones">
      <Link href="/economic-history" style={s.link}>
        Historial económico de mis participaciones
      </Link>
      <Link href="/search-trips" style={s.link}>
        Buscar viajes
      </Link>
      <Link href="/groups" style={s.link}>
        Mis grupos
      </Link>
      <Text style={s.text}>
        Aquí puedes consultar tu plaza individual o confirmada en grupo.
        Retirarte de un viaje futuro antes de abordar libera la plaza y conserva
        tu historial.
      </Text>
      {list.isPending && <Text>Consultando tus participaciones…</Text>}
      {list.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {list.error.message}
        </Text>
      )}
      {cancel.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {cancel.error.message}
        </Text>
      )}
      {list.data?.length === 0 && <Text>Aún no tienes participaciones.</Text>}
      {list.data?.map((item) => (
        <View key={item.id} style={s.section}>
          <ReservationSummary item={item} />
          <Link
            href={{
              pathname: '/trip-operation/[tripId]',
              params: { tripId: item.tripId },
            }}
            style={s.link}
          >
            Seguimiento y resumen
          </Link>
          {item.withdrawalReason && (
            <Text style={s.text}>
              Motivo · {cancellationLabel[item.withdrawalReason]}
            </Text>
          )}
          <EconomicTerms terms={item.economics} />
          {(item.tripStatus === 'COMPLETADO' ||
            item.tripStatus === 'INTERRUMPIDO') &&
            item.boardedAt &&
            !item.noShowAt && (
              <>
                <Link
                  href={{
                    pathname: '/incidents/[tripId]',
                    params: { tripId: item.tripId },
                  }}
                  style={s.link}
                >
                  Incidencias privadas
                </Link>
                {!!item.economics?.suggestedContributionCop &&
                  item.isRequester &&
                  item.quantity === 1 && (
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
              </>
            )}
          {item.tripStatus === 'EN_CURSO' &&
            item.status === 'CONFIRMED' &&
            !item.noShowAt && <TripSafetyLink tripId={item.tripId} />}
          {item.tripStatus === 'COMPLETADO' &&
            item.status === 'CONFIRMED' &&
            item.boardedAt &&
            !item.noShowAt && (
              <Link
                href={{
                  pathname: '/ratings/[tripId]',
                  params: { tripId: item.tripId },
                }}
                style={s.link}
              >
                Calificar al conductor
              </Link>
            )}
          {item.isRequester &&
            item.status === 'CONFIRMED' &&
            item.quantity === 1 &&
            !item.boardedAt &&
            !item.noShowAt &&
            (item.tripStatus === 'PROGRAMADO' ||
              item.tripStatus === 'EN_CURSO') && (
              <PassengerBoardingPass reservationId={item.id} />
            )}
          {item.canCancel &&
            (withdrawing === item.id ? (
              <>
                <CancellationReasons reason={reason} choose={setReason} />
                <Button
                  title="Confirmar retiro"
                  disabled={cancel.isPending}
                  onPress={() => cancel.mutate(item.id)}
                />
                <Button
                  title="Conservar mi plaza"
                  secondary
                  disabled={cancel.isPending}
                  onPress={() => {
                    setWithdrawing(undefined);
                    setReason(undefined);
                  }}
                />
              </>
            ) : (
              <Button
                title={
                  item.status === 'PENDING'
                    ? 'Retirar solicitud histórica'
                    : 'Cancelar participación'
                }
                secondary
                disabled={cancel.isPending}
                onPress={() => {
                  setWithdrawing(item.id);
                  setReason(undefined);
                }}
              />
            ))}
        </View>
      ))}
    </ProtectedPage>
  );
}
