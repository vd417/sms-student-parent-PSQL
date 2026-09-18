import { localDateLabel, monthDayKey, rangeForPreset } from '../attendanceRange';

describe('rangeForPreset', () => {
  // 2024-01-01 is a Monday; 2024-01-10 is a Wednesday in the same month.
  const wednesday = new Date(2024, 0, 10);

  it('day preset returns the same from/to date', () => {
    expect(rangeForPreset('day', wednesday)).toEqual({ from: '2024-01-10', to: '2024-01-10' });
  });

  it('week preset returns the Monday-Sunday span containing the date', () => {
    expect(rangeForPreset('week', wednesday)).toEqual({ from: '2024-01-08', to: '2024-01-14' });
  });

  it('month preset returns the first and last day of the month', () => {
    expect(rangeForPreset('month', wednesday)).toEqual({ from: '2024-01-01', to: '2024-01-31' });
  });

  it('overall preset returns an empty range', () => {
    expect(rangeForPreset('overall', wednesday)).toEqual({});
  });

  it('week preset spanning a Sunday still resolves to Monday-Sunday', () => {
    const sunday = new Date(2024, 0, 14);
    expect(rangeForPreset('week', sunday)).toEqual({ from: '2024-01-08', to: '2024-01-14' });
  });
});

describe('monthDayKey', () => {
  it('pads month and day for a calendar cell', () => {
    expect(monthDayKey(2026, 8, 18)).toBe('2026-09-18');
    expect(localDateLabel(new Date(2026, 8, 7))).toBe('2026-09-07');
  });
});
