import { dash, formatDob } from '../personalInfo';

describe('dash', () => {
  it('shows an em dash for blank values', () => {
    expect(dash('')).toBe('—');
    expect(dash(null)).toBe('—');
    expect(dash('  ')).toBe('—');
    expect(dash('IV-B')).toBe('IV-B');
    expect(dash(12)).toBe('12');
  });
});

describe('formatDob', () => {
  it('formats an ISO date for display', () => {
    expect(formatDob('2015-03-22')).toBe(
      new Date(2015, 2, 22).toLocaleDateString(undefined, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }),
    );
  });

  it('leaves already-friendly labels alone', () => {
    expect(formatDob('22 Mar 2015')).toBe('22 Mar 2015');
    expect(formatDob('')).toBe('—');
  });
});
