import { useEffect, useMemo, useRef } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { GOOGLE_MAP_ID } from '@/api/config';
import { decodePolyline } from '@/lib/decodePolyline';
import { colors, fontFamily, radius } from '@/theme';
import { liveBusCoordinate, showRouteUnavailableBadge, usableRouteGeometry } from './BusMap.types';
import type { BusMapProps, BusMapStop } from './BusMap.types';

function RouteUnavailableBadge() {
  return (
    <View style={styles.unavailableBadge} pointerEvents="none">
      <Text style={styles.unavailableTxt}>Route unavailable</Text>
    </View>
  );
}

export type { BusMapProps } from './BusMap.types';

const ROUTE = '#4361EE';

function busStatusColor(speedKmh?: number | null, motion?: BusMapProps['motion']) {
  if (typeof speedKmh === 'number' && speedKmh > 3) return '#16a34a';
  if (motion === 'moving') return '#16a34a';
  return '#64748b';
}

function StopPin({ stop, index }: { stop: BusMapStop; index: number }) {
  const yours = Boolean(stop.yours);
  const passed = Boolean(stop.passed);
  return (
    <View
      collapsable={false}
      style={[
        styles.stopPin,
        { borderColor: passed ? '#16a34a' : yours ? '#1D4ED8' : ROUTE, backgroundColor: yours ? '#2563EB' : '#fff' },
      ]}
    >
      <Text style={[styles.stopPinText, yours && { color: '#fff' }]}>{stop.order ?? index + 1}</Text>
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
  follow = false,
  myLat = null,
  myLng = null,
  routeGeometry,
  onPress,
  onRecenterReady,
}: BusMapProps) {
  const mapRef = useRef<MapView | null>(null);
  const usableGeometry = usableRouteGeometry(routeGeometry);
  const roadPath = useMemo(() => {
    const decoded = usableGeometry ? decodePolyline(usableGeometry.geometry as string) : [];
    if (decoded.length > 1) return decoded;
    return stops
      .filter((stop) => Number.isFinite(stop.lat) && Number.isFinite(stop.lng))
      .map((stop) => ({ latitude: stop.lat, longitude: stop.lng }));
  }, [usableGeometry, stops]);
  const live = liveBusCoordinate(lat, lng);
  const you = liveBusCoordinate(myLat, myLng);
  const coords = useMemo(() => {
    const pts: { latitude: number; longitude: number }[] = [...roadPath];
    for (const s of stops) {
      if (Number.isFinite(s.lat) && Number.isFinite(s.lng)) pts.push({ latitude: s.lat, longitude: s.lng });
    }
    if (studentStop && Number.isFinite(studentStop.lat) && Number.isFinite(studentStop.lng)) {
      pts.push({ latitude: studentStop.lat, longitude: studentStop.lng });
    }
    const bus = liveBusCoordinate(lat, lng);
    const me = liveBusCoordinate(myLat, myLng);
    if (bus) pts.push(bus);
    if (me) pts.push(me);
    return pts;
  }, [roadPath, stops, studentStop, lat, lng, myLat, myLng]);

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
  const speedLabel = typeof speedKmh === 'number' ? `${busNo} · ${Math.round(speedKmh)} km/h` : busNo;

  return (
    <View style={styles.map}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        googleMapId={GOOGLE_MAP_ID || undefined}
        loadingEnabled
        initialRegion={region}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={false}
        pitchEnabled={false}
        showsUserLocation
        pointerEvents={interactive ? 'auto' : 'none'}
      >
        {roadPath.length > 1 ? (
          <>
            <Polyline coordinates={roadPath} strokeColor="#ffffff" strokeWidth={8} zIndex={1} />
            <Polyline coordinates={roadPath} strokeColor={ROUTE} strokeWidth={5} zIndex={2} />
          </>
        ) : null}
        {stops.map((s, index) =>
          Number.isFinite(s.lat) && Number.isFinite(s.lng) ? (
            <Marker
              key={s.id}
              coordinate={{ latitude: s.lat, longitude: s.lng }}
              title={s.name}
              anchor={{ x: 0.5, y: 0.5 }}
              zIndex={s.yours ? 4 : 3}
            >
              <StopPin stop={s} index={index} />
            </Marker>
          ) : null,
        )}
        {studentStop && !stops.some((s) => s.yours || s.id === studentStop.id) ? (
          <Marker
            coordinate={{ latitude: studentStop.lat, longitude: studentStop.lng }}
            title={studentStop.name}
            anchor={{ x: 0.5, y: 0.5 }}
            zIndex={4}
          >
            <StopPin stop={{ ...studentStop, yours: true }} index={stops.length} />
          </Marker>
        ) : null}
        {you ? (
          <Marker coordinate={you} title="You" pinColor="#7C3AED" zIndex={5} />
        ) : null}
        {live ? (
          <Marker coordinate={live} title={`Bus #${busNo}`} description={speedLabel} anchor={{ x: 0.5, y: 0.5 }} zIndex={10}>
            <View collapsable={false} style={styles.busRow}>
              <View style={styles.busBody} />
              <View style={[styles.busLabel, { backgroundColor: busStatusColor(speedKmh, motion) }]}>
                <Text style={styles.busLabelText} numberOfLines={1}>
                  {speedLabel}
                </Text>
              </View>
            </View>
          </Marker>
        ) : null}
      </MapView>
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
  map: { flex: 1 },
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
  stopPin: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopPinText: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.ink },
  busRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  busBody: {
    width: 22,
    height: 28,
    borderRadius: 6,
    backgroundColor: '#FFC107',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  busLabel: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, maxWidth: 140 },
  busLabelText: { fontFamily: fontFamily.bold, fontSize: 11, color: '#fff' },
});
