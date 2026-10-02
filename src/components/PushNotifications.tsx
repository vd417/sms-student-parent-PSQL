import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '@/navigation/navigationRef';
import { goToNotice, type NoticeAudience } from '@/lib/noticeRoute';
import { pushDestinationKind, pushPlatform } from '@/lib/push';
import { registerForPushNotificationsAsync } from '@/services/push/register';
import { services } from '@/services';
import { useAuth } from '@/providers/AuthProvider';

if (pushPlatform()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

/** Routes a tapped notification to its screen. No-op until the navigator is ready. */
export function routeFromResponse(
  response: Notifications.NotificationResponse | null,
  audience: NoticeAudience,
): void {
  if (!response || !navigationRef.isReady()) return;
  const data = response.notification.request.content.data;
  goToNotice(navigationRef, pushDestinationKind(data), audience);
}

/** Authed-only: registers the device token on login and routes bus-push taps. Renders nothing. */
export function PushNotifications() {
  const { role } = useAuth();
  const audience: NoticeAudience = role === 'parent' ? 'parent' : 'student';
  const registered = useRef(false);

  useEffect(() => {
    if (!registered.current) {
      registered.current = true;
      registerForPushNotificationsAsync().then((reg) => {
        if (reg) {
          services.devices
            .register({ expoPushToken: reg.token, platform: reg.platform })
            .catch(() => {});
        }
      });
    }

    // expo-notifications listeners are native-only; skip them on web/unsupported
    // platforms so a failing call can't crash startup (mirrors the best-effort contract).
    if (!pushPlatform()) return;

    const sub = Notifications.addNotificationResponseReceivedListener((resp) =>
      routeFromResponse(resp, audience),
    );
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => routeFromResponse(resp, audience))
      .catch(() => {});
    return () => sub.remove();
  }, [audience]);

  return null;
}
