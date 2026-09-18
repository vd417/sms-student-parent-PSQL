import {
  leaveBelongsToChild,
  leaveDateKey,
  leaveStatusLabel,
  leaveStatusTone,
} from '../leaveHistory';

describe('leaveDateKey', () => {
  it('keeps a calendar date and strips a DateTime suffix', () => {
    expect(leaveDateKey('2026-07-01')).toBe('2026-07-01');
    expect(leaveDateKey('2026-07-01T00:00:00')).toBe('2026-07-01');
    expect(leaveDateKey('2026-07-01T00:00:00Z')).toBe('2026-07-01');
  });
});

describe('leaveBelongsToChild', () => {
  it('matches the selected child, ignoring case, and keeps untagged rows', () => {
    expect(leaveBelongsToChild('C1', 'c1')).toBe(true);
    expect(leaveBelongsToChild('c2', 'c1')).toBe(false);
    expect(leaveBelongsToChild(null, 'c1')).toBe(true);
  });
});

describe('leaveStatus', () => {
  it('maps approval states for the history pill', () => {
    expect(leaveStatusLabel('approved')).toBe('Approved');
    expect(leaveStatusTone('rejected')).toBe('absent');
    expect(leaveStatusTone('pending')).toBe('late');
  });
});
