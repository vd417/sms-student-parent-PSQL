import {
  attendanceBySubject,
  isAbsentStatus,
  periodsForDate,
  statusForTimetableSlot,
} from '../attendanceBySubject';
import type { PeriodAttendanceEntry } from '@/models';

describe('attendanceBySubject', () => {
  const rows: PeriodAttendanceEntry[] = [
    { id: '1', date: '2026-08-10', period: 1, subject: 'Mathematics', subjectId: 'm', status: 'present' },
    { id: '2', date: '2026-08-10', period: 2, subject: 'Maths', subjectId: 'm', status: 'absent' },
    { id: '3', date: '2026-08-11', period: 1, subject: 'Music', subjectId: 'mu', status: 'late' },
    { id: '4', date: '2026-08-11', period: 3, subject: 'Music', status: 'leave' },
  ];

  it('groups period marks by subject and computes official %', () => {
    const grouped = attendanceBySubject(rows);
    expect(grouped.map((g) => g.subject).sort()).toEqual(['Mathematics', 'Music']);

    const math = grouped.find((g) => g.subject === 'Mathematics')!;
    expect(math.marked).toBe(2);
    expect(math.present).toBe(1);
    expect(math.absent).toBe(1);
    expect(math.pct).toBe(50);

    const music = grouped.find((g) => g.subject === 'Music')!;
    expect(music.marked).toBe(2);
    expect(music.present).toBe(0);
    expect(music.late).toBe(1);
    expect(music.leave).toBe(1);
    expect(music.pct).toBe(50);
  });

  it('returns empty when nothing is marked', () => {
    expect(attendanceBySubject([])).toEqual([]);
  });
});

describe('statusForTimetableSlot', () => {
  const today = '2026-08-26';
  const rows: PeriodAttendanceEntry[] = [
    { id: '1', date: today, period: 1, subject: 'Mathematics', subjectId: 'm', status: 'present' },
    { id: '2', date: today, period: 2, subject: 'Computer', subjectId: 'c', status: 'absent' },
    { id: '3', date: today, period: 3, subject: 'English', subjectId: 'e', status: 'late' },
    { id: '4', date: '2026-08-25', period: 2, subject: 'Computer', subjectId: 'c', status: 'present' },
  ];

  it('matches today by period number', () => {
    expect(statusForTimetableSlot(rows, { period: 2, label: 'Computer Sci', subjId: 'c', kind: 'class' }, today))
      .toBe('absent');
    expect(statusForTimetableSlot(rows, { period: 1, label: 'Maths', kind: 'class' }, today))
      .toBe('present');
  });

  it('falls back to subject name when period is missing', () => {
    expect(statusForTimetableSlot(rows, { label: 'English', kind: 'class' }, today)).toBe('late');
  });

  it('ignores other days, breaks, and unmarked slots', () => {
    expect(statusForTimetableSlot(rows, { period: 2, label: 'Computer', kind: 'class' }, '2026-08-25'))
      .toBe('present');
    expect(statusForTimetableSlot(rows, { period: 2, label: 'Computer', kind: 'break' }, today)).toBeNull();
    expect(statusForTimetableSlot(rows, { period: 9, label: 'Art', kind: 'class' }, today)).toBeNull();
  });

  it('treats absent as a missed class', () => {
    expect(isAbsentStatus('absent')).toBe(true);
    expect(isAbsentStatus('present')).toBe(false);
    expect(isAbsentStatus(null)).toBe(false);
  });
});

describe('periodsForDate', () => {
  const rows: PeriodAttendanceEntry[] = [
    { id: '2', date: '2026-09-18', period: 3, subject: 'Physics', status: 'absent' },
    { id: '1', date: '2026-09-18T00:00:00', period: 1, subject: 'Maths', status: 'present' },
    { id: '3', date: '2026-09-17', period: 1, subject: 'English', status: 'present' },
  ];

  it('returns that day’s periods in order, ignoring other dates', () => {
    expect(periodsForDate(rows, '2026-09-18').map((r) => `${r.period}:${r.subject}`)).toEqual([
      '1:Maths',
      '3:Physics',
    ]);
  });
});
