import { Text, View } from '../../theme/primitives';
import { useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type {
  CompensationAction,
  CompensationDetails,
  CompensationMethod,
  TripCompensationView,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';
import { travelTime } from '../trips/route-preview';
import { EconomicTerms, methodLabel, pesos } from './economic-terms';

const recordLabel: Record<TripCompensationView['status'], string> = {
  DECLARED: 'Compensación declarada por el pasajero',
  ACKNOWLEDGED: 'Recepción reconocida por el conductor',
  DISPUTED: 'Discrepancia registrada',
  CANCELLED: 'Declaración cancelada',
};

const actionLabel: Record<CompensationAction, string> = {
  ACKNOWLEDGE: 'Reconocer recepción',
  DISPUTE: 'Registrar discrepancia',
  CANCEL: 'Cancelar declaración',
};

export function CompensationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useSession();
  const [method, setMethod] = useState<CompensationMethod>();
  const [confirm, setConfirm] = useState<CompensationAction>();
  const client = useQueryClient();
  const path = `/participations/${encodeURIComponent(id ?? '')}/compensation`;
  const key = ['compensation', id, user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!id && !!user?.capabilities.passenger,
    queryFn: ({ signal }) => api<CompensationDetails>(path, { signal }),
    gcTime: 0,
  });
  const save = useMutation({
    mutationFn: (
      body: { method: CompensationMethod } | { action: CompensationAction },
    ) =>
      api<CompensationDetails>('action' in body ? `${path}/resolution` : path, {
        method: 'POST',
        body,
      }),
    onSuccess: (result) => {
      setConfirm(undefined);
      client.setQueryData(key, result);
      void client.invalidateQueries({ queryKey: ['notification-list'] });
    },
  });
  const data = query.isError ? undefined : query.data;
  return (
    <ProtectedPage title="Compensación del viaje">
      {query.isPending && <Text style={s.text}>Consultando el registro…</Text>}
      {(query.error || save.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error?.message ?? save.error?.message}
        </Text>
      )}
      {data && (
        <View style={s.section}>
          <EconomicTerms terms={data.terms} />
          <Text style={s.text}>
            RuTeam guarda declaraciones personales. La confirmación bancaria se
            consulta en el medio usado.
          </Text>
          {data.record ? (
            <>
              <Text style={s.title}>{recordLabel[data.record.status]}</Text>
              <Text style={s.text}>
                {methodLabel[data.record.method]} ·{' '}
                {pesos(data.record.amountCop)} COP ·{' '}
                {travelTime(data.record.declaredAt)}
              </Text>
              {data.record.resolvedAt && (
                <Text style={s.text}>
                  Actualizado · {travelTime(data.record.resolvedAt)}
                </Text>
              )}
              {confirm ? (
                <>
                  <Button
                    title={`Confirmar · ${actionLabel[confirm]}`}
                    disabled={save.isPending}
                    onPress={() => save.mutate({ action: confirm })}
                  />
                  <Button
                    title="Volver al registro"
                    secondary
                    disabled={save.isPending}
                    onPress={() => setConfirm(undefined)}
                  />
                </>
              ) : (
                data.actions.map((action) => (
                  <Button
                    key={action}
                    title={actionLabel[action]}
                    secondary
                    onPress={() => setConfirm(action)}
                  />
                ))
              )}
            </>
          ) : data.canDeclare ? (
            <>
              <Text style={s.text}>
                Selecciona el método que ya usaste para aportar el importe
                publicado.
              </Text>
              {data.terms?.compensationMethods.map((item) => (
                <Choice
                  key={item}
                  label={methodLabel[item]}
                  checked={method === item}
                  onPress={() => setMethod(item)}
                />
              ))}
              <Button
                title="Declarar compensación"
                disabled={!method || save.isPending}
                onPress={() => {
                  if (method) save.mutate({ method });
                }}
              />
            </>
          ) : (
            <Text style={s.text}>
              Aún no hay una declaración disponible para esta participación.
            </Text>
          )}
        </View>
      )}
    </ProtectedPage>
  );
}
