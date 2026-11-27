import { Link, Text, View } from '../../theme/primitives';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  NotificationPreferences,
  NotificationSettings,
} from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';

const labels: Record<keyof NotificationPreferences, string> = {
  recommendations: 'Recomendaciones de viajes',
  messages: 'Avisos de mensajes',
  reminders: 'Recordatorios de calificación',
  recurrences: 'Avisos de recurrencias',
  optionalTripUpdates: 'Avisos de nuevos pasajeros y propuestas recibidas',
};
export function NotificationSettingsScreen() {
  const { user } = useSession();
  const client = useQueryClient();
  const key = ['notification-settings', user?.id];
  const query = useQuery({
    queryKey: key,
    enabled: !!user?.capabilities.passenger,
    queryFn: () => api<NotificationSettings>('/notification-settings'),
  });
  const save = useMutation({
    mutationFn: (preferences: NotificationPreferences) =>
      api<NotificationSettings>('/notification-settings', {
        method: 'PUT',
        body: preferences,
      }),
    onSuccess: (data) => {
      client.setQueryData(key, data);
      void client.invalidateQueries({ queryKey: ['notifications'] });
      void client.invalidateQueries({ queryKey: ['notification-list'] });
    },
  });
  const revoke = useMutation({
    mutationFn: (id: string) =>
      api('/notification-settings/devices/' + id, { method: 'DELETE' }),
    onSuccess: () => query.refetch(),
  });
  const settings = query.data;
  return (
    <ProtectedPage title="Preferencias de avisos">
      <Link href="/notifications" style={s.link}>
        Volver a notificaciones
      </Link>
      <Text style={s.text}>
        Las cancelaciones, confirmaciones y cambios operativos de tus viajes
        permanecen visibles.
      </Text>
      {query.isPending && <Text style={s.text}>Cargando preferencias…</Text>}
      {(query.error || save.error || revoke.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {(query.error || save.error || revoke.error)?.message}
        </Text>
      )}
      {settings && (
        <>
          <View style={s.section}>
            <Text style={s.title}>Avisos opcionales</Text>
            {(Object.keys(labels) as (keyof NotificationPreferences)[]).map(
              (category) => (
                <Choice
                  checkbox
                  key={category}
                  label={labels[category]}
                  checked={settings.preferences[category]}
                  onPress={() => {
                    if (!save.isPending)
                      save.mutate({
                        ...settings.preferences,
                        [category]: !settings.preferences[category],
                      });
                  }}
                />
              ),
            )}
            {save.isPending && (
              <Text style={s.text}>Guardando preferencias…</Text>
            )}
          </View>
          <View style={s.section}>
            <Text style={s.title}>Avisos del sistema operativo</Text>
            <Text style={s.text}>
              El registro remoto requiere una compilación habilitada y
              consentimiento en el dispositivo. Los avisos de RuTeam se pueden
              consultar desde la bandeja.
            </Text>
            {!settings.nativePushConfigured && (
              <Text style={s.text}>
                El registro remoto está deshabilitado en este entorno.
              </Text>
            )}
            {settings.devices.map(({ id, platform }) => (
              <Button
                key={id}
                secondary
                title={'Revocar dispositivo ' + platform}
                disabled={revoke.isPending}
                onPress={() => revoke.mutate(id)}
              />
            ))}
          </View>
        </>
      )}
    </ProtectedPage>
  );
}
