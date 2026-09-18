/** Meters from the live bus to the child's assigned stop. */
export function formatStopDistance(meters: number | null | undefined): string | null {
  if (meters == null || !Number.isFinite(meters) || meters < 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m away`;
  return `${(meters / 1000).toFixed(meters >= 10000 ? 0 : 1)} km away`;
}
