import { formatHomeAvg, formatHomeAttn, formatHomeRank, formatReportOrHomeAvg } from '../homeStats';

describe('home stats labels', () => {
  it('hides unknown average and rank instead of 0% / 0/0', () => {
    expect(formatHomeAvg(0)).toBe('—');
    expect(formatHomeAvg(88)).toBe('88%');
    expect(formatHomeRank(0, 0)).toBe('—');
    expect(formatHomeRank(3, 40)).toBe('3/40');
  });

  it('keeps a real attendance percentage including zero', () => {
    expect(formatHomeAttn(null)).toBe('—');
    expect(formatHomeAttn(0)).toBe('0%');
    expect(formatHomeAttn(100)).toBe('100%');
  });

  it('prefers report-card marks and hides a roster 0% average', () => {
    expect(formatReportOrHomeAvg({ rows: [{ subject: 'Math' }], pct: 87.4 }, 0)).toBe('87%');
    expect(formatReportOrHomeAvg({ rows: [], pct: 0 }, 0)).toBe('—');
    expect(formatReportOrHomeAvg({ rows: [], pct: 0 }, 88)).toBe('88%');
  });
});
