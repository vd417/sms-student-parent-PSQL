import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GOOGLE_MAP_ID, GOOGLE_MAPS_API_KEY } from '@/api/config';
import { decodePolyline } from '@/lib/decodePolyline';
import { colors, fontFamily, radius } from '@/theme';
import { liveBusCoordinate, showRouteUnavailableBadge, usableRouteGeometry } from './BusMap.types';
import type { BusMapProps, BusMapStop } from './BusMap.types';

export type { BusMapProps } from './BusMap.types';

const ROUTE = '#4361EE';

type LatLng = { lat: number; lng: number };
type GOverlay = { setMap?: (map: unknown) => void; map?: unknown };

function busStatusColor(speedKmh?: number | null, motion?: BusMapProps['motion']) {
  if (typeof speedKmh === 'number' && speedKmh > 3) return '#16a34a';
  if (motion === 'moving') return '#16a34a';
  return '#64748b';
}

let mapsLoader: Promise<void> | null = null;

function mapsApiReady(): boolean {
  const maps = (window as Window & { google?: { maps?: { importLibrary?: unknown } } }).google?.maps;
  return typeof maps?.importLibrary === 'function';
}

/** `loading=async` fires onload before `google.maps` exists. Wait until the API is usable. */
function waitForMapsApi(): Promise<void> {
  if (mapsApiReady()) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const tick = () => {
      if (mapsApiReady()) {
        resolve();
        return;
      }
      if (Date.now() - started > 8000) {
        reject(new Error('map'));
        return;
      }
      window.setTimeout(tick, 40);
    };
    tick();
  });
}

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (mapsApiReady()) return Promise.resolve();
  if (!mapsLoader) {
    mapsLoader = new Promise((resolve, reject) => {
      const finish = () => {
        waitForMapsApi().then(resolve, (error) => {
          mapsLoader = null;
          reject(error);
        });
      };
      const script = document.createElement('script');
      script.dataset.smsMaps = '1';
      script.async = true;
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly&loading=async`;
      script.onload = () => finish();
      script.onerror = () => {
        mapsLoader = null;
        reject(new Error('map'));
      };
      document.head.appendChild(script);
    });
  }
  return mapsLoader;
}

function dropOverlay(overlay: GOverlay) {
  if (typeof overlay.setMap === 'function') overlay.setMap(null);
  else overlay.map = null;
}

function stopPin(stop: BusMapStop, index: number): HTMLDivElement {
  const el = document.createElement('div');
  const yours = Boolean(stop.yours);
  const passed = Boolean(stop.passed);
  el.textContent = String(stop.order ?? index + 1);
  el.title = stop.name;
  el.style.cssText = [
    'width:22px',
    'height:22px',
    'border-radius:11px',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'font:700 10px sans-serif',
    'box-sizing:border-box',
    `background:${yours ? '#2563EB' : '#fff'}`,
    `color:${yours ? '#fff' : '#0f172a'}`,
    `border:2px solid ${passed ? '#16a34a' : yours ? '#1D4ED8' : ROUTE}`,
  ].join(';');
  return el;
}

function busPin(busNo: string, speedKmh: number | null | undefined, motion: BusMapProps['motion']): HTMLDivElement {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;align-items:center;gap:6px';
  const icon = document.createElement('div');
  icon.innerHTML =
    '<svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="4" fill="#FFC107" stroke="#1f2937" stroke-width="1"/><rect x="7" y="4.5" width="10" height="2.5" rx="0.5" fill="#1f2937"/><rect x="7" y="8.5" width="10" height="9" rx="1" fill="#fff9db" stroke="#1f2937" stroke-width="0.6"/><line x1="12" y1="8.5" x2="12" y2="17.5" stroke="#1f2937" stroke-width="0.6"/></svg>';
  const label = document.createElement('div');
  const color = busStatusColor(speedKmh, motion);
  const speed = typeof speedKmh === 'number' ? ` · ${Math.round(speedKmh)} km/h` : '';
  label.textContent = `${busNo}${speed}`;
  label.style.cssText = `background:${color};color:#fff;border-radius:8px;padding:4px 8px;font:700 11px sans-serif;white-space:nowrap`;
  wrap.append(icon, label);
  return wrap;
}

function youPin(): HTMLDivElement {
  const el = document.createElement('div');
  el.title = 'You';
  el.style.cssText =
    'width:16px;height:16px;border-radius:8px;background:#7C3AED;border:2px solid #fff;box-shadow:0 0 0 1px #5B21B6';
  return el;
}

function RouteUnavailableBadge() {
  return (
    <View style={styles.unavailableBadge} pointerEvents="none">
      <Text style={styles.unavailableTxt}>Route unavailable</Text>
    </View>
  );
}

export function BusMap({
  lat,
  lng,
  busNo,
  motion,
  speedKmh,
  studentStop,
  stops = [],
  interactive = true,
  myLat = null,
  myLng = null,
  routeGeometry,
  onPress,
  onRecenterReady,
}: BusMapProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [hostReady, setHostReady] = useState(false);
  const mapRef = useRef<{ fitBounds: (b: unknown, p?: number) => void; setCenter: (p: LatLng) => void; setZoom: (z: number) => void } | null>(null);
  const overlays = useRef<GOverlay[]>([]);
  const markerCtor = useRef<new (opts: { map: unknown; position: LatLng; content: HTMLElement; zIndex?: number }) => GOverlay | null>(null);
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const paintKey = JSON.stringify({
    lat,
    lng,
    busNo,
    motion,
    speedKmh,
    studentStop,
    stops,
    myLat,
    myLng,
    geometry: routeGeometry?.geometry ?? null,
    status: routeGeometry?.status ?? null,
  });

  const hasFrame =
    liveBusCoordinate(lat, lng) != null || stops.length > 0 || (studentStop != null && Number.isFinite(studentStop.lat));

  useEffect(() => {
    if (!hostReady || !GOOGLE_MAPS_API_KEY) {
      if (!GOOGLE_MAPS_API_KEY) setFailed(true);
      return;
    }
    if (!hasFrame || mapRef.current) return;
    let cancelled = false;
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(async () => {
        if (cancelled || !hostRef.current || mapRef.current) return;
        const maps = (window as Window & { google: { maps: { importLibrary: (name: string) => Promise<Record<string, unknown>>; LatLngBounds: new () => { extend: (p: LatLng) => void } } } }).google.maps;
        const lib = await maps.importLibrary('maps');
        const markers = await maps.importLibrary('marker');
        const MapCtor = lib.Map as new (el: HTMLElement, opts: Record<string, unknown>) => typeof mapRef.current;
        markerCtor.current = markers.AdvancedMarkerElement as typeof markerCtor.current;
        const live = liveBusCoordinate(lat, lng);
        const first = stops[0] ?? studentStop;
        const center = live ?? (first ? { latitude: first.lat, longitude: first.lng } : null);
        if (!center || !hostRef.current) return;
        mapRef.current = new MapCtor(hostRef.current, {
          mapId: GOOGLE_MAP_ID || undefined,
          center: { lat: center.latitude, lng: center.longitude },
          zoom: 14,
          gestureHandling: interactive ? 'auto' : 'none',
          clickableIcons: false,
          fullscreenControl: false,
          streetViewControl: false,
          mapTypeControl: false,
        });
        const created = mapRef.current as { fitBounds: (b: unknown, p?: number) => void } & {
          // Google attaches event helpers on the maps namespace after the API is ready.
        };
        window.setTimeout(() => {
          const event = (window as Window & { google?: { maps?: { event?: { trigger: (m: unknown, name: string) => void } } } }).google?.maps?.event;
          event?.trigger(created, 'resize');
        }, 50);
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
    // Created once a stop or a live GPS point exists. Later updates only repaint overlays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostReady, interactive, hasFrame]);

  useEffect(() => {
    const map = mapRef.current;
    const Marker = markerCtor.current;
    const maps = (window as Window & { google?: { maps?: { LatLngBounds: new () => { extend: (p: LatLng) => void }; Polyline: new (opts: Record<string, unknown>) => GOverlay } } }).google?.maps;
    if (!ready || !map || !Marker || !maps) return;

    for (const overlay of overlays.current) dropOverlay(overlay);
    overlays.current = [];

    const usable = usableRouteGeometry(routeGeometry);
    const decoded = usable
      ? decodePolyline(usable.geometry as string).map((p) => ({ lat: p.latitude, lng: p.longitude }))
      : [];
    const stopPath = stops
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
      .map((stop) => ({ lat: stop.lat, lng: stop.lng }));
    const road = decoded.length > 1 ? decoded : stopPath;
    if (road.length > 1 && typeof maps.Polyline === 'function') {
      overlays.current.push(
        new maps.Polyline({ map, path: road, strokeColor: '#ffffff', strokeWeight: 8, strokeOpacity: 0.95, zIndex: 1, geodesic: true }),
        new maps.Polyline({ map, path: road, strokeColor: ROUTE, strokeWeight: 5, zIndex: 2, geodesic: true }),
      );
    }

    const drawn = new Set<string>();
    const placeStop = (stop: BusMapStop, index: number) => {
      if (!Number.isFinite(stop.lat) || !Number.isFinite(stop.lng)) return;
      const key = `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`;
      if (drawn.has(key) && stop.yours) return;
      drawn.add(key);
      const pin = new Marker({
        map,
        position: { lat: stop.lat, lng: stop.lng },
        content: stopPin(stop, index),
        zIndex: stop.yours ? 4 : 3,
      });
      if (pin) overlays.current.push(pin);
    };
    stops.forEach(placeStop);
    if (studentStop && !stops.some((s) => s.yours || s.id === studentStop.id)) {
      placeStop(studentStop, stops.length);
    }

    const you = liveBusCoordinate(myLat, myLng);
    if (you) {
      const pin = new Marker({
        map,
        position: { lat: you.latitude, lng: you.longitude },
        content: youPin(),
        zIndex: 5,
      });
      if (pin) overlays.current.push(pin);
    }

    const live = liveBusCoordinate(lat, lng);
    if (live) {
      const pin = new Marker({
        map,
        position: { lat: live.latitude, lng: live.longitude },
        content: busPin(busNo, speedKmh, motion),
        zIndex: 10,
      });
      if (pin) overlays.current.push(pin);
    }

    const fit = () => {
      const points: LatLng[] = [
        ...road,
        ...stops.filter((s) => Number.isFinite(s.lat) && Number.isFinite(s.lng)).map((s) => ({ lat: s.lat, lng: s.lng })),
      ];
      if (studentStop) points.push({ lat: studentStop.lat, lng: studentStop.lng });
      if (you) points.push({ lat: you.latitude, lng: you.longitude });
      if (live) points.push({ lat: live.latitude, lng: live.longitude });
      if (points.length === 0) return;
      if (points.length === 1) {
        map.setCenter(points[0]);
        map.setZoom(15);
        return;
      }
      const bounds = new maps.LatLngBounds();
      for (const point of points) bounds.extend(point);
      map.fitBounds(bounds, 48);
    };
    onRecenterReady?.(fit);
    fit();
  }, [ready, paintKey, busNo, lat, lng, motion, myLat, myLng, onRecenterReady, routeGeometry, speedKmh, stops, studentStop]);

  if (failed || !GOOGLE_MAPS_API_KEY) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Map unavailable</Text>
      </View>
    );
  }

  return (
    <View style={styles.map} pointerEvents={interactive ? 'auto' : 'none'}>
      <View
        ref={(node) => {
          const el = node as unknown as HTMLDivElement | null;
          if (hostRef.current === el) return;
          hostRef.current = el;
          setHostReady(Boolean(el));
        }}
        style={StyleSheet.absoluteFill}
      />
      {showRouteUnavailableBadge(routeGeometry) ? <RouteUnavailableBadge /> : null}
      {!interactive && onPress ? (
        <Pressable
          onPress={onPress}
          style={StyleSheet.absoluteFill}
          accessibilityRole="button"
          accessibilityLabel="Open full map"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted },
  unavailableBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unavailableTxt: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.inkMuted },
});
