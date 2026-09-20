import { formatDueLabel, formatDueTime, homeworkDueChip } from '../homeworkDue';

describe('formatDueLabel', () => {
  const now = new Date(2026, 7, 13, 10, 52); // 13 Aug 2026

  it('maps an ISO date to Today / Tomorrow / short month', () => {
    expect(formatDueLabel('2026-08-13', now)).toBe('Today');
    expect(formatDueLabel('2026-08-14', now)).toBe('Tomorrow');
    expect(formatDueLabel('2026-08-20', now)).toBe('Aug 20');
  });

  it('leaves already-friendly labels alone', () => {
    expect(formatDueLabel('Today', now)).toBe('Today');
  });
});

describe('homeworkDueChip', () => {
  const now = new Date(2026, 7, 13, 10, 52);

  it('uses due labels for open work', () => {
    expect(homeworkDueChip({ status: 'todo', due: '2026-08-13' }, now)).toEqual({
      label: 'Today',
      kind: 'urgent',
    });
    expect(homeworkDueChip({ status: 'progress', due: '2026-08-14' }, now)).toEqual({
      label: 'Tomorrow',
      kind: 'soon',
    });
  });

  it('shows submitted and graded instead of the due date', () => {
    expect(homeworkDueChip({ status: 'submitted', due: '2026-08-10' }, now)).toEqual({
      label: 'Submitted',
      kind: 'done',
    });
    expect(
      homeworkDueChip({ status: 'graded', due: '2026-08-10', grade: 'A' }, now),
    ).toEqual({ label: 'Graded · A', kind: 'done' });
  });
});

describe('formatDueTime', () => {
  it('formats 24h times for display', () => {
    expect(formatDueTime('17:00')).toBe('5:00 PM');
    expect(formatDueTime('11:59 PM')).toBe('11:59 PM');
  });
});
