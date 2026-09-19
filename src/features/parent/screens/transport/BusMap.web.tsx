import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '@/api/config';
import { decodePolyline } from '@/lib/decodePolyline';
import { colors, fontFamily, radius } from '@/theme';
import type { BusMapProps } from './BusMap.types';

export type { BusMapProps } from './BusMap.types';

function busColor(status?: BusMapProps['trackingStatus']) {
  if (status === 'OFFLINE') return '0x64748B';
  if (status === 'DELAYED') return 'orange';
  return 'red';
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
  trackingStatus,
  studentStop,
  stops = [],
  fullscreen = false,
  myLat = null,
  myLng = null,
  routeGeometry,
  onPress,
}: BusMapProps) {
  const [failed, setFailed] = useState(false);
  const centerLat = lat ?? studentStop?.lat ?? myLat ?? stops[0]?.lat;
  const centerLng = lng ?? studentStop?.lng ?? myLng ?? stops[0]?.lng;

  const uri = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY || centerLat == null || centerLng == null) return '';
    const params = new URLSearchParams({
      center: `${centerLat},${centerLng}`,
      zoom: lat != null && studentStop ? '14' : '15',
      size: fullscreen ? '640x640' : '640x420',
      scale: '2',
      maptype: 'roadmap',
      key: GOOGLE_MAPS_API_KEY,
    });
    // Legacy straight-line-through-stops fallback; kept unused (never rendered) to avoid
    // silently drawing an inaccurate line when road geometry is unavailable/errored.
    const legacyPathPts = stops.map((s) => `${s.lat},${s.lng}`);
    const roadPath =
      routeGeometry?.status === 'available' && routeGeometry.geometry
        ? decodePolyline(routeGeometry.geometry)
        : null;
    if (roadPath && roadPath.length > 1) {
      const pathPts = roadPath.map((p) => `${p.latitude},${p.longitude}`);
      params.append('path', `color:0x2563EB99|weight:4|${pathPts.join('|')}`);
    }
    if (lat != null && lng != null) {
      params.append('markers', `color:${busColor(trackingStatus)}|label:B|${lat},${lng}`);
    }
    for (const stop of stops) {
      if (stop.yours) continue;
      params.append('markers', `color:${stop.passed ? '0x22C55E' : '0x94A3B8'}|size:tiny|${stop.lat},${stop.lng}`);
    }
    if (studentStop) params.append('markers', `color:blue|label:S|${studentStop.lat},${studentStop.lng}`);
    if (myLat != null && myLng != null) {
      params.append('markers', `color:0x7C3AED|label:Y|${myLat},${myLng}`);
    }
    const visible: string[] = [];
    if (lat != null && lng != null) visible.push(`${lat},${lng}`);
    if (studentStop) visible.push(`${studentStop.lat},${studentStop.lng}`);
    if (myLat != null && myLng != null) visible.push(`${myLat},${myLng}`);
    if (visible.length > 1) params.append('visible', visible.join('|'));
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }, [centerLat, centerLng, lat, lng, busNo, trackingStatus, studentStop, stops, fullscreen, myLat, myLng, routeGeometry]);

  if (!uri || failed) {
    const fallback = (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>{failed ? 'Map unavailable' : 'Location temporarily unavailable.'}</Text>
      </View>
    );
    if (!onPress) return fallback;
    return (
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Open full map" style={styles.map}>
        {fallback}
      </Pressable>
    );
  }

  const map = (
    <View style={styles.map}>
      <Image
        source={{ uri }}
        style={styles.map}
        accessibilityLabel={`Map showing bus #${busNo}, your location, and the assigned stop`}
        onError={() => setFailed(true)}
      />
      {routeGeometry?.status === 'unavailable' ? <RouteUnavailableBadge /> : null}
    </View>
  );
  if (!onPress) return map;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Open full map"
      style={styles.map}
    >
      {map}
    </Pressable>
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
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unavailableTxt: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.white },
});
