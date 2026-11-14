import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CurrentUser,
  DemoLoginInput,
  DemoLoginResponse,
} from '@ruteam/contracts';
import { api, ApiError, setSessionToken } from '../services/api/client';
import { readToken, writeToken } from '../services/api/session-storage';
interface SessionContextValue {
  user: CurrentUser | null;
  accessDenied: boolean;
  loading: boolean;
  error: string | null;
  signIn: (identity: DemoLoginInput['identity']) => Promise<void>;
  signOut: () => Promise<void>;
  retry: () => void;
}
const SessionContext = createContext<SessionContextValue | null>(null);
export function SessionProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  useEffect(() => {
    let mounted = true;
    readToken()
      .then((token) => {
        if (mounted) {
          setSessionToken(token);
          setReady(true);
        }
      })
      .catch(() => {
        if (mounted) {
          setStorageError(
            'No pudimos recuperar la sesión segura. Puedes iniciar una nueva.',
          );
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);
  const me = useQuery({
    queryKey: ['me'],
    enabled: ready,
    queryFn: async () => {
      try {
        return await api<CurrentUser>('/auth/me');
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
    staleTime: 0,
    refetchInterval: 60000,
  });
  async function signIn(identity: DemoLoginInput['identity']): Promise<void> {
    await client.cancelQueries({ queryKey: ['me'] });
    const session = await api<DemoLoginResponse>('/auth/demo/login', {
      method: 'POST',
      body: { identity },
    });
    await writeToken(session.token ?? null);
    setSessionToken(session.token ?? null);
    // Leer /auth/me de la API es obligatorio; no presentar sólo el resultado de login.
    const user = await api<CurrentUser>('/auth/me');
    client.setQueryData(['me'], user);
    setStorageError(null);
  }
  async function signOut(): Promise<void> {
    try {
      await api<void>('/auth/logout', { method: 'POST' });
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) throw error;
    }
    await client.cancelQueries();
    await writeToken(null);
    setSessionToken(null);
    // Mantener el query observado para que el logout publique null inmediatamente.
    client.setQueryData(['me'], null);
    client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'me' });
  }
  return (
    <SessionContext.Provider
      value={{
        accessDenied: me.error instanceof ApiError && me.error.status === 403,
        user: me.isError ? null : (me.data ?? null),
        loading: !ready || me.isPending,
        error: me.error?.message ?? storageError,
        signIn,
        signOut,
        retry: () => {
          void me.refetch();
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
