import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import type { DevicePushToken, NotificationResponse } from 'expo-notifications';
import { useSession } from './session-provider';
import { loadPushNotifications } from '../services/notifications/native-push';
import { getNotificationId } from '../services/notifications/navigation-path';
import { refreshPush } from '../services/notifications/push-installation';

export function NotificationNavigation() {
  const { user } = useSession();
  const accountId = user?.capabilities.passenger ? user.id : null;
  const canNavigate = !!useRootNavigationState()?.key;
  const handled = useRef<string | null>(null);
  const client = useQueryClient();

  useEffect(() => {
    if (!canNavigate) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    void loadPushNotifications()
      .then((notifications) => {
        if (!notifications || disposed) return;
        function open(response: NotificationResponse) {
          if (disposed || !notifications) return;
          const { request } = response.notification;
          const id = getNotificationId(request.content.data);
          if (
            response.actionIdentifier ===
              notifications.DEFAULT_ACTION_IDENTIFIER &&
            id &&
            handled.current !== request.identifier
          ) {
            handled.current = request.identifier;
            router.push(`/open/notice/${id}`);
          }
          notifications.clearLastNotificationResponse();
        }
        notifications.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: false,
            shouldSetBadge: false,
          }),
        });
        const received = notifications.addNotificationReceivedListener(
          ({ request }) => {
            if (!getNotificationId(request.content.data)) return;
            void client.invalidateQueries({ queryKey: ['notifications'] });
            void client.invalidateQueries({ queryKey: ['notification-list'] });
          },
        );
        const tapped =
          notifications.addNotificationResponseReceivedListener(open);
        cleanup = () => {
          received.remove();
          tapped.remove();
          notifications.setNotificationHandler(null);
        };
        const lastResponse = notifications.getLastNotificationResponse();
        if (lastResponse) open(lastResponse);
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [canNavigate, client]);

  useEffect(() => {
    if (!accountId) return;
    let disposed = false;
    let cleanup: (() => void) | undefined;
    function reconcile(token?: DevicePushToken) {
      if (disposed || !accountId) return;
      void refreshPush(accountId, token)
        .catch(() => undefined)
        .finally(() => {
          if (disposed) return;
          void client.invalidateQueries({
            queryKey: ['notification-settings', accountId],
          });
          void client.invalidateQueries({
            queryKey: ['push-installation', accountId],
          });
        });
    }
    void loadPushNotifications()
      .then((notifications) => {
        if (!notifications || disposed) return;
        const token = notifications.addPushTokenListener(reconcile);
        const app = AppState.addEventListener('change', (state) => {
          if (state === 'active') reconcile();
        });
        cleanup = () => {
          token.remove();
          app.remove();
        };
        reconcile();
      })
      .catch(() => undefined);
    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [accountId, client]);

  return null;
}
