import { formatStopDistance } from '../busStopDistance';

describe('formatStopDistance', () => {
  it('shows meters under 1 km', () => {
    expect(formatStopDistance(850)).toBe('850 m away');
  });

  it('shows kilometers at and above 1 km', () => {
    expect(formatStopDistance(1000)).toBe('1.0 km away');
    expect(formatStopDistance(12500)).toBe('13 km away');
  });

  it('returns null when unknown', () => {
    expect(formatStopDistance(null)).toBeNull();
    expect(formatStopDistance(-4)).toBeNull();
  });
});
