export type AttendancePreset = 'day' | 'week' | 'month' | 'overall';

function localDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function rangeForPreset(preset: AttendancePreset, now: Date): { from?: string; to?: string } {
  if (preset === 'overall') return {};

  if (preset === 'day') {
    const label = localDateLabel(now);
    return { from: label, to: label };
  }

  if (preset === 'week') {
    const dayOfWeek = now.getDay();
    const diffToMonday = (dayOfWeek + 6) % 7;
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
    const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6);
    return { from: localDateLabel(monday), to: localDateLabel(sunday) };
  }

  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { from: localDateLabel(first), to: localDateLabel(last) };
}
