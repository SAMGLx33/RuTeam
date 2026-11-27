import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import type { NotificationSettings } from '@ruteam/contracts';
import { Button } from '../../components/ui/button';
import { formStyles as s } from '../../components/ui/protected-page';
import {
  isPushNativeBuild,
  loadPushNotifications,
  pushProjectId,
} from '../../services/notifications/native-push';
import {
  enablePush,
  localPushDevice,
  revokePushDevice,
} from '../../services/notifications/push-installation';
import { tripDate } from '../trips/trip-feed';

export function PushDeviceSettings({
  accountId,
  settings,
}: {
  accountId: string;
  settings: NotificationSettings;
}) {
  const client = useQueryClient();
  const installationKey = ['push-installation', accountId];
  const local = useQuery({
    queryKey: installationKey,
    queryFn: () => localPushDevice(accountId),
    enabled: isPushNativeBuild(),
  });
  const native = useQuery({
    queryKey: ['push-native-availability'],
    queryFn: async () => (await loadPushNotifications()) !== null,
    staleTime: Infinity,
    enabled:
      settings.nativePushConfigured && isPushNativeBuild() && !!pushProjectId(),
  });
  async function refresh() {
    await Promise.all([
      client.invalidateQueries({ queryKey: installationKey }),
      client.invalidateQueries({
        queryKey: ['notification-settings', accountId],
      }),
    ]);
  }
  const enable = useMutation({
    mutationFn: () => enablePush(accountId),
    onSettled: refresh,
  });
  const revoke = useMutation({
    mutationFn: (id: string) => revokePushDevice(accountId, id),
    onSettled: refresh,
  });
  const active = settings.devices.some(({ id }) => id === local.data?.id);
  const busy = enable.isPending || revoke.isPending;
  const available = settings.nativePushConfigured && native.data === true;
  const error = enable.error ?? revoke.error;
  return (
    <View style={s.section}>
      <Text style={s.title}>Avisos del sistema operativo</Text>
      {!settings.nativePushConfigured ? (
        <Text style={s.text}>
          El registro remoto está deshabilitado en este entorno. Puedes
          consultar tus avisos en la bandeja.
        </Text>
      ) : !isPushNativeBuild() ? (
        <Text style={s.text}>
          En web y Expo Go está disponible la bandeja. Los avisos del sistema
          requieren una compilación nativa de RuTeam.
        </Text>
      ) : !pushProjectId() ? (
        <Text style={s.text}>
          Esta compilación requiere configurar el proyecto de notificaciones.
        </Text>
      ) : native.isFetching ? (
        <Text style={s.text}>Comprobando disponibilidad de avisos…</Text>
      ) : !available ? (
        <Text style={s.text}>
          Usa una compilación nativa con notificaciones en un dispositivo
          físico.
        </Text>
      ) : null}
      {active && (
        <Text accessibilityLiveRegion="polite" style={s.text}>
          Este dispositivo está registrado en tu sesión.
        </Text>
      )}
      {available && !active && !local.isPending && !local.error && (
        <>
          <Text style={s.text}>
            Al activar los avisos en este dispositivo, RuTeam asocia el registro
            a tu sesión. Puedes revocarlo en cualquier momento.
          </Text>
          {local.data?.pending && (
            <Text style={s.text}>
              No pudimos confirmar el último registro. Comprueba los
              dispositivos de la lista o vuelve a intentarlo.
            </Text>
          )}
          <Button
            title={
              enable.isPending
                ? 'Activando avisos…'
                : 'Activar avisos en este dispositivo'
            }
            disabled={busy}
            onPress={() => enable.mutate()}
          />
        </>
      )}
      {(local.error || error) && (
        <Text accessibilityRole="alert" style={s.error}>
          {local.error
            ? 'No pudimos consultar el registro local del dispositivo.'
            : error?.message}
        </Text>
      )}
      {settings.devices.length === 0 && (
        <Text style={s.text}>No hay dispositivos asociados.</Text>
      )}
      {settings.devices.map(({ id, platform, registeredAt }) => (
        <View key={id}>
          <Text style={s.text}>
            {platform === 'IOS' ? 'iOS' : 'Android'} · {tripDate(registeredAt)}
          </Text>
          <Button
            secondary
            title={
              id === local.data?.id
                ? 'Revocar este dispositivo'
                : 'Revocar dispositivo'
            }
            disabled={busy}
            onPress={() => revoke.mutate(id)}
          />
        </View>
      ))}
    </View>
  );
}
