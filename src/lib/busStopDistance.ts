/** Meters from the live bus to the child's assigned stop. */
export function formatStopDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km away`;
}

const EARTH_M = 6371000;

export function haversineMeters(
  from: { lat: number; lng: number },
  to: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(to.lat - from.lat);
  const dLng = toRad(to.lng - from.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(from.lat)) * Math.cos(toRad(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Live bus → assigned stop. Prefers the API distance, else computes from coordinates. */
export function busToStopMeters(
  distanceM: number | null | undefined,
  bus: { lat: number | null; lng: number | null },
  stop: { lat: number | null; lng: number | null },
): number | null {
  if (distanceM != null && Number.isFinite(distanceM) && distanceM >= 0) return distanceM;
  if (bus.lat == null || bus.lng == null || stop.lat == null || stop.lng == null) return null;
  return Math.round(haversineMeters({ lat: bus.lat, lng: bus.lng }, { lat: stop.lat, lng: stop.lng }));
}

export function metersBetween(
  from: { lat: number | null; lng: number | null },
  to: { lat: number | null; lng: number | null },
): number | null {
  if (from.lat == null || from.lng == null || to.lat == null || to.lng == null) return null;
  return Math.round(haversineMeters({ lat: from.lat, lng: from.lng }, { lat: to.lat, lng: to.lng }));
}
