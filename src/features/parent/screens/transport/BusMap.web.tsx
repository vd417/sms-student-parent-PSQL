import { Image, StyleSheet } from 'react-native';
import { GOOGLE_MAPS_API_KEY } from '@/api/config';

export type BusMapProps = { lat: number; lng: number; busNo: string };

// Google Static Maps API doesn't support cloud-styling Map IDs (that's a dynamic-SDK
// feature), so the web snapshot uses the key only — styling parity with native isn't
// available here.
export function BusMap({ lat, lng, busNo }: BusMapProps) {
  if (!GOOGLE_MAPS_API_KEY) return null;
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
    />
  );
}

const styles = StyleSheet.create({ map: { flex: 1, width: '100%', height: '100%' } });
