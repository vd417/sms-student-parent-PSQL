import { Platform } from 'react-native';
import { render } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';

import { PushNotifications } from '@/components/PushNotifications';

jest.mock('@/providers/AuthProvider', () => ({ useAuth: () => ({ role: 'parent' }) }));
jest.mock('@/services/push/register', () => ({
  registerForPushNotificationsAsync: jest.fn(async () => null),
}));

describe('PushNotifications platform guard', () => {
  afterEach(() => jest.clearAllMocks());

  it('does not wire notification listeners on web (unsupported platform)', () => {
    const os = jest.replaceProperty(Platform, 'OS', 'web' as typeof Platform.OS);
    render(<PushNotifications />);
    expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
    expect(Notifications.getLastNotificationResponseAsync).not.toHaveBeenCalled();
    os.restore();
  });

  it('wires the response listener on a native platform', () => {
    render(<PushNotifications />);
    expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledTimes(1);
  });
});
