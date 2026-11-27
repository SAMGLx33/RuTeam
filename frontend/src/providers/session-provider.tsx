import { useLiveUpdates } from '../services/api/live-updates';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { focusManager, useQuery, useQueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';
import type {
  Account,
  AccountSessionResponse,
  LoginInput,
  OnboardingInput,
} from '@ruteam/contracts';
import {
  api,
  ApiError,
  listenApiEvents,
  setSessionToken,
} from '../services/api/client';
import {
  useConnectionStatus,
  type ConnectionStatus,
} from '../services/api/connection-status';
import { readToken, writeToken } from '../services/api/session-storage';
import { revokeLocalPushForSession } from '../services/notifications/push-installation';

interface SessionContextValue {
  user: Account | null;
  loading: boolean;
  error: string | null;
  connection: ConnectionStatus;
  reconnectingLive: boolean;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  saveOnboarding: (input: OnboardingInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const accountKey = ['me'];
const privateQueries = {
  predicate: (query: { queryKey: readonly unknown[] }) =>
    query.queryKey[0] !== 'me',
};
const offlineReadLifetimeMs = 5 * 60000;

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const connection = useConnectionStatus();
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const hadSession = useRef(false);
  const needsRefresh = useRef(false);

  const clearPrivateData = useCallback(() => {
    void client.cancelQueries(privateQueries);
    client.removeQueries(privateQueries);
    client.getMutationCache().clear();
  }, [client]);

  const revalidateSession = useCallback(() => {
    if (!client.getQueryData(accountKey)) return;
    clearPrivateData();
    void client.resetQueries({ queryKey: accountKey });
  }, [clearPrivateData, client]);

  useEffect(() => {
    let mounted = true;
    void readToken()
      .then((token) => {
        if (mounted) {
          hadSession.current = token !== null;
          setSessionToken(token);
        }
      })
      .catch(() => {
        if (mounted)
          setStorageError('No pudimos recuperar la sesión guardada.');
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(
    () =>
      listenApiEvents((event) => {
        if (event === 'unauthorized') revalidateSession();
        else
          void client.invalidateQueries(privateQueries, {
            cancelRefetch: false,
          });
      }),
    [client, revalidateSession],
  );

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const listener = AppState.addEventListener('change', (state) =>
      focusManager.setFocused(state === 'active'),
    );
    return () => {
      listener.remove();
      focusManager.setFocused(undefined);
    };
  }, []);

  useEffect(() => {
    if (connection === 'lost') {
      needsRefresh.current = true;
    } else if (connection === 'reconnecting' || needsRefresh.current) {
      needsRefresh.current = connection !== 'available';
      void client.invalidateQueries({}, { cancelRefetch: false });
    }
  }, [client, connection]);

  const account = useQuery({
    queryKey: accountKey,
    enabled: ready,
    queryFn: async ({ signal }) => {
      try {
        const updated = await api<Account>('/auth/account', { signal });
        const previous = client.getQueryData<Account>(accountKey);
        if (
          previous &&
          (previous.id !== updated.id ||
            previous.capabilities.passenger !==
              updated.capabilities.passenger ||
            previous.capabilities.driverAccess !==
              updated.capabilities.driverAccess)
        ) {
          clearPrivateData();
        }
        hadSession.current = true;
        setExpired(false);
        return updated;
      } catch (error) {
        if (
          !signal.aborted &&
          error instanceof ApiError &&
          [401, 403].includes(error.status)
        ) {
          if (hadSession.current) {
            hadSession.current = false;
            setSessionToken(null);
            clearPrivateData();
            setExpired(true);
            await writeToken(null).catch(() =>
              setStorageError('No pudimos limpiar la sesión del dispositivo.'),
            );
          }
          return null;
        }
        throw error;
      }
    },
    refetchInterval: connection === 'available' ? 60000 : 8000,
  });

  const { data: currentAccount, dataUpdatedAt } = account;
  useEffect(() => {
    if (!currentAccount || connection === 'available') return;
    const timer = setTimeout(
      revalidateSession,
      Math.max(0, dataUpdatedAt + offlineReadLifetimeMs - Date.now()),
    );
    return () => clearTimeout(timer);
  }, [connection, currentAccount, dataUpdatedAt, revalidateSession]);

  const user =
    account.isError &&
    !(account.error instanceof ApiError && account.error.status === 0)
      ? null
      : (currentAccount ?? null);
  const reconnectingLive = useLiveUpdates(
    user?.id,
    !!user?.capabilities.passenger,
    revalidateSession,
  );

  async function signIn(input: LoginInput) {
    if (currentAccount) await signOut();
    const session = await api<AccountSessionResponse>('/auth/login', {
      method: 'POST',
      body: input,
    });
    await client.cancelQueries({ queryKey: accountKey });
    clearPrivateData();
    await writeToken(session.token ?? null);
    setSessionToken(session.token ?? null);
    hadSession.current = true;
    await client.invalidateQueries(
      { queryKey: accountKey },
      { throwOnError: true },
    );
    setStorageError(null);
  }

  async function signOut() {
    await revokeLocalPushForSession(currentAccount?.id);
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (!(error instanceof ApiError && [401, 403].includes(error.status)))
        throw error;
    }
    await client.cancelQueries({ queryKey: accountKey });
    setSessionToken(null);
    hadSession.current = false;
    setExpired(false);
    client.setQueryData(accountKey, null);
    clearPrivateData();
    await writeToken(null);
  }

  async function saveOnboarding(input: OnboardingInput) {
    const updated = await api<Account>('/auth/onboarding', {
      method: 'PATCH',
      body: input,
    });
    client.setQueryData(accountKey, updated);
  }

  return (
    <SessionContext.Provider
      value={{
        user,
        loading:
          !ready || (account.isPending && account.fetchStatus !== 'paused'),
        error: expired
          ? 'Tu sesión expiró. Inicia sesión nuevamente.'
          : (account.error?.message ?? storageError),
        connection,
        reconnectingLive,
        signIn,
        signOut,
        saveOnboarding,
        refresh: async () => {
          await account.refetch();
        },
      }}
    >
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionContextValue {
  const session = useContext(SessionContext);
  if (!session) throw new Error('Falta SessionProvider');
  return session;
}
