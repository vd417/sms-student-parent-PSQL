import { Platform } from 'react-native';
import { pushDestinationKind, pushPlatform } from '@/lib/push';

describe('pushPlatform', () => {
  it('returns the OS for ios and android', () => {
    const r = pushPlatform();
    expect(['ios', 'android']).toContain(r);
  });

  it('returns null on web', () => {
    const spy = jest.replaceProperty(Platform, 'OS', 'web' as typeof Platform.OS);
    expect(pushPlatform()).toBeNull();
    spy.restore();
  });
});

describe('pushDestinationKind', () => {
  it('maps a bus alert payload to bus', () => {
    expect(pushDestinationKind({ kind: 'approaching', trip_id: 't1' })).toBe('bus');
    expect(pushDestinationKind({ kind: 'trip_started', trip_id: 't1' })).toBe('bus');
  });

  it('defaults unknown or empty payloads to bus', () => {
    expect(pushDestinationKind(undefined)).toBe('bus');
    expect(pushDestinationKind(null)).toBe('bus');
    expect(pushDestinationKind({})).toBe('bus');
  });
});
