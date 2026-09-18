import {
  attendancePctFromStatuses,
  deriveTodayAttendance,
  resolveTodayAttendance,
} from '../todayAttendance';

describe('deriveTodayAttendance', () => {
  it('is unmarked when no period is marked', () => {
    expect(deriveTodayAttendance([null, undefined, ''])).toBeNull();
  });

  it('is present when every marked period is present', () => {
    expect(deriveTodayAttendance(['present', 'present', null])).toBe('present');
  });

  it('prefers absent, then late, over present', () => {
    expect(deriveTodayAttendance(['present', 'absent', 'late'])).toBe('absent');
    expect(deriveTodayAttendance(['present', 'late'])).toBe('late');
  });

  it('is leave only when every marked period is leave', () => {
    expect(deriveTodayAttendance(['leave', 'leave'])).toBe('leave');
    expect(deriveTodayAttendance(['leave', 'present'])).toBe('present');
  });
});

describe('resolveTodayAttendance', () => {
  it('shows absent on Home when any class period is absent, even if the daily roll is present', () => {
    expect(resolveTodayAttendance(['present', 'absent'], 'present')).toBe('absent');
  });

  it('shows present when period marks are all present after a correction', () => {
    expect(resolveTodayAttendance(['present', 'present'], 'absent')).toBe('present');
  });

  it('uses the daily roll only when no period is marked', () => {
    expect(resolveTodayAttendance([null, ''], 'present')).toBe('present');
    expect(resolveTodayAttendance([], null)).toBeNull();
  });
});

describe('attendancePctFromStatuses', () => {
  it('returns null when nothing is marked', () => {
    expect(attendancePctFromStatuses([null, 'break'])).toBeNull();
  });

  it('counts present and late as attended', () => {
    expect(attendancePctFromStatuses(['present', 'present', 'late', 'absent'])).toBe(75);
    expect(attendancePctFromStatuses(['present', 'present'])).toBe(100);
  });
});
