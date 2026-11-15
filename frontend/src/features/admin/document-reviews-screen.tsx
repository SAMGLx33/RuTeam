import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api/client';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
interface PendingReviews {
  vehicles: {
    id: string;
    plate: string;
    revision: number;
    expiresAt: string;
  }[];
  licenses: {
    userId: string;
    displayName: string;
    category: string;
    revision: number;
    expiresAt: string;
  }[];
}
export function DocumentReviewsScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const pending = useQuery({
    queryKey: ['document-reviews'],
    enabled: user?.role === 'ADMIN',
    queryFn: () => api<PendingReviews>('/admin/demo/document-reviews'),
  });
  const review = useMutation({
    mutationFn: ({
      kind,
      id,
      decision,
      revision,
    }: {
      kind: 'vehicles' | 'driver-eligibility';
      id: string;
      revision: number;
      decision: 'APPROVED' | 'REJECTED';
    }) =>
      api(`/admin/demo/${kind}/${id}/review`, {
        method: 'POST',
        body: { decision, revision },
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['document-reviews'] }),
  });
  return (
    <ProtectedPage title="Revisión de documentos DEMO" admin>
      <Text style={s.text}>
        Sólo documentos sintéticos. Esta revisión manual no consulta SOAT, RUNT,
        licencias ni fuentes oficiales.
      </Text>
      {pending.isPending && <Text>Cargando solicitudes…</Text>}
      {pending.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {pending.error.message}
        </Text>
      )}
      {review.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {review.error.message}
        </Text>
      )}
      {pending.data &&
        pending.data.vehicles.length + pending.data.licenses.length === 0 && (
          <Text>No hay documentos pendientes.</Text>
        )}
      {pending.data?.vehicles.map((vehicle) => (
        <View key={vehicle.id} style={s.section}>
          <Text style={s.title}>SOAT DEMO · {vehicle.plate}</Text>
          <Text style={s.text}>
            Vence {new Date(vehicle.expiresAt).toLocaleDateString('es-CO')}
          </Text>
          <Button
            title={`Aprobar SOAT ${vehicle.plate}`}
            disabled={review.isPending}
            onPress={() =>
              review.mutate({
                kind: 'vehicles',
                id: vehicle.id,
                revision: vehicle.revision,
                decision: 'APPROVED',
              })
            }
          />
          <Button
            title={`Rechazar SOAT ${vehicle.plate}`}
            secondary
            disabled={review.isPending}
            onPress={() =>
              review.mutate({
                kind: 'vehicles',
                id: vehicle.id,
                revision: vehicle.revision,
                decision: 'REJECTED',
              })
            }
          />
        </View>
      ))}
      {pending.data?.licenses.map((license) => (
        <View key={license.userId} style={s.section}>
          <Text style={s.title}>Licencia DEMO · {license.displayName}</Text>
          <Text style={s.text}>
            {license.category} · vence{' '}
            {new Date(license.expiresAt).toLocaleDateString('es-CO')}
          </Text>
          <Button
            title={`Aprobar licencia ${license.displayName}`}
            disabled={review.isPending}
            onPress={() =>
              review.mutate({
                kind: 'driver-eligibility',
                id: license.userId,
                revision: license.revision,
                decision: 'APPROVED',
              })
            }
          />
          <Button
            title={`Rechazar licencia ${license.displayName}`}
            secondary
            disabled={review.isPending}
            onPress={() =>
              review.mutate({
                kind: 'driver-eligibility',
                id: license.userId,
                revision: license.revision,
                decision: 'REJECTED',
              })
            }
          />
        </View>
      ))}
    </ProtectedPage>
  );
}
