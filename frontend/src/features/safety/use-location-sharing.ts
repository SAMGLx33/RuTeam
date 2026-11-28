import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Platform } from 'react-native';
import {
  Accuracy,
  requestForegroundPermissionsAsync,
  watchPositionAsync,
  type LocationObject,
  type LocationSubscription,
} from 'expo-location';
import type {
  TripDriverLocationInput,
  TripTrackingView,
} from '@ruteam/contracts';
import { api, ApiError } from '../../services/api/client';
import type { NavigationFix } from '../trips/route-progress';

const sendIntervalMs = 15000;
const sampleLifetimeMs = 120000;

type Fix = Pick<LocationObject, 'timestamp'> & {
  coords: Pick<
    LocationObject['coords'],
    'accuracy' | 'latitude' | 'longitude' | 'heading' | 'speed'
  >;
};

async function watchForegroundPosition(
  onFix: (fix: Fix) => void,
  onError: () => void,
) {
  if (Platform.OS === 'web') {
    const location = globalThis.navigator?.geolocation;
    if (!location)
      throw new Error('La ubicación no está disponible en este navegador.');
    // SDK 54 web uses different identifiers for its Expo and browser watches.
    const id = location.watchPosition(onFix, onError, { maximumAge: 0 });
    return { remove: () => location.clearWatch(id) };
  }
  return watchPositionAsync(
    { accuracy: Accuracy.Balanced, timeInterval: sendIntervalMs },
    onFix,
    onError,
  );
}

interface Watch {
  controller: AbortController;
  subscription?: LocationSubscription;
  timer?: ReturnType<typeof setTimeout>;
  pending?: TripDriverLocationInput;
  sending?: boolean;
  lastObserved?: number;
}

export function useLocationSharing(
  path: string,
  authorized: boolean,
  refresh: () => void,
  observe?: (fix: NavigationFix | null) => void,
) {
  const watch = useRef<Watch>(null);
  const nextSendAt = useRef(0);
  const latestSent = useRef<string>(undefined);
  const [state, setState] = useState<'idle' | 'starting' | 'active' | 'paused'>(
    'idle',
  );
  const [error, setError] = useState('');

  const pause = useCallback(() => {
    const current = watch.current;
    if (!current) return;
    watch.current = null;
    current.controller.abort();
    current.subscription?.remove();
    clearTimeout(current.timer);
    setState('paused');
    observe?.(null);
  }, [observe]);

  useFocusEffect(useCallback(() => pause, [pause]));
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (appState) => {
      if (
        appState !== 'active' &&
        (appState === 'background' || watch.current?.subscription)
      )
        pause();
    });
    return () => subscription.remove();
  }, [pause]);
  useEffect(() => {
    if (!authorized) pause();
  }, [authorized, pause]);

  async function start() {
    if (!authorized || watch.current || AppState.currentState !== 'active')
      return;
    const current: Watch = { controller: new AbortController() };
    watch.current = current;
    const { signal } = current.controller;
    setError('');
    setState('starting');

    function flush() {
      if (
        signal.aborted ||
        current.sending ||
        current.timer ||
        !current.pending
      )
        return;
      if (AppState.currentState !== 'active') return pause();
      const remaining = nextSendAt.current - Date.now();
      if (remaining > 0) {
        current.timer = setTimeout(() => {
          current.timer = undefined;
          flush();
        }, remaining);
        return;
      }
      const body = current.pending;
      current.pending = undefined;
      if (Date.now() - Date.parse(body.capturedAt) >= sampleLifetimeMs) return;
      current.sending = true;
      nextSendAt.current = Date.now() + sendIntervalMs;
      latestSent.current = body.capturedAt;
      void api(path, { method: 'POST', body, signal })
        .then(refresh)
        .catch((cause: unknown) => {
          if (signal.aborted) return;
          if (cause instanceof ApiError && cause.status === 429) return;
          pause();
          setError(
            cause instanceof Error
              ? cause.message
              : 'La ubicación se pausó al perder la conexión.',
          );
          refresh();
        })
        .finally(() => {
          nextSendAt.current = Math.max(
            nextSendAt.current,
            Date.now() + sendIntervalMs,
          );
          current.sending = false;
          flush();
        });
    }

    try {
      const view = await api<TripTrackingView>(path, { signal });
      if (signal.aborted) return;
      if (!view.canShare)
        throw new Error(
          'Sólo el conductor del viaje en curso puede compartir su ubicación.',
        );
      if (view.sample)
        nextSendAt.current = Math.max(
          nextSendAt.current,
          Date.parse(view.sample.sharedAt) + sendIntervalMs,
        );
      if (AppState.currentState !== 'active') return pause();
      if (Platform.OS !== 'web') {
        const permission = await requestForegroundPermissionsAsync();
        if (signal.aborted) return;
        if (!permission.granted)
          throw new Error(
            'Permite el acceso a la ubicación en los ajustes del dispositivo.',
          );
        if (AppState.currentState !== 'active') return pause();
      }
      const subscription = await watchForegroundPosition(
        ({ coords, timestamp }) => {
          if (
            signal.aborted ||
            AppState.currentState !== 'active' ||
            !Number.isFinite(timestamp)
          )
            return;
          if (observe && timestamp - (current.lastObserved ?? 0) >= 1000) {
            current.lastObserved = timestamp;
            observe({
              timestamp,
              latitude: coords.latitude,
              longitude: coords.longitude,
              accuracy: coords.accuracy,
              heading: coords.heading,
              speed: coords.speed,
            });
          }
          const capturedAt = new Date(timestamp).toISOString();
          if (
            capturedAt <=
            (current.pending?.capturedAt ?? latestSent.current ?? '')
          )
            return;
          current.pending = {
            capturedAt,
            latitude: coords.latitude,
            longitude: coords.longitude,
            ...(typeof coords.accuracy === 'number' &&
              Number.isFinite(coords.accuracy) &&
              coords.accuracy >= 0 &&
              coords.accuracy <= 999999999 && {
                accuracyMeters: coords.accuracy,
              }),
          };
          flush();
        },
        () => {
          if (signal.aborted) return;
          pause();
          setError(
            'No pudimos obtener la ubicación. Comprueba el permiso e inténtalo de nuevo.',
          );
        },
      );
      if (signal.aborted) return subscription.remove();
      current.subscription = subscription;
      if (AppState.currentState !== 'active') return pause();
      setState('active');
    } catch (cause) {
      if (signal.aborted) return;
      pause();
      setError(
        cause instanceof Error
          ? cause.message
          : 'No se pudo activar la ubicación.',
      );
    }
  }

  async function stop() {
    pause();
    const throughCapturedAt = latestSent.current;
    await api(path, {
      method: 'DELETE',
      body: throughCapturedAt ? { throughCapturedAt } : undefined,
    });
    nextSendAt.current = 0;
    setState('idle');
    setError('');
  }

  return { state, error, start, pause, stop };
}
