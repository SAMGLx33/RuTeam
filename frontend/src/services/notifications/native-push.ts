import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import type { DevicePushToken } from 'expo-notifications';

export const pushChannel = 'ruteam-updates';
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

export function pushPlatform() {
  if (Platform.OS === 'android') return 'ANDROID';
  if (Platform.OS === 'ios') return 'IOS';
  return null;
}

export function isPushNativeBuild() {
  return pushPlatform() !== null && !isRunningInExpoGo();
}

export function pushProjectId(): string | null {
  const id: unknown =
    Constants.easConfig?.projectId ??
    Constants.expoConfig?.extra?.eas?.projectId;
  return typeof id === 'string' && uuid.test(id) ? id : null;
}

export async function loadPushNotifications() {
  if (!isPushNativeBuild() || !pushProjectId()) return null;
  try {
    const { isDevice } = await import('expo-device');
    if (!isDevice) return null;
    return await import('expo-notifications');
  } catch {
    return null;
  }
}

type NativeNotifications = NonNullable<
  Awaited<ReturnType<typeof loadPushNotifications>>
>;

export async function pushPermission(
  notifications: NativeNotifications,
  request: boolean,
) {
  if (request && pushPlatform() === 'ANDROID')
    await notifications.setNotificationChannelAsync(pushChannel, {
      name: 'Avisos de RuTeam',
      importance: notifications.AndroidImportance.DEFAULT,
    });
  let permissions = await notifications.getPermissionsAsync();
  if (!permissions.granted && request && permissions.canAskAgain)
    permissions = await notifications.requestPermissionsAsync();
  return permissions.granted;
}

export async function obtainExpoPushToken(
  notifications: NativeNotifications,
  projectId: string,
  devicePushToken?: DevicePushToken,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      notifications
        .getExpoPushTokenAsync({ projectId, devicePushToken })
        // RuTeam renews the association only under the consenting session.
        .finally(() =>
          notifications
            .setAutoServerRegistrationEnabledAsync(false)
            .catch(() => undefined),
        ),
      new Promise<never>((_, reject) => {
        timer = setTimeout(reject, 12_000);
      }),
    ]);
    if (
      /^(?:Expo|Exponent)PushToken\[[A-Za-z0-9_-]{10,128}\]$/.test(result.data)
    )
      return result.data;
  } catch {
    // Provider errors can include credential material and are not user-facing.
  } finally {
    clearTimeout(timer);
  }
  throw new Error(
    'No pudimos obtener el registro de notificaciones. Comprueba la conexión y la configuración de esta compilación.',
  );
}
