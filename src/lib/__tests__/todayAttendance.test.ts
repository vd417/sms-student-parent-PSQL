import {
  attendancePctFromStatuses,
  deriveTodayAttendance,
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

describe('attendancePctFromStatuses', () => {
  it('returns null when nothing is marked', () => {
    expect(attendancePctFromStatuses([null, 'break'])).toBeNull();
  });

  it('counts present and late as attended', () => {
    expect(attendancePctFromStatuses(['present', 'present', 'late', 'absent'])).toBe(75);
    expect(attendancePctFromStatuses(['present', 'present'])).toBe(100);
  });
});
