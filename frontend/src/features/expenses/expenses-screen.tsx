import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type {
  TripExpenseDetails,
  TripExpenseEstimate,
  TripExpenseInput,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';

const concepts = [
  ['fuelCop', 'Combustible'],
  ['tollsCop', 'Peajes'],
  ['parkingCop', 'Estacionamiento'],
] as const;
const pesos = (n: number) =>
  n.toLocaleString('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  });

function ExpenseForm({
  tripId,
  actorId,
  estimate,
  editable,
}: {
  tripId: string;
  actorId: string;
  estimate: TripExpenseEstimate | null;
  editable: boolean;
}) {
  const [values, setValues] = useState(() => ({
    fuelCop: estimate?.fuelCop.toString() ?? '',
    tollsCop: estimate?.tollsCop.toString() ?? '',
    parkingCop: estimate?.parkingCop.toString() ?? '',
  }));
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (body: TripExpenseInput) =>
      api<TripExpenseEstimate>(`/trips/${tripId}/expense-estimate`, {
        method: 'POST',
        body,
      }),
    onSuccess: (estimate) =>
      client.setQueryData(['trip-expense', tripId, actorId], {
        estimate,
        editable,
      }),
  });
  const stored = save.data ?? estimate;
  const invalid = Object.values(values).some(
    (text) => !/^\d*$/.test(text) || Number(text) > 100000000,
  );
  return (
    <View style={s.section}>
      <Text style={s.text}>
        Estimación privada del conductor en pesos colombianos.
      </Text>
      {concepts.map(([name, label]) => (
        <View key={name} style={styles.field}>
          <Text style={s.text}>{label}</Text>
          {editable ? (
            <TextInput
              accessibilityLabel={label}
              inputMode="numeric"
              value={values[name]}
              editable={!save.isPending}
              maxLength={9}
              onChangeText={(text) =>
                setValues((before) => ({
                  ...before,
                  [name]: text,
                }))
              }
              style={styles.input}
              placeholder="0"
            />
          ) : (
            <Text style={s.text}>{pesos(stored?.[name] ?? 0)}</Text>
          )}
        </View>
      ))}
      {!!stored && (
        <Text style={s.title} accessibilityLiveRegion="polite">
          Total guardado · {pesos(stored.totalCop)}
        </Text>
      )}
      {invalid && (
        <Text accessibilityRole="alert" style={s.error}>
          Usa pesos enteros entre 0 y 100.000.000 por concepto.
        </Text>
      )}
      {save.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {save.error.message}
        </Text>
      )}
      {editable && (
        <Button
          title="Guardar estimación"
          disabled={save.isPending || invalid}
          onPress={() =>
            save.mutate({
              fuelCop: Number(values.fuelCop),
              tollsCop: Number(values.tollsCop),
              parkingCop: Number(values.parkingCop),
            })
          }
        />
      )}
    </View>
  );
}

export function ExpensesScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useSession();
  const enabled = !!user?.capabilities.passenger && !!tripId;
  const estimate = useQuery({
    queryKey: ['trip-expense', tripId, user?.id],
    enabled,
    queryFn: () => api<TripExpenseDetails>(`/trips/${tripId}/expense-estimate`),
  });
  return (
    <ProtectedPage title="Costos estimados">
      <Link href="/my-trips" style={s.link}>
        Mis viajes publicados
      </Link>
      {estimate.isPending && (
        <Text style={s.text}>Consultando la estimación…</Text>
      )}
      {estimate.error && (
        <Text accessibilityRole="alert" style={s.error}>
          {estimate.error.message}
        </Text>
      )}
      {tripId && user && estimate.data && (
        <ExpenseForm
          key={tripId}
          actorId={user.id}
          tripId={tripId}
          estimate={estimate.data.estimate}
          editable={estimate.data.editable}
        />
      )}
    </ProtectedPage>
  );
}
const styles = StyleSheet.create({
  field: { gap: 5 },
  input: {
    minHeight: 48,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    color: colors.dark,
  },
});
