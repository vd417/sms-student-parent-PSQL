import type { TodayBlock } from '@/models';
import { heroMeta, pickNowOrNext } from '../nextPeriod';

function cls(partial: Partial<TodayBlock> & { t: string; startMin: number; label: string }): TodayBlock {
  return {
    d: 45,
    kind: 'class',
    ...partial,
  };
}

const music = cls({ t: '8:15 AM', startMin: 8 * 60 + 15, label: 'Music', teacher: 'Amit Yadav', d: 45 });
const maths = cls({ t: '9:05 AM', startMin: 9 * 60 + 5, label: 'Mathematics', room: 'A1', teacher: 'Ravi', d: 45 });
const lunch: TodayBlock = { t: '12:00 PM', startMin: 12 * 60, label: 'Lunch Break', kind: 'break', d: 30 };
const science = cls({ t: '12:30 PM', startMin: 12 * 60 + 30, label: 'Science', teacher: 'Priya', d: 45 });

describe('pickNowOrNext', () => {
  const day = [music, maths, lunch, science];

  it('returns the in-progress class as now, not the first period of the day', () => {
    expect(pickNowOrNext(day, 9 * 60 + 20)).toEqual({ block: maths, phase: 'now' });
  });

  it('returns the next upcoming class before school starts', () => {
    expect(pickNowOrNext(day, 7 * 60)).toEqual({ block: music, phase: 'next' });
  });

  it('skips a current break and returns the following class', () => {
    expect(pickNowOrNext(day, 12 * 60 + 10)).toEqual({ block: science, phase: 'next' });
  });

  it('returns done after the last class ends', () => {
    expect(pickNowOrNext(day, 14 * 60)).toEqual({ block: science, phase: 'done' });
  });

  it('returns null when there are no classes', () => {
    expect(pickNowOrNext([lunch], 10 * 60)).toBeNull();
  });
});

describe('heroMeta', () => {
  it('omits a missing room instead of showing a dash', () => {
    expect(heroMeta(music)).toBe('Amit Yadav');
  });

  it('joins room and teacher', () => {
    expect(heroMeta(maths)).toBe('A1 · Ravi');
  });
});
