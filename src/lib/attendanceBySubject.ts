import type { PeriodAttendanceEntry } from '@/models';
import { normalizeSubjectName } from './belongsToSubject';

export type SubjectAttendance = {
  subject: string;
  subjectId?: string;
  present: number;
  late: number;
  absent: number;
  leave: number;
  marked: number;
  pct: number | null;
};

function bucketKey(row: PeriodAttendanceEntry): string {
  const name = normalizeSubjectName(row.subject);
  if (name) return `name:${name}`;
  if (row.subjectId) return `id:${row.subjectId}`;
  return `row:${row.id}`;
}

function statusCount(status: string): Pick<SubjectAttendance, 'present' | 'late' | 'absent' | 'leave'> {
  const s = status.trim().toLowerCase();
  return {
    present: s === 'present' || s === 'p' ? 1 : 0,
    late: s === 'late' || s === 'l' ? 1 : 0,
    absent: s === 'absent' || s === 'a' ? 1 : 0,
    leave: s === 'leave' || s === 'v' ? 1 : 0,
  };
}

/** Official % = (present + late) / marked periods, same as SaaS summary. */
export function attendanceBySubject(rows: PeriodAttendanceEntry[]): SubjectAttendance[] {
  const bag = new Map<string, SubjectAttendance>();
  for (const row of rows) {
    const key = bucketKey(row);
    const add = statusCount(row.status);
    const cur = bag.get(key) ?? {
      subject: row.subject || 'Subject',
      subjectId: row.subjectId,
      present: 0,
      late: 0,
      absent: 0,
      leave: 0,
      marked: 0,
      pct: null,
    };
    const next: SubjectAttendance = {
      subject: cur.subject || row.subject || 'Subject',
      subjectId: cur.subjectId || row.subjectId,
      present: cur.present + add.present,
      late: cur.late + add.late,
      absent: cur.absent + add.absent,
      leave: cur.leave + add.leave,
      marked: cur.marked + 1,
      pct: null,
    };
    next.pct = next.marked > 0
      ? +(((next.present + next.late) / next.marked) * 100).toFixed(1)
      : null;
    bag.set(key, next);
  }
  return [...bag.values()].sort((a, b) => a.subject.localeCompare(b.subject));
}

export function attendanceForSubject(
  rows: PeriodAttendanceEntry[],
  subject: { id?: string; name: string },
): SubjectAttendance | undefined {
  const wantId = (subject.id ?? '').trim();
  const wantName = normalizeSubjectName(subject.name);
  return attendanceBySubject(rows).find((g) => {
    if (wantId && g.subjectId && g.subjectId === wantId) return true;
    return wantName.length > 0 && normalizeSubjectName(g.subject) === wantName;
  });
}
