import { Platform, StyleSheet } from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAP_ID } from '@/api/config';

export type BusMapProps = { lat: number; lng: number; busNo: string };

const DELTA = 0.01;

export function BusMap({ lat, lng, busNo }: BusMapProps) {
  const region = { latitude: lat, longitude: lng, latitudeDelta: DELTA, longitudeDelta: DELTA };
  return (
    <MapView
      style={styles.map}
      provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
      googleMapId={Platform.OS === 'android' ? GOOGLE_MAP_ID : undefined}
      initialRegion={region}
      region={region}
      pointerEvents="none"
      scrollEnabled={false}
      zoomEnabled={false}
    >
      <Marker coordinate={{ latitude: lat, longitude: lng }} title={`Bus #${busNo}`} />
    </MapView>
  );
}

const styles = StyleSheet.create({ map: { flex: 1 } });
