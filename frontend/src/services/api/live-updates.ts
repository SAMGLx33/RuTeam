import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RealtimeSignal } from '@ruteam/contracts';
import { openApiStream } from './client';

const routes = {
  FEED: ['trip-feed', 'trip-detail', 'available-trips'],
  PERSON: [
    'notification-settings',
    'notifications',
    'notification-list',
    'chat-list',
    'trip-schedules',
    'groups',
    'activity',
    'agenda',
    'my-reservations',
    'economic-history',
    'compensation',
  ],
  TRIP: [
    'chat',
    'chat-list',
    'trip-detail',
    'my-trips',
    'my-reservations',
    'driver-participations',
    'pickup-proposals',
    'trip-operation',
    'trip-location',
    'trip-safety',
    'activity',
    'agenda',
    'trip-environment',
    'mobility-statistics',
    'economic-history',
  ],
  CHAT: ['chat', 'chat-list', 'activity'],
  TRACKING: ['trip-location'],
} as const;
const allKeys = new Set(Object.values(routes).flat() as readonly string[]);
const foreground = () => AppState.currentState !== 'background';
function invalidate(
  client: QueryClient,
  keys: readonly string[],
  tripId?: string,
) {
  const prefixes = new Set(keys);
  const tripQueries = [
    'trip-detail',
    'chat',
    'driver-participations',
    'pickup-proposals',
    'trip-operation',
    'trip-location',
    'trip-safety',
    'trip-environment',
  ];
  void client.invalidateQueries(
    {
      predicate: ({ queryKey }) =>
        typeof queryKey[0] === 'string' &&
        prefixes.has(queryKey[0]) &&
        (!tripId ||
          !tripQueries.includes(queryKey[0]) ||
          queryKey.includes(tripId)),
    },
    { cancelRefetch: false },
  );
}

export function useLiveUpdates(userId: string | undefined, eligible: boolean) {
  const client = useQueryClient();
  useEffect(() => {
    if (!userId || !eligible) return;
    let closed = false;
    let controller: AbortController | undefined;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    const recover = () => {
      void client.invalidateQueries(
        { predicate: ({ queryKey }) => allKeys.has(String(queryKey[0])) },
        { cancelRefetch: false },
      );
    };
    const expire = () => {
      closed = true;
      void client.invalidateQueries({ queryKey: ['me'] });
    };
    const apply = (event: RealtimeSignal) => {
      if (event.kind === 'READY') {
        attempts = 0;
        recover();
      } else if (event.kind === 'SESSION_ENDED') expire();
      else if (event.kind === 'PING') return;
      else if (event.kind in routes)
        invalidate(
          client,
          routes[event.kind],
          'tripId' in event ? event.tripId : undefined,
        );
    };
    const connect = async () => {
      if (closed || controller || !foreground()) return;
      const stream = new AbortController();
      controller = stream;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      const watchdog = () => {
        clearTimeout(timeout);
        timeout = setTimeout(() => stream.abort(), 35000);
      };
      watchdog();
      try {
        const response = await openApiStream(stream.signal);
        if (response.status === 401 || response.status === 403) return expire();
        if (!response.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        while (!closed && !stream.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          watchdog();
          buffer += decoder.decode(value, { stream: true });
          if (buffer.length > 32768) break;
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            if (frame.startsWith('data: '))
              apply(JSON.parse(frame.slice(6)) as RealtimeSignal);
            if (closed) break;
          }
        }
      } catch {
        // Existing query polling continues during reconnection.
      } finally {
        clearTimeout(timeout);
        stream.abort();
        controller = undefined;
        if (!closed && foreground())
          retry = setTimeout(
            () => void connect(),
            Math.min(30000, 1000 * 2 ** attempts++),
          );
      }
    };
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        clearTimeout(retry);
        if (!closed && !controller) void connect();
      }
      if (state === 'background') {
        controller?.abort();
        clearTimeout(retry);
      }
    });
    void connect();
    return () => {
      closed = true;
      controller?.abort();
      clearTimeout(retry);
      app.remove();
    };
  }, [client, userId, eligible]);
}
