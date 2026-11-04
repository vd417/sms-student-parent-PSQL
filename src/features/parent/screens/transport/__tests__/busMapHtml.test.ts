import { liveMapSrcDoc } from '../busMapHtml';
import { liveBusCoordinate, usableRouteGeometry } from '../BusMap.types';

describe('liveMapSrcDoc', () => {
  it('builds a real slippy map with the live bus and assigned stop', () => {
    const html = liveMapSrcDoc({
      lat: 28.6,
      lng: 77.3,
      busNo: '12',
      studentStop: { id: 's', name: 'Gate 2', lat: 28.61, lng: 77.31, yours: true },
      stops: [{ id: 'a', name: 'School', lat: 28.62, lng: 77.32 }],
      myLat: 28.59,
      myLng: 77.29,
    });
    expect(html).toContain('tile.openstreetmap.org');
    expect(html).toContain('28.6');
    expect(html).toContain('Gate 2');
    expect(html).toContain('Bus #');
    expect(html).toContain('28.59');
    expect(html).toContain('You');
  });

  it('uses only a real bus coordinate, never a stop stand-in', () => {
    expect(liveBusCoordinate(28.6, 77.3)).toEqual({ latitude: 28.6, longitude: 77.3 });
    expect(liveBusCoordinate('28.6' as unknown as number, '77.3' as unknown as number)).toEqual({
      latitude: 28.6,
      longitude: 77.3,
    });
    expect(liveBusCoordinate(null, 77.3)).toBeNull();
    expect(liveBusCoordinate(Number.NaN, 77.3)).toBeNull();
  });

  it('accepts the live API road path and still rejects a different polyline precision', () => {
    const road = {
      routeId: 'route-1',
      status: 'available' as const,
      format: 'google-encoded-polyline',
      geometry: '_p~iF~ps|U',
      distanceMeters: null,
      durationSeconds: null,
      stopSequenceHash: 'h',
      generatedAt: null,
    };
    expect(usableRouteGeometry(road)?.geometry).toBe('_p~iF~ps|U');
    expect(usableRouteGeometry({ ...road, format: 'polyline6' })).toBeNull();
  });
});
