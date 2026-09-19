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
