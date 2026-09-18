/** SignalR live events for the student/parent app. */

export function liveHubUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  const origin = trimmed.replace(/\/v\d+$/i, '');
  return `${origin}/hubs/live`;
}

export function transportFleetHubUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  const origin = trimmed.replace(/\/v\d+$/i, '');
  return `${origin}/hubs/transport-fleet`;
}

export function liveEventType(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const row = payload as Record<string, unknown>;
  const raw = row.type ?? row.Type;
  return typeof raw === 'string' ? raw.trim().toLowerCase() : '';
}

/** Query-key prefixes to invalidate for a live event type. */
export function liveEventQueryKeys(type: string): readonly (readonly unknown[])[] {
  switch (type.trim().toLowerCase()) {
    case 'attendance':
      return [
        ['parent', 'today'],
        ['parent', 'attendance'],
        ['student', 'today'],
        ['student', 'timetable'],
        ['notifications'],
        ['announcements'],
      ];
    case 'chat':
      return [['threads'], ['messages'], ['notifications'], ['announcements']];
    case 'announcement':
      return [['announcements'], ['notifications']];
    case 'notification':
      return [['notifications'], ['announcements']];
    case 'homework':
      return [['homework'], ['notifications']];
    case 'grades':
    case 'exams':
      return [['grades'], ['exams'], ['notifications']];
    case 'timetable':
      return [
        ['student', 'timetable'],
        ['student', 'today'],
        ['parent', 'today'],
        ['subjects'],
        ['notifications'],
      ];
    case 'fees':
      return [['parent', 'fees'], ['notifications']];
    case 'leave':
      return [['parent', 'leave'], ['notifications']];
    case 'transport':
      return [['parent', 'transport'], ['notifications']];
    default:
      return [];
  }
}
