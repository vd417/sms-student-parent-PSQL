import { ptmDateLabel, toPTM } from '../mappers';

describe('ptmDateLabel', () => {
  it('formats an ISO date like the rest of the PTM screen ("May 3, 2026")', () => {
    expect(ptmDateLabel('2026-05-03')).toBe('May 3, 2026');
  });
  it('passes a non-ISO value through unchanged', () => {
    expect(ptmDateLabel('May 3, 2026')).toBe('May 3, 2026');
  });
});

describe('toPTM', () => {
  it('maps the live /v1/ptm item', () => {
    expect(
      toPTM({
        id: 'm1', date: '2026-10-03', time: '15:00', teacher: 'Ms. A. Krishnan', subject: 'Mathematics',
        child: 's1', mode: 'Video call', status: 'pending',
      }),
    ).toEqual({
      id: 'm1', date: 'Oct 3, 2026', time: '15:00', teacher: 'Ms. A. Krishnan', subj: 'Mathematics',
      child: 's1', mode: 'Video call', status: 'pending',
    });
  });

  it('maps a null subject to an empty string', () => {
    expect(
      toPTM({
        id: 'm2', date: '2026-10-03', time: '15:00', teacher: 'Ms. A. Krishnan', subject: null,
        child: 's1', mode: 'Video call', status: 'pending',
      }),
    ).toEqual({
      id: 'm2', date: 'Oct 3, 2026', time: '15:00', teacher: 'Ms. A. Krishnan', subj: '',
      child: 's1', mode: 'Video call', status: 'pending',
    });
  });
});
