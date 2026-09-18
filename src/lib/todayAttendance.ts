import type { DailyAttendanceStatus } from '@/models';

export function normalizeAttendanceStatus(raw: unknown): DailyAttendanceStatus {
  const status = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (status === 'present' || status === 'p') return 'present';
  if (status === 'absent' || status === 'a') return 'absent';
  if (status === 'late' || status === 'l') return 'late';
  if (status === 'leave' || status === 'v') return 'leave';
  return null;
}

/** Day badge from period marks: absent > late > present > leave. */
export function deriveTodayAttendance(statuses: readonly unknown[]): DailyAttendanceStatus {
  const marked = statuses
    .map(normalizeAttendanceStatus)
    .filter((s): s is Exclude<DailyAttendanceStatus, null> => s != null);
  if (!marked.length) return null;
  if (marked.some((s) => s === 'absent')) return 'absent';
  if (marked.some((s) => s === 'late')) return 'late';
  if (marked.some((s) => s === 'present')) return 'present';
  return 'leave';
}

/** Period marks win the Home chip; daily roll is only the fallback when nothing is marked. */
export function resolveTodayAttendance(
  periodStatuses: readonly unknown[],
  dailyRoll: DailyAttendanceStatus,
): DailyAttendanceStatus {
  return deriveTodayAttendance(periodStatuses) ?? dailyRoll;
}

/** Official % = (present + late) / marked periods. */
export function attendancePctFromStatuses(statuses: readonly unknown[]): number | null {
  let present = 0;
  let late = 0;
  let marked = 0;
  for (const raw of statuses) {
    const status = normalizeAttendanceStatus(raw);
    if (!status) continue;
    marked += 1;
    if (status === 'present') present += 1;
    else if (status === 'late') late += 1;
  }
  if (!marked) return null;
  return +(((present + late) / marked) * 100).toFixed(1);
}
