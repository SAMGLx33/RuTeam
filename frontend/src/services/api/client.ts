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
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const baseUrl: unknown = Constants.expoConfig?.extra?.apiUrl;
  if (typeof baseUrl !== 'string' || !baseUrl.startsWith('http'))
    throw new ApiError('El servicio de RuTeam no está disponible.', 0);
  const controller = new AbortController();
  const signal = options?.signal;
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 10000);
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
    if (error instanceof ApiError || signal?.aborted) throw error;
    throw new ApiError(
      'No pudimos conectar con RuTeam. Comprueba tu conexión e inténtalo de nuevo.',
      0,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}
