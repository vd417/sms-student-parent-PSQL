import { useEffect, useState } from 'react';

export type GeoPoint = { lat: number; lng: number };

/** Browser / device GPS for "you are here". Returns null until the user allows location. */
export function useMyLocation(enabled: boolean): { point: GeoPoint | null; ready: boolean } {
  const [point, setPoint] = useState<GeoPoint | null>(null);
  const [ready, setReady] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setReady(true);
      return;
    }
    const geo = typeof navigator !== 'undefined' ? navigator.geolocation : undefined;
    if (!geo) {
      setReady(true);
      return;
    }
    const onOk = (pos: GeolocationPosition) => {
      setPoint({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setReady(true);
    };
    const onErr = () => setReady(true);
    geo.getCurrentPosition(onOk, onErr, { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 });
    const watch = geo.watchPosition(onOk, onErr, { enableHighAccuracy: true, maximumAge: 8000, timeout: 20000 });
    return () => geo.clearWatch(watch);
  }, [enabled]);

  return { point, ready };
}
