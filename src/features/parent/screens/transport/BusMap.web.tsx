import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '@/api/config';
import { colors, fontFamily } from '@/theme';

export type BusMapProps = { lat: number; lng: number; busNo: string };

// Google Static Maps API doesn't support cloud-styling Map IDs (that's a dynamic-SDK
// feature), so the web snapshot uses the key only — styling parity with native isn't
// available here.
export function BusMap({ lat, lng, busNo }: BusMapProps) {
  const [failed, setFailed] = useState(false);

  if (!GOOGLE_MAPS_API_KEY || failed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackText}>Map unavailable</Text>
      </View>
    );
  }

  const params = new URLSearchParams({
    center: `${lat},${lng}`,
    zoom: '16',
    size: '640x360',
    scale: '2',
    markers: `color:red|${lat},${lng}`,
    key: GOOGLE_MAPS_API_KEY,
  });
  const uri = `https://maps.googleapis.com/maps/api/staticmap?${params.toString()}`;
  return (
    <Image
      source={{ uri }}
      style={styles.map}
      accessibilityLabel={`Map showing bus #${busNo}'s current location`}
      onError={() => setFailed(true)}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, width: '100%', height: '100%' },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted },
});
