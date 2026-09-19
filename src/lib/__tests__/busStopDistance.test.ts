import { busToStopMeters, formatStopDistance, metersBetween } from '../busStopDistance';

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

describe('busToStopMeters', () => {
  it('keeps a server-provided distance', () => {
    expect(busToStopMeters(900, { lat: 1, lng: 1 }, { lat: 2, lng: 2 })).toBe(900);
  });

  it('computes meters from coordinates when the API omits distance', () => {
    const meters = busToStopMeters(null, { lat: 28.6, lng: 77.3 }, { lat: 28.61, lng: 77.31 });
    expect(meters).toBeGreaterThan(1000);
    expect(meters).toBeLessThan(2000);
  });
});

describe('metersBetween', () => {
  it('measures you → bus when both points exist', () => {
    const meters = metersBetween({ lat: 28.6, lng: 77.3 }, { lat: 28.605, lng: 77.305 });
    expect(meters).toBeGreaterThan(0);
    expect(metersBetween({ lat: null, lng: 1 }, { lat: 2, lng: 2 })).toBeNull();
  });
});
