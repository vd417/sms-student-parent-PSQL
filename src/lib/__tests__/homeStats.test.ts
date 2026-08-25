import { formatHomeAvg, formatHomeAttn, formatHomeRank } from '../homeStats';

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
});
