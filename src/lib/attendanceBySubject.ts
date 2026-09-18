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

export type TimetableSlotRef = {
  period?: number;
  label: string;
  subjId?: string;
  kind?: string;
};

function slotMatchesRow(row: PeriodAttendanceEntry, slot: TimetableSlotRef): boolean {
  if (slot.subjId && row.subjectId && slot.subjId === row.subjectId) return true;
  const wantName = normalizeSubjectName(slot.label);
  return wantName.length > 0 && normalizeSubjectName(row.subject) === wantName;
}

export function periodsForDate(rows: PeriodAttendanceEntry[], date: string): PeriodAttendanceEntry[] {
  const key = date.slice(0, 10);
  return rows
    .filter((r) => r.date.slice(0, 10) === key)
    .sort((a, b) => a.period - b.period);
}

/** Today's period mark for a timetable block, or null if unmarked / not a class. */
export function statusForTimetableSlot(
  rows: PeriodAttendanceEntry[],
  slot: TimetableSlotRef,
  today: string,
): string | null {
  if (slot.kind && slot.kind !== 'class') return null;
  const dayRows = rows.filter((r) => r.date === today);
  if (!dayRows.length) return null;

  if (slot.period != null) {
    const byPeriod = dayRows.filter((r) => r.period === slot.period);
    if (byPeriod.length === 1) return byPeriod[0].status.trim().toLowerCase();
    if (byPeriod.length > 1) {
      const named = byPeriod.find((r) => slotMatchesRow(r, slot));
      return (named ?? byPeriod[0]).status.trim().toLowerCase();
    }
  }

  const match = dayRows.find((r) => slotMatchesRow(r, slot));
  return match ? match.status.trim().toLowerCase() : null;
}

export function isAbsentStatus(status: string | null | undefined): boolean {
  const s = (status ?? '').trim().toLowerCase();
  return s === 'absent' || s === 'a';
}

export function attendancePillTone(status: string): 'present' | 'absent' | 'late' | 'neutral' {
  const s = status.trim().toLowerCase();
  if (s === 'present' || s === 'p') return 'present';
  if (s === 'absent' || s === 'a') return 'absent';
  if (s === 'late' || s === 'l') return 'late';
  return 'neutral';
}
