import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, TextInput, View } from 'react-native';
import type {
  TripIncident,
  TripIncidentInput,
  TripIncidentHistory,
  TripIncidentKind,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { colors } from '../../theme/tokens';
import { Choice } from '../trips/itinerary-form';
import { travelTime } from '../trips/route-preview';

import { IncidentSummary, kindLabel } from './incident-summary';

export function IncidentsScreen() {
  const { tripId } = useLocalSearchParams<{ tripId: string }>();
  const { user } = useSession();
  const [kind, setKind] = useState<TripIncidentKind>();
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const client = useQueryClient();
  const path = `/trips/${encodeURIComponent(tripId ?? '')}/incidents`;
  const key = ['trip-incidents', user?.id, tripId];
  const query = useQuery({
    queryKey: key,
    enabled: !!tripId && !!user?.capabilities.passenger,
    queryFn: ({ signal }) => api<TripIncidentHistory>(path, { signal }),
    gcTime: 0,
  });
  const create = useMutation({
    mutationFn: (body: TripIncidentInput) =>
      api<TripIncident>(path, { method: 'POST', body }),
    onSuccess: () => {
      setDescription('');
      setKind(undefined);
      setSuccess(true);
      void client.invalidateQueries({ queryKey: ['my-incidents', user?.id] });
      return client.invalidateQueries({ queryKey: key });
    },
  });
  return (
    <ProtectedPage title="Incidencias privadas">
      <Link href="/incidents" style={s.link}>
        Mis incidencias
      </Link>
      {query.isPending && <Text style={s.text}>Consultando incidencias…</Text>}
      {query.data?.canCreate && !query.isError && (
        <View style={s.section}>
          <Text style={s.text}>
            El registro queda disponible para tu cuenta. Si necesitas atención
            inmediata, usa los canales de emergencia.
          </Text>
          {(Object.keys(kindLabel) as TripIncidentKind[]).map((item) => (
            <Choice
              key={item}
              label={kindLabel[item]}
              checked={item === kind}
              onPress={() => {
                setSuccess(false);
                setKind(item);
              }}
            />
          ))}
          <Text style={s.text}>Descripción</Text>
          <TextInput
            accessibilityLabel="Descripción de la incidencia"
            multiline
            maxLength={1000}
            value={description}
            editable={!create.isPending}
            onChangeText={(text) => {
              setSuccess(false);
              setDescription(text);
            }}
            style={{
              minHeight: 96,
              borderWidth: 1,
              borderColor: colors.border,
              color: colors.ink,
              padding: 10,
            }}
          />
          <Button
            title="Guardar registro privado"
            disabled={
              !kind || description.trim().length < 5 || create.isPending
            }
            onPress={() => {
              if (kind) create.mutate({ kind, description });
            }}
          />
          {success && (
            <Text accessibilityLiveRegion="polite" style={s.text}>
              Incidencia guardada en tu historial privado.
            </Text>
          )}
        </View>
      )}
      {(query.error || create.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {query.error?.message ?? create.error?.message}
        </Text>
      )}
      {query.data?.records.length === 0 && (
        <Text style={s.text}>
          Aún no has registrado incidencias de este viaje.
        </Text>
      )}
      {query.data?.records.map((record) => (
        <View key={record.id} style={s.section}>
          <Text style={s.title}>{kindLabel[record.kind]}</Text>
          <Text style={s.text}>
            {travelTime(record.createdAt)} · Registro privado
          </Text>
          <Text style={s.text}>{record.description}</Text>
          <IncidentSummary id={record.id} />
        </View>
      ))}
    </ProtectedPage>
  );
}
