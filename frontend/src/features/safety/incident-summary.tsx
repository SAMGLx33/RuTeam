import { Text, View } from '../../theme/primitives';
import { useState } from 'react';
import { Platform, Share } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import type { IncidentExport, TripIncidentKind } from '@ruteam/contracts';
import { api } from '../../services/api/client';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import { travelTime, tripStatusLabel } from '../trips/route-preview';

export const kindLabel: Record<TripIncidentKind, string> = {
  ROAD_SAFETY: 'Seguridad vial',
  TRIP_PROBLEM: 'Problema durante el viaje',
  CONDUCT: 'Convivencia',
  TERMS: 'Incumplimiento de condiciones',
  VEHICLE: 'Problema con el vehículo',
  ECONOMIC: 'Problema económico',
  TECHNICAL: 'Problema técnico',
  OTHER: 'Otra incidencia',
};

export function IncidentSummary({ id }: { id: string }) {
  const [error, setError] = useState('');
  const preview = useMutation({
    mutationFn: () => api<IncidentExport>('/me/incidents/' + id + '/export'),
    gcTime: 0,
  });
  const record = preview.data?.record;
  const summary = record
    ? [
        'Incidencia privada de RuTeam',
        kindLabel[record.kind],
        'Registro · ' + travelTime(record.createdAt),
        'Viaje · ' +
          record.trip.originLabel +
          ' · ' +
          travelTime(record.trip.departureAt) +
          ' · ' +
          tripStatusLabel[record.trip.status],
        record.description,
      ].join('\n')
    : null;
  const canShare =
    Platform.OS !== 'web' || typeof globalThis.navigator?.share === 'function';
  async function share() {
    if (!summary) return;
    setError('');
    try {
      if (Platform.OS === 'web')
        await globalThis.navigator.share({ text: summary });
      else await Share.share({ message: summary });
    } catch (result) {
      if (result instanceof Error && result.name === 'AbortError') return;
      setError('No fue posible abrir el selector. Puedes copiar el resumen.');
    }
  }
  return (
    <View style={s.section}>
      {summary ? (
        <>
          <Text style={s.text}>
            Revisa el texto antes de copiarlo o elegir a quién compartirlo.
          </Text>
          <Text selectable style={s.text}>
            {summary}
          </Text>
          {canShare && (
            <Button
              title="Abrir selector para compartir incidencia"
              onPress={() => void share()}
            />
          )}
          <Button
            title="Cerrar resumen de incidencia"
            secondary
            onPress={() => {
              setError('');
              preview.reset();
            }}
          />
        </>
      ) : (
        <Button
          title="Revisar resumen para compartir"
          secondary
          disabled={preview.isPending}
          onPress={() => preview.mutate()}
        />
      )}
      {(error || preview.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {error || preview.error?.message}
        </Text>
      )}
    </View>
  );
}
