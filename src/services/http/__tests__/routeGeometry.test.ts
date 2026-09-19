import * as client from '@/api/client';
import { getRouteGeometry } from '@/services/http/routeGeometry';

describe('httpRouteGeometry', () => {
  afterEach(() => jest.restoreAllMocks());

  it('gets route geometry for a route id', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      route_id: 'route-1',
      status: 'available',
      format: 'polyline6',
      geometry: 'abc123',
      distance_meters: 4200,
      duration_seconds: 900,
      stop_sequence_hash: 'hash-1',
      generated_at: '2026-09-18T06:00:00Z',
    } as any);

    const result = await getRouteGeometry('route-1');

    expect(spy.mock.calls[0][0]).toBe('/transport/routes/route-1/geometry');
    expect(result).toEqual({
      routeId: 'route-1',
      status: 'available',
      format: 'polyline6',
      geometry: 'abc123',
      distanceMeters: 4200,
      durationSeconds: 900,
      stopSequenceHash: 'hash-1',
      generatedAt: '2026-09-18T06:00:00Z',
    });
  });

  it('maps an unavailable route with null geometry fields', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      route_id: 'route-2',
      status: 'unavailable',
      format: null,
      geometry: null,
      distance_meters: null,
      duration_seconds: null,
      stop_sequence_hash: 'hash-2',
      generated_at: null,
    } as any);

    const result = await getRouteGeometry('route-2');

    expect(spy.mock.calls[0][0]).toBe('/transport/routes/route-2/geometry');
    expect(result).toEqual({
      routeId: 'route-2',
      status: 'unavailable',
      format: null,
      geometry: null,
      distanceMeters: null,
      durationSeconds: null,
      stopSequenceHash: 'hash-2',
      generatedAt: null,
    });
  });
});
