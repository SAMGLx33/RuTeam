import Constants from 'expo-constants';
import { Platform } from 'react-native';
let sessionToken: string | null = null;
export function setSessionToken(token: string | null): void {
  sessionToken = token;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options?: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown },
): Promise<T> {
  const baseUrl: unknown = Constants.expoConfig?.extra?.apiUrl;
  if (typeof baseUrl !== 'string' || !baseUrl.startsWith('http'))
    throw new ApiError('Configura EXPO_PUBLIC_API_URL y reinicia Expo.', 0);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, '')}${path}`, {
      method: options?.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-ruteam-client': Platform.OS === 'web' ? 'web' : 'native',
        ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      },
      credentials: 'include',
      body:
        options?.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (response.status === 204) return undefined as T;
    const payload: unknown = await response.json();
    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String(payload.message)
          : `Error HTTP ${response.status}`;
      throw new ApiError(message, response.status);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      'No pudimos conectar con la API. Revisa la URL LAN, la red y que Nest esté iniciado.',
      0,
    );
  } finally {
    clearTimeout(timer);
  }
}
