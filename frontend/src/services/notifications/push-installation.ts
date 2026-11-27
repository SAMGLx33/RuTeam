import type { NotificationSettings } from '@ruteam/contracts';
import type { DevicePushToken } from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { api, ApiError, isCurrentSessionToken } from '../api/client';
import { readToken } from '../api/session-storage';
import {
  isPushNativeBuild,
  loadPushNotifications,
  obtainExpoPushToken,
  pushPermission,
  pushPlatform,
  pushProjectId,
} from './native-push';

type Device = NotificationSettings['devices'][number];
type Binding = {
  accountId: string;
  sessionProof: string;
  token: string;
  deviceId: string | null;
};

const bindingKey = 'ruteam-push-binding';
const secretKey = 'ruteam-push-installation-secret';
const storageOptions = {
  keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
};
const settingsPath = '/notification-settings';
let operation = Promise.resolve();

function serialize<T>(work: () => Promise<T>): Promise<T> {
  const result = operation.then(work);
  operation = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

async function readBinding(): Promise<Binding | null> {
  if (!isPushNativeBuild()) return null;
  const raw = await SecureStore.getItemAsync(bindingKey, storageOptions);
  if (!raw) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (
      typeof value === 'object' &&
      value !== null &&
      'accountId' in value &&
      typeof value.accountId === 'string' &&
      'sessionProof' in value &&
      typeof value.sessionProof === 'string' &&
      'token' in value &&
      typeof value.token === 'string' &&
      'deviceId' in value &&
      (value.deviceId === null || typeof value.deviceId === 'string')
    )
      return {
        accountId: value.accountId,
        sessionProof: value.sessionProof,
        token: value.token,
        deviceId: value.deviceId,
      };
  } catch {
    // A damaged local record cannot authorize renewal.
  }
  return null;
}

function saveBinding(value: Binding | null) {
  return value
    ? SecureStore.setItemAsync(
        bindingKey,
        JSON.stringify(value),
        storageOptions,
      )
    : SecureStore.deleteItemAsync(bindingKey, storageOptions);
}

async function installationSecret() {
  const current = await SecureStore.getItemAsync(secretKey, storageOptions);
  if (current) return current;
  const { getRandomBytesAsync } = await import('expo-crypto');
  const bytes = await getRandomBytesAsync(32);
  const secret = Array.from(bytes, (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
  await SecureStore.setItemAsync(secretKey, secret, storageOptions);
  return secret;
}

async function getSessionCredentials() {
  const token = await readToken();
  if (!token) return null;
  const { digestStringAsync, CryptoDigestAlgorithm } =
    await import('expo-crypto');
  const proof = await digestStringAsync(CryptoDigestAlgorithm.SHA256, token);
  return isCurrentSessionToken(token) ? { token, proof } : null;
}

async function bindingFor(accountId: string) {
  const binding = await readBinding();
  return binding?.accountId === accountId &&
    binding.sessionProof === (await getSessionCredentials())?.proof
    ? binding
    : null;
}

export async function localPushDevice(accountId: string) {
  const binding = await bindingFor(accountId);
  return {
    id: binding?.deviceId ?? null,
    pending: binding !== null && binding.deviceId === null,
  };
}

async function register(binding: Binding): Promise<Device> {
  const secret = await installationSecret();
  const platform = pushPlatform();
  const credentials = await getSessionCredentials();
  if (!platform || credentials?.proof !== binding.sessionProof)
    throw new Error(
      'Inicia sesión para activar los avisos en este dispositivo.',
    );
  await saveBinding(binding);
  if (!isCurrentSessionToken(credentials.token))
    throw new Error(
      'Inicia sesión para activar los avisos en este dispositivo.',
    );
  let device: Device;
  try {
    device = await api<Device>(`${settingsPath}/devices`, {
      method: 'POST',
      body: {
        token: binding.token,
        installationSecret: secret,
        platform,
        consent: true,
      },
    });
  } catch (error) {
    if (
      error instanceof ApiError &&
      [400, 401, 403, 404].includes(error.status)
    )
      await saveBinding(null);
    throw new Error(
      'No pudimos confirmar el registro de este dispositivo. Revisa su estado en esta pantalla.',
    );
  }
  await saveBinding({ ...binding, deviceId: device.id });
  return device;
}

async function revoke(id: string) {
  try {
    await api(`${settingsPath}/devices/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 404)) throw error;
  }
}

export function enablePush(accountId: string) {
  return serialize(async () => {
    const projectId = pushProjectId();
    const notifications = await loadPushNotifications();
    if (!projectId || !notifications)
      throw new Error(
        'Los avisos del sistema requieren una compilación nativa configurada y un dispositivo físico.',
      );
    const proof = (await getSessionCredentials())?.proof;
    if (!proof) throw new Error('Inicia sesión para activar los avisos.');
    const settings = await api<NotificationSettings>(settingsPath);
    if (!settings.nativePushConfigured)
      throw new Error(
        'El registro de avisos está deshabilitado en este entorno.',
      );
    let allowed: boolean;
    try {
      allowed = await pushPermission(notifications, true);
    } catch {
      throw new Error(
        'No pudimos consultar los permisos de notificaciones del sistema.',
      );
    }
    if (!allowed)
      throw new Error(
        'Permite las notificaciones de RuTeam en los ajustes del dispositivo para activarlas.',
      );
    const previous = await bindingFor(accountId);
    if (previous && previous.deviceId === null) return register(previous);
    const token = await obtainExpoPushToken(notifications, projectId);
    if (previous?.deviceId && previous.token !== token)
      await revoke(previous.deviceId);
    return register({
      accountId,
      sessionProof: proof,
      token,
      deviceId: previous?.token === token ? previous.deviceId : null,
    });
  });
}

export function revokePushDevice(accountId: string, id: string) {
  return serialize(async () => {
    const own = await bindingFor(accountId);
    await revoke(id);
    if (own?.deviceId === id) await saveBinding(null);
  });
}

export function revokeLocalPushForSession(accountId?: string) {
  if (!accountId) return Promise.resolve();
  return serialize(async () => {
    const binding = await bindingFor(accountId);
    if (!binding) return;
    try {
      // A pending POST is also disabled when Nest revokes its session on logout.
      if (binding.deviceId) await revoke(binding.deviceId);
      await saveBinding(null);
    } catch (error) {
      if (error instanceof ApiError && [401, 403].includes(error.status)) {
        await saveBinding(null);
        return;
      }
      throw new Error(
        'No pudimos revocar los avisos de este dispositivo. Comprueba tu conexión y vuelve a intentarlo.',
      );
    }
  });
}

export function refreshPush(accountId: string, deviceToken?: DevicePushToken) {
  return serialize(async () => {
    const binding = await bindingFor(accountId);
    if (!binding?.deviceId) return;
    const projectId = pushProjectId();
    const notifications = await loadPushNotifications();
    if (!projectId || !notifications) return;
    const settings = await api<NotificationSettings>(settingsPath);
    if (!settings.devices.some(({ id }) => id === binding.deviceId)) {
      await saveBinding(null);
      return;
    }
    if (!(await pushPermission(notifications, false))) {
      await revoke(binding.deviceId);
      await saveBinding(null);
      return;
    }
    if (!settings.nativePushConfigured) return;
    const token = await obtainExpoPushToken(
      notifications,
      projectId,
      deviceToken,
    );
    if (token === binding.token) return;
    await revoke(binding.deviceId);
    await register({ ...binding, token, deviceId: null });
  });
}
