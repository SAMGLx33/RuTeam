import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailableTrip,
  PickupProposalInput,
  PickupProposalView,
  TripSummary,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { MeetingMapPicker, type Coordinates } from './meeting-map-picker';

const labels: Record<PickupProposalView['status'], string> = {
  PENDING: 'Pendiente',
  ACCEPTED: 'Aceptada',
  REJECTED: 'Rechazada',
  EXPIRED: 'Expirada',
};

function usePickupProposals(tripId: string, enabled: boolean) {
  const { user } = useSession();
  const endpoint = `/trips/${tripId}/pickup-proposals`;
  const queryKey = ['pickup-proposals', tripId, user?.id];
  const client = useQueryClient();
  const proposals = useQuery({
    queryKey,
    queryFn: () => api<PickupProposalView[]>(endpoint),
    enabled: enabled && !!user,
  });
  const refresh = () => {
    void client.invalidateQueries({ queryKey });
    void client.invalidateQueries({ queryKey: ['available-trips'] });
    void client.invalidateQueries({ queryKey: ['my-trips'] });
  };
  return { endpoint, proposals, refresh };
}

export function PickupProposalForm({
  trip,
}: {
  trip: Pick<AvailableTrip, 'id' | 'itinerary'>;
}) {
  const reference = trip.itinerary.stops[0];
  const enabled =
    trip.itinerary.direction === 'HACIA_USC' &&
    !!trip.itinerary.geometry &&
    !!reference;
  const { endpoint, proposals, refresh } = usePickupProposals(trip.id, enabled);
  const [coordinates, setCoordinates] = useState<Coordinates>();
  const [label, setLabel] = useState('');
  const [instructions, setInstructions] = useState('');
  const propose = useMutation({
    mutationFn: (body: PickupProposalInput) =>
      api<PickupProposalView>(endpoint, { method: 'POST', body }),
    onSuccess: () => {
      setCoordinates(undefined);
      setLabel('');
      setInstructions('');
      refresh();
    },
  });

  if (!enabled) return null;
  const pending = proposals.data?.some(({ status }) => status === 'PENDING');
  return (
    <View style={s.section}>
      <Text style={s.title}>Proponer recogida</Text>
      <Text style={s.text}>
        Elige un lugar público sobre el recorrido. Si el conductor lo acepta,
        podrás confirmar tu participación mientras queden plazas.
      </Text>
      {proposals.data?.map((proposal) => (
        <Text key={proposal.id} style={s.text}>
          {proposal.label} · {labels[proposal.status]}
        </Text>
      ))}
      {pending !== true && (
        <>
          <TextInput
            accessibilityLabel="Referencia pública de recogida"
            placeholder="Referencia pública de recogida"
            maxLength={100}
            value={label}
            onChangeText={setLabel}
          />
          <TextInput
            accessibilityLabel="Indicaciones de recogida"
            placeholder="Indicaciones opcionales"
            maxLength={240}
            value={instructions}
            onChangeText={setInstructions}
          />
          <MeetingMapPicker
            title="Recogida"
            reference={reference}
            value={coordinates}
            onSelect={setCoordinates}
          />
          <Button
            title="Enviar propuesta de recogida"
            disabled={
              !coordinates || label.trim().length < 2 || propose.isPending
            }
            onPress={() => {
              if (coordinates)
                propose.mutate({
                  ...coordinates,
                  label: label.trim(),
                  instructions: instructions.trim() || undefined,
                });
            }}
          />
        </>
      )}
      {(proposals.error || propose.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {proposals.error?.message ?? propose.error?.message}
        </Text>
      )}
    </View>
  );
}

export function DriverPickupProposals({ trip }: { trip: TripSummary }) {
  const enabled = trip.itinerary?.direction === 'HACIA_USC';
  const { endpoint, proposals, refresh } = usePickupProposals(trip.id, enabled);
  const decide = useMutation({
    mutationFn: ({
      id,
      decision,
    }: {
      id: string;
      decision: 'ACCEPT' | 'REJECT';
    }) =>
      api<PickupProposalView>(`${endpoint}/${id}/decision`, {
        method: 'POST',
        body: { decision },
      }),
    onSuccess: refresh,
  });
  if (!enabled) return null;
  return (
    <View style={s.section}>
      <Text style={s.title}>Propuestas de recogida</Text>
      {proposals.isPending && <Text style={s.text}>Cargando propuestas…</Text>}
      {proposals.data?.length === 0 && (
        <Text style={s.text}>Aún no hay propuestas.</Text>
      )}
      {proposals.data?.map((proposal) => (
        <View key={proposal.id} style={s.section}>
          <Text style={s.text}>
            {proposal.requesterName ?? 'Estudiante'} · {proposal.label} ·{' '}
            {labels[proposal.status]}
          </Text>
          {proposal.instructions && (
            <Text style={s.text}>{proposal.instructions}</Text>
          )}
          {proposal.status === 'PENDING' && (
            <>
              <Button
                title={`Aceptar recogida · ${proposal.label}`}
                disabled={decide.isPending}
                onPress={() =>
                  decide.mutate({ id: proposal.id, decision: 'ACCEPT' })
                }
              />
              <Button
                title={`Rechazar recogida · ${proposal.label}`}
                secondary
                disabled={decide.isPending}
                onPress={() =>
                  decide.mutate({ id: proposal.id, decision: 'REJECT' })
                }
              />
            </>
          )}
        </View>
      ))}
      {(proposals.error || decide.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {proposals.error?.message ?? decide.error?.message}
        </Text>
      )}
    </View>
  );
}
