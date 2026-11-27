import { useEffect, useSyncExternalStore } from 'react';

export type ConnectionStatus = 'available' | 'lost' | 'reconnecting';

let status: ConnectionStatus = 'available';
const listeners = new Set<() => void>();

export function setConnectionStatus(next: ConnectionStatus) {
  if (status === next) return;
  status = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function browserOffline() {
  return typeof window !== 'undefined' && window.navigator?.onLine === false;
}

export function useConnectionStatus(): ConnectionStatus {
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined')
      return;
    const lost = () => setConnectionStatus('lost');
    const reconnect = () => setConnectionStatus('reconnecting');
    if (browserOffline()) lost();
    window.addEventListener('offline', lost);
    window.addEventListener('online', reconnect);
    return () => {
      window.removeEventListener('offline', lost);
      window.removeEventListener('online', reconnect);
    };
  }, []);
  return useSyncExternalStore<ConnectionStatus>(
    subscribe,
    () => status,
    () => 'available',
  );
}
