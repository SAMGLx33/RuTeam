import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  Account,
  AccountSessionResponse,
  LoginInput,
  OnboardingInput,
} from '@ruteam/contracts';
import { api, ApiError, setSessionToken } from '../services/api/client';
import { readToken, writeToken } from '../services/api/session-storage';

interface SessionContextValue {
  user: Account | null;
  loading: boolean;
  error: string | null;
  signIn: (input: LoginInput) => Promise<void>;
  signOut: () => Promise<void>;
  saveOnboarding: (input: OnboardingInput) => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);
const accountKey = ['me'];

export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    void readToken()
      .then((token) => {
        if (mounted) setSessionToken(token);
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

  const account = useQuery({
    queryKey: accountKey,
    enabled: ready,
    queryFn: async () => {
      try {
        return await api<Account>('/auth/account');
      } catch (error) {
        if (error instanceof ApiError && [401, 403].includes(error.status))
          return null;
        throw error;
      }
    },
    refetchInterval: 60000,
  });

  async function signIn(input: LoginInput) {
    const session = await api<AccountSessionResponse>('/auth/login', {
      method: 'POST',
      body: input,
    });
    await client.cancelQueries();
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
    await writeToken(session.token ?? null);
    setSessionToken(session.token ?? null);
    client.setQueryData(accountKey, await api<Account>('/auth/account'));
    setStorageError(null);
  }

  async function signOut() {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (!(error instanceof ApiError && [401, 403].includes(error.status)))
        throw error;
    }
    await client.cancelQueries();
    await writeToken(null);
    setSessionToken(null);
    client.setQueryData(accountKey, null);
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
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
        user: account.isError ? null : (account.data ?? null),
        loading: !ready || account.isPending,
        error: account.error?.message ?? storageError,
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
