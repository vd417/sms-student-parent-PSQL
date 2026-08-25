import { enabledWhenOwnOrChild, qk } from '../keys';

describe('enabledWhenOwnOrChild', () => {
  it('keeps student (own) queries enabled when no id is passed', () => {
    expect(enabledWhenOwnOrChild(undefined)).toBe(true);
  });

  it('waits for a real child id instead of firing /students/me', () => {
    expect(enabledWhenOwnOrChild('')).toBe(false);
    expect(enabledWhenOwnOrChild('sis-1')).toBe(true);
  });
});

describe('query keys', () => {
  it('scopes parent child data by SIS id, not admission no', () => {
    expect(qk.childToday('sis-a')).not.toEqual(qk.childToday('sis-b'));
    expect(qk.homework('sis-a')).not.toEqual(qk.homework('sis-b'));
    expect(qk.fees('sis-a')).not.toEqual(qk.fees('sis-b'));
    expect(qk.attendance('sis-a')).not.toEqual(qk.attendance('sis-b'));
    expect(qk.timetable('sis-a')).not.toEqual(qk.timetable('sis-b'));
    expect(qk.studentProfile('sis-a')).not.toEqual(qk.studentProfile('sis-b'));
  });
});
