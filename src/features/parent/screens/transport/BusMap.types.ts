import type { RouteGeometryDTO } from '@/services/http/routeGeometry';

export type BusMapStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  yours?: boolean;
  passed?: boolean;
  /** 1-based stop number along the route. */
  order?: number;
};

export type BusMapProps = {
  lat: number | null;
  lng: number | null;
  busNo: string;
  trackingStatus?: 'LIVE' | 'DELAYED' | 'OFFLINE';
  motion?: 'moving' | 'stopped' | null;
  speedKmh?: number | null;
  studentStop?: BusMapStop | null;
  stops?: BusMapStop[];
  interactive?: boolean;
  fullscreen?: boolean;
  /** Keep the camera on the moving bus (full-screen live view). */
  follow?: boolean;
  myLat?: number | null;
  myLng?: number | null;
  /** Road geometry when the server has it; otherwise the line follows the stoppages. */
  routeGeometry?: RouteGeometryDTO;
  onPress?: () => void;
  onRecenterReady?: (recenter: () => void) => void;
};

/** Live GPS only. A stop coordinate is never used as a stand-in for the bus. */
export function liveBusCoordinate(
  lat: number | null | undefined,
  lng: number | null | undefined,
): { latitude: number; longitude: number } | null {
  const latitude = asFiniteNumber(lat);
  const longitude = asFiniteNumber(lng);
  if (latitude == null || longitude == null) return null;
  return { latitude, longitude };
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * The decoder implements Google's precision-5 algorithm. The live API names that
 * encoding `google-encoded-polyline`. `polyline6` and other precisions are not safe.
 */
function isSafeGeometryFormat(format: string | null | undefined): boolean {
  if (format == null || format.trim() === '') return true;
  const key = format.trim().toLowerCase();
  return key === 'polyline5' || key === 'google-encoded-polyline' || key === 'encoded-polyline';
}

/** The geometry to trust for drawing a road-following line — null when unavailable or unsafe to decode. */
export function usableRouteGeometry(routeGeometry?: RouteGeometryDTO): RouteGeometryDTO | null {
  if (!routeGeometry) return null;
  if (routeGeometry.status !== 'available') return null;
  if (!routeGeometry.geometry) return null;
  if (!isSafeGeometryFormat(routeGeometry.format)) return null;
  return routeGeometry;
}

/** Whether to show the "Route unavailable" badge — backend said unavailable, or the format safety gate rejected it. */
export function showRouteUnavailableBadge(routeGeometry?: RouteGeometryDTO): boolean {
  if (!routeGeometry) return false;
  if (routeGeometry.status === 'unavailable') return true;
  return (
    routeGeometry.status === 'available' &&
    !!routeGeometry.geometry &&
    !isSafeGeometryFormat(routeGeometry.format)
  );
}
