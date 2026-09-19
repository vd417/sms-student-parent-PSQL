import type { RouteGeometryDTO } from '@/services/http/routeGeometry';

export type BusMapStop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  yours?: boolean;
  passed?: boolean;
};

export type BusMapProps = {
  lat: number | null;
  lng: number | null;
  busNo: string;
  trackingStatus?: 'LIVE' | 'DELAYED' | 'OFFLINE';
  motion?: 'moving' | 'stopped' | null;
  studentStop?: BusMapStop | null;
  stops?: BusMapStop[];
  interactive?: boolean;
  fullscreen?: boolean;
  /** Keep the camera on the moving bus (full-screen live view). */
  follow?: boolean;
  myLat?: number | null;
  myLng?: number | null;
  /** Road-following geometry for the assigned route; `unavailable` (or omitted) renders no line + a badge, never the old straight-line fallback. */
  routeGeometry?: RouteGeometryDTO;
  onPress?: () => void;
  onRecenterReady?: (recenter: () => void) => void;
};

/**
 * Only `polyline5` (the standard Google precision-5 algorithm) or an absent `format`
 * (Google's own default) is safe for this app's decoder, which only implements
 * precision-5 decoding. Any other explicit format would silently decode to
 * coordinates that are off by a scale factor, so it must be treated as unsafe.
 */
function isSafeGeometryFormat(format: string | null | undefined): boolean {
  return format == null || format === 'polyline5';
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
