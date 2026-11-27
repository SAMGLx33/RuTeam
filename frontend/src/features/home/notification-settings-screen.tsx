import { Link } from 'expo-router';
import { Text, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  NotificationPreferences,
  NotificationSettings,
} from '@ruteam/contracts';
import {
  ProtectedPage,
  formStyles as s,
} from '../../components/ui/protected-page';
import { useSession } from '../../providers/session-provider';
import { api } from '../../services/api/client';
import { Choice } from '../trips/itinerary-form';
import { PushDeviceSettings } from './push-device-settings';

const labels = {
  recommendations: 'Recomendaciones de viajes',
  messages: 'Avisos de mensajes',
  reminders: 'Recordatorios de viajes, documentos y calificaciones',
  recurrences: 'Avisos de recurrencias',
  optionalTripUpdates: 'Avisos de nuevos pasajeros y propuestas recibidas',
} satisfies Record<
  Exclude<keyof NotificationPreferences, 'reminderLeadMinutes'>,
  string
>;
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
      {(query.error || save.error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {(query.error || save.error)?.message}
        </Text>
      )}
      {settings && (
        <>
          <View style={s.section}>
            <Text style={s.title}>Avisos opcionales</Text>
            {(Object.keys(labels) as (keyof typeof labels)[]).map(
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
            {settings.preferences.reminders && (
              <>
                <Text style={s.title}>
                  Anticipación para viajes y documentos
                </Text>
                {([15, 30, 60] as const).map((minutes) => (
                  <Choice
                    key={minutes}
                    label={`${minutes} minutos`}
                    checked={
                      (settings.preferences.reminderLeadMinutes ?? 30) ===
                      minutes
                    }
                    onPress={() => {
                      if (!save.isPending)
                        save.mutate({
                          ...settings.preferences,
                          reminderLeadMinutes: minutes,
                        });
                    }}
                  />
                ))}
              </>
            )}
            {save.isPending && (
              <Text style={s.text}>Guardando preferencias…</Text>
            )}
          </View>
          {user && (
            <PushDeviceSettings
              key={user.id}
              accountId={user.id}
              settings={settings}
            />
          )}
        </>
      )}
    </ProtectedPage>
  );
}
