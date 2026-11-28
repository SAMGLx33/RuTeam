import { fetch as expoFetch } from 'expo/fetch';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { browserOffline, setConnectionStatus } from './connection-status';

let sessionToken: string | null = null;
let sessionVersion = 0;
let requestEvents:
  ((event: 'unauthorized' | 'unknown-write') => void) | undefined;

export function setSessionToken(token: string | null): void {
  sessionToken = token;
  sessionVersion++;
}

export function isCurrentSessionToken(token: string): boolean {
  return sessionToken === token;
}

export function listenApiEvents(listener: typeof requestEvents) {
  requestEvents = listener;
  return () => {
    if (requestEvents === listener) requestEvents = undefined;
  };
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly outcome: 'rejected' | 'not-sent' | 'unknown' = 'rejected',
    public readonly code?: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options?: {
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    body?: unknown;
    signal?: AbortSignal;
  },
): Promise<T> {
  const controller = new AbortController();
  const signal = options?.signal;
  const method = options?.method ?? 'GET';
  const isWrite = method !== 'GET';
  const accountIndependent = method === 'GET' && path === '/auth/access';
  const version = sessionVersion;
  if (Platform.OS === 'web' && browserOffline()) {
    setConnectionStatus('lost');
    throw new ApiError(
      isWrite
        ? 'Operación no enviada. Restablece la conexión e inténtalo de nuevo.'
        : 'Conexión perdida. Comprueba el acceso a Internet.',
      0,
      'not-sent',
    );
  }
  const cancel = () => controller.abort();
  if (signal?.aborted) cancel();
  signal?.addEventListener('abort', cancel, { once: true });
  const timer = setTimeout(cancel, 10000);
  try {
    const response = await fetch(apiUrl(path), {
      method,
      headers: { ...clientHeaders(), 'Content-Type': 'application/json' },
      credentials: 'include',
      body:
        options?.body === undefined ? undefined : JSON.stringify(options.body),
      signal: controller.signal,
    });
    if (signal?.aborted) throw new Error('Solicitud cancelada');
    if (!accountIndependent && version !== sessionVersion)
      throw new ApiError(
        'La sesión cambió. Vuelve a la pantalla anterior.',
        401,
      );
    if (!browserOffline()) setConnectionStatus('available');
    if (response.status === 401 && isProtectedPath(path))
      requestEvents?.('unauthorized');
    if (response.status === 204) return undefined as T;
    const payload: unknown = await response.json().catch((error: unknown) => {
      if (response.ok && error instanceof SyntaxError) {
        if (isWrite) requestEvents?.('unknown-write');
        throw new ApiError(
          'RuTeam devolvió una respuesta inválida. Consulta el estado actualizado.',
          response.status,
          isWrite ? 'unknown' : 'rejected',
        );
      }
      if (response.ok) throw error;
      return null;
    });
    if (
      (!accountIndependent && version !== sessionVersion) ||
      signal?.aborted
    ) {
      if (signal?.aborted) throw new Error('Solicitud cancelada');
      throw new ApiError(
        'La sesión cambió. Vuelve a la pantalla anterior.',
        401,
      );
    }
    if (!response.ok) {
      const message =
        typeof payload === 'object' && payload !== null && 'message' in payload
          ? String(payload.message)
          : `Error HTTP ${response.status}`;
      const serviceUnavailable =
        response.status === 503 &&
        typeof payload === 'object' &&
        payload !== null &&
        'statusCode' in payload &&
        payload.statusCode === response.status &&
        'message' in payload &&
        typeof payload.message === 'string';
      if (isWrite && response.status >= 500 && !serviceUnavailable) {
        requestEvents?.('unknown-write');
        throw new ApiError(
          'Resultado desconocido. Consulta el estado actualizado antes de repetir la operación.',
          response.status,
          'unknown',
        );
      }
      const code =
        typeof payload === 'object' &&
        payload !== null &&
        'code' in payload &&
        typeof payload.code === 'string'
          ? payload.code
          : undefined;
      throw new ApiError(message, response.status, 'rejected', code);
    }
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    if (version === sessionVersion) {
      setConnectionStatus('lost');
      if (isWrite) requestEvents?.('unknown-write');
    }
    throw new ApiError(
      isWrite
        ? 'Resultado desconocido. Consulta el estado actualizado antes de repetir la operación.'
        : 'No pudimos conectar con RuTeam. Comprueba tu conexión e inténtalo de nuevo.',
      0,
      'unknown',
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
  }
}

function apiUrl(path: string) {
  const baseUrl: unknown = Constants.expoConfig?.extra?.apiUrl;
  if (typeof baseUrl !== 'string' || !baseUrl.startsWith('http'))
    throw new ApiError(
      'El servicio de RuTeam no está disponible.',
      0,
      'not-sent',
    );
  return baseUrl.replace(/\/$/, '') + path;
}

function isProtectedPath(path: string) {
  return (
    !path.startsWith('/auth/') ||
    /^\/auth\/(onboarding|me|lifecycle(?!\/(status|recover)))(\/|$|\?)/.test(
      path,
    )
  );
}
function clientHeaders(): Record<string, string> {
  return {
    'x-ruteam-client': Platform.OS === 'web' ? 'web' : 'native',
    ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
  };
}
export function openApiStream(signal: AbortSignal) {
  return expoFetch(apiUrl('/realtime'), {
    headers: { ...clientHeaders(), Accept: 'text/event-stream' },
    credentials: 'include',
    signal,
  });
}
