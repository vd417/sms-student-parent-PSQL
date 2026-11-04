import { Platform } from 'react-native';
import type { NoticeKind } from '@/lib/noticeRoute';

/** The device platform for push registration, or null when push is unsupported (web). */
export function pushPlatform(): 'ios' | 'android' | null {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}

/**
 * Maps a device-push `data` payload to the in-app notice taxonomy used by `goToNotice`.
 * Every backend device push this increment is a bus alert (`data: { kind, trip_id }`),
 * so this is the single place to branch if future pushes carry other kinds.
 */
export function pushDestinationKind(_data: unknown): NoticeKind {
  return 'bus';
}
