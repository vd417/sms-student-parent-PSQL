import { attendanceBySubject } from '../attendanceBySubject';
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
