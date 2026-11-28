import { Text, View } from '../../theme/primitives';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AvailableTrip,
  PickupProposalView,
  TripSummary,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';

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

export function PickupProposalHistory({
  trip,
}: {
  trip: Pick<AvailableTrip, 'id' | 'itinerary'>;
}) {
  const { proposals } = usePickupProposals(
    trip.id,
    trip.itinerary.direction === 'HACIA_USC',
  );
  if (!proposals.data?.length) return null;
  return (
    <View style={s.section}>
      <Text style={s.title}>Historial de propuestas de recogida</Text>
      {proposals.data.map((proposal) => (
        <Text key={proposal.id} style={s.text}>
          {proposal.label} · {labels[proposal.status]}
        </Text>
      ))}
    </View>
  );
}

export function DriverPickupProposals({ trip }: { trip: TripSummary }) {
  const enabled = trip.itinerary?.direction === 'HACIA_USC';
  const { endpoint, proposals, refresh } = usePickupProposals(trip.id, enabled);
  const decide = useMutation({
    mutationFn: (id: string) =>
      api<PickupProposalView>(`${endpoint}/${id}/decision`, {
        method: 'POST',
        body: { decision: 'REJECT' },
      }),
    onSuccess: refresh,
  });
  if (!enabled || (!proposals.error && !proposals.data?.length)) return null;
  return (
    <View style={s.section}>
      <Text style={s.title}>Propuestas de recogida</Text>
      {proposals.data?.map((proposal) => (
        <View key={proposal.id} style={s.section}>
          <Text style={s.text}>
            {proposal.requesterName ?? 'Estudiante'} · {proposal.label} ·{' '}
            {labels[proposal.status]}
          </Text>
          {proposal.instructions && (
            <Text style={s.text}>{proposal.instructions}</Text>
          )}
          {proposal.status === 'PENDING' &&
            trip.status === 'PROGRAMADO' &&
            !trip.expiredAt && (
              <Button
                title={`Rechazar recogida · ${proposal.label}`}
                secondary
                disabled={decide.isPending}
                onPress={() => decide.mutate(proposal.id)}
              />
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
