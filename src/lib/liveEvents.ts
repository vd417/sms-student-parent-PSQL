/** SignalR live events for the student/parent app. */

export function liveHubUrl(apiBaseUrl: string): string {
  const trimmed = apiBaseUrl.trim().replace(/\/+$/, '');
  const origin = trimmed.replace(/\/v\d+$/i, '');
  return `${origin}/hubs/live`;
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
      ];
    case 'chat':
      return [['threads'], ['messages']];
    case 'announcement':
      return [['announcements'], ['notifications']];
    case 'notification':
      return [['notifications']];
    case 'homework':
      return [['homework']];
    case 'grades':
    case 'exams':
      return [['grades'], ['exams']];
    case 'timetable':
      return [
        ['student', 'timetable'],
        ['student', 'today'],
        ['parent', 'today'],
        ['subjects'],
      ];
    case 'fees':
      return [['parent', 'fees']];
    case 'leave':
      return [['parent', 'leave']];
    case 'transport':
      return [['parent', 'transport']];
    default:
      return [];
  }
}
