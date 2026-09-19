import { useEffect, useMemo, useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_DEFAULT, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAP_ID } from '@/api/config';
import { colors } from '@/theme';
import type { BusMapProps } from './BusMap.types';

export type { BusMapProps } from './BusMap.types';

function busPinColor(status?: BusMapProps['trackingStatus'], motion?: BusMapProps['motion']) {
  if (status === 'OFFLINE') return '#64748B';
  if (status === 'DELAYED') return '#D97706';
  if (motion === 'stopped') return '#0F766E';
  return '#DC2626';
}

export function BusMap({
  lat,
  lng,
  busNo,
  trackingStatus,
  motion,
  studentStop,
  stops = [],
  interactive = true,
  follow = false,
  myLat = null,
  myLng = null,
  onPress,
  onRecenterReady,
}: BusMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const coords = useMemo(() => {
    const pts: { latitude: number; longitude: number }[] = [];
    for (const s of stops) pts.push({ latitude: s.lat, longitude: s.lng });
    if (studentStop) pts.push({ latitude: studentStop.lat, longitude: studentStop.lng });
    if (lat != null && lng != null) pts.push({ latitude: lat, longitude: lng });
    if (myLat != null && myLng != null) pts.push({ latitude: myLat, longitude: myLng });
    return pts;
  }, [stops, studentStop, lat, lng, myLat, myLng]);

  const center = coords[0];
  const fit = () => {
    if (!mapRef.current || coords.length === 0) return;
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 36, right: 36, bottom: 36, left: 36 },
      animated: true,
    });
  };

  useEffect(() => {
    onRecenterReady?.(fit);
  }, [onRecenterReady, coords]);

  useEffect(() => {
    const t = setTimeout(fit, 250);
    return () => clearTimeout(t);
  }, [coords.length]);

  useEffect(() => {
    if (!follow || !interactive || lat == null || lng == null || !mapRef.current) return;
    mapRef.current.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: 0.02, longitudeDelta: 0.02 },
      500,
    );
  }, [follow, interactive, lat, lng]);

  if (!center) return null;

  const region = {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };
  const routeCoords = stops.map((s) => ({ latitude: s.lat, longitude: s.lng }));

  return (
    <View style={styles.map}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : PROVIDER_DEFAULT}
        googleMapId={Platform.OS === 'android' ? GOOGLE_MAP_ID : undefined}
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {routeCoords.length > 1 ? (
          <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} />
        ) : null}
        {stops.map((s) =>
          s.yours ? null : (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              title={s.name}
              pinColor={s.passed ? '#22C55E' : '#94A3B8'}
            />
          ),
        )}
        {studentStop ? (
          <Marker
            coordinate={{ latitude: studentStop.lat, longitude: studentStop.lng }}
            title={studentStop.name}
            pinColor="#2563EB"
          />
        ) : null}
        {myLat != null && myLng != null ? (
          <Marker
            coordinate={{ latitude: myLat, longitude: myLng }}
            title="You"
            pinColor="#7C3AED"
          />
        ) : null}
        {lat != null && lng != null ? (
          <Marker
            coordinate={{ latitude: lat, longitude: lng }}
            title={`Bus #${busNo}`}
            description={trackingStatus ?? ''}
            pinColor={busPinColor(trackingStatus, motion)}
          />
        ) : null}
      </MapView>
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

const styles = StyleSheet.create({ map: { flex: 1 } });
