import { useMemo, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '@/api/config';
import { colors, fontFamily } from '@/theme';
import type { BusMapProps } from './BusMap.types';

export type { BusMapProps } from './BusMap.types';

function busColor(status?: BusMapProps['trackingStatus']) {
  if (status === 'OFFLINE') return '0x64748B';
  if (status === 'DELAYED') return 'orange';
  return 'red';
}

export function BusMap({
  lat,
  lng,
  busNo,
  trackingStatus,
  studentStop,
  stops = [],
  fullscreen = false,
  onPress,
}: BusMapProps) {
  const [failed, setFailed] = useState(false);
  const centerLat = lat ?? studentStop?.lat ?? stops[0]?.lat;
  const centerLng = lng ?? studentStop?.lng ?? stops[0]?.lng;

  const uri = useMemo(() => {
    if (!GOOGLE_MAPS_API_KEY || centerLat == null || centerLng == null) return '';
    const params = new URLSearchParams({
      center: `${centerLat},${centerLng}`,
      zoom: lat != null && studentStop ? '14' : '15',
      size: fullscreen ? '640x640' : '640x420',
      scale: '2',
      key: GOOGLE_MAPS_API_KEY,
    });
    const pathPts = stops.map((s) => `${s.lat},${s.lng}`);
    if (pathPts.length > 1) {
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
    return `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  }, [centerLat, centerLng, lat, lng, busNo, trackingStatus, studentStop, stops, fullscreen]);

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
    <Image
      source={{ uri }}
      style={styles.map}
      accessibilityLabel={`Map showing bus #${busNo}, the route, and the assigned stop`}
      onError={() => setFailed(true)}
    />
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
});
