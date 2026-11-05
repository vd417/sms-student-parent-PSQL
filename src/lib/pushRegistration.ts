import { Platform } from 'react-native';
import { API_BASE_URL } from '@/api/config';
import { getAuthToken } from '@/api/client';

let registeredToken = '';
let watchingRefresh = false;

async function postToken(token: string, app: 'student' | 'teacher' | 'staff'): Promise<void> {
  const access = getAuthToken();
  if (!access || token.length < 20) return;
  registeredToken = token;
  await fetch(`${API_BASE_URL}/push-devices`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${access}`,
    },
    body: JSON.stringify({
      token,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      app,
    }),
  });
}

/** Drops this phone's token. Call before the auth header is cleared. */
export async function unregisterDevicePush(): Promise<void> {
  const token = registeredToken;
  const access = getAuthToken();
  registeredToken = '';
  if (!token || !access) return;
  try {
    await fetch(`${API_BASE_URL}/push-devices`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access}`,
      },
      body: JSON.stringify({ token }),
    });
  } catch {
    /* logout still continues */
  }
}

/** Registers this phone for banners. Skipped in tests and on web. */
export async function registerDevicePush(app: 'student' | 'teacher' | 'staff'): Promise<void> {
  if (process.env.JEST_WORKER_ID) return;
  if (Platform.OS === 'web') return;
  const access = getAuthToken();
  if (!access) return;
  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    const existing = await Notifications.getPermissionsAsync();
    const granted =
      existing.status === 'granted'
        ? existing
        : await Notifications.requestPermissionsAsync();
    if (granted.status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Alerts',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
    const device = await Notifications.getDevicePushTokenAsync();
    const token = typeof device.data === 'string' ? device.data : '';
    if (token.length < 20) return;
    await postToken(token, app);
    if (!watchingRefresh) {
      watchingRefresh = true;
      Notifications.addPushTokenListener((next) => {
        const refreshed = typeof next.data === 'string' ? next.data : '';
        if (refreshed.length < 20 || refreshed === registeredToken) return;
        void postToken(refreshed, app);
      });
    }
  } catch {
    /* a missing permission or a cold GPS-less emulator must not block login */
  }
}
