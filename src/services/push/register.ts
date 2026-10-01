import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushPlatform } from '@/lib/push';

export type DeviceRegistration = { token: string; platform: 'ios' | 'android' };

/**
 * Best-effort: requests notification permission and returns the Expo push token.
 * Returns null (never throws) on web, denied permission, missing projectId, or any
 * native failure — a push setup problem must never break app startup.
 */
export async function registerForPushNotificationsAsync(): Promise<DeviceRegistration | null> {
  const platform = pushPlatform();
  if (!platform) return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, platform };
  } catch {
    return null;
  }
}
