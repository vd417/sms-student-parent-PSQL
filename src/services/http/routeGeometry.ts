import { apiFetch } from '@/api/client';

/** Road-following route geometry, mapped from the wire (snake_case) shape. */
export interface RouteGeometryDTO {
  routeId: string;
  status: 'available' | 'unavailable';
  format: string | null;
  geometry: string | null;
  distanceMeters: number | null;
  durationSeconds: number | null;
  stopSequenceHash: string;
  generatedAt: string | null;
}

interface RouteGeometryWireDTO {
  route_id: string;
  status: 'available' | 'unavailable';
  format?: string | null;
  geometry?: string | null;
  distance_meters?: number | null;
  duration_seconds?: number | null;
  stop_sequence_hash: string;
  generated_at?: string | null;
}

/** GET /transport/routes/{routeId}/geometry — road-following geometry for the bus map. */
export async function getRouteGeometry(routeId: string): Promise<RouteGeometryDTO> {
  const wire = await apiFetch<RouteGeometryWireDTO>(
    `/transport/routes/${encodeURIComponent(routeId)}/geometry`,
  );
  return {
    routeId: wire.route_id,
    status: wire.status,
    format: wire.format ?? null,
    geometry: wire.geometry ?? null,
    distanceMeters: wire.distance_meters ?? null,
    durationSeconds: wire.duration_seconds ?? null,
    stopSequenceHash: wire.stop_sequence_hash,
    generatedAt: wire.generated_at ?? null,
  };
}
