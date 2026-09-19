import { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { Card, Empty, ErrorState, IconButton, Loading, Pill, ScreenHeader } from '@/components/ui';
import type { PillTone } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { KidSwitcher, ALL_CHILDREN_ID } from '@/features/parent/components/KidSwitcher';
import { useChildren } from '@/hooks/useParent';
import { useRouteGeometry } from '@/hooks/useRouteGeometry';
import { useChildrenTransport } from '@/hooks/useTransport';
import { useTransportFleetPush } from '@/hooks/useTransportFleet';
import { useMyLocation } from '@/hooks/useMyLocation';
import { useNetwork } from '@/hooks/useNetwork';
import { useAuth } from '@/providers/AuthProvider';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useLive } from '@/providers/LiveProvider';
import { busToStopMeters, formatStopDistance, metersBetween } from '@/lib/busStopDistance';
import {
  assignedStopLabel,
  assignmentMessage,
  boardingLabel,
  classLabel,
  routeDestinationName,
  stopProgressKind,
  trackingLabel,
  uniqueBusIds,
} from '@/lib/busTracking';
import { isBlockingError, isInitialLoad } from '@/lib/queryStatus';
import type { Transport, TransportTrackingStatus } from '@/models';
import type { RouteGeometryDTO } from '@/services/http/routeGeometry';
import { colors, fontFamily, radius } from '@/theme';
import { BusMap } from './transport/BusMap';

type Nav = NavigationProp<{ Announcements: undefined }>;

const STATUS_TONE: Record<TransportTrackingStatus, PillTone> = {
  LIVE: 'present',
  DELAYED: 'late',
  OFFLINE: 'neutral',
};

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${Math.max(sec, 1)} sec ago`;
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  return `${hr}h ago`;
}

function connectionLabel(online: boolean, live: boolean, fleet: boolean, tracking: TransportTrackingStatus) {
  if (!online) return 'Connection lost. Reconnecting...';
  if (!live && !fleet && tracking !== 'OFFLINE') return 'Reconnecting...';
  return null;
}

/** Shared "unavailable" geometry DTO — used both for a failed fetch and for a tracked
 * bus with no route id to fetch geometry for, so both render identically (badge, no line). */
function unavailableRouteGeometryDTO(routeId: string | null | undefined): RouteGeometryDTO {
  return {
    routeId: routeId ?? '',
    status: 'unavailable',
    format: null,
    geometry: null,
    distanceMeters: null,
    durationSeconds: null,
    stopSequenceHash: '',
    generatedAt: null,
  };
}

export function ParentTransportScreen() {
  const nav = useNavigation<Nav>();
  const { role } = useAuth();
  const audience = role === 'student' ? 'student' : 'parent';
  const { childId } = useSelectedChild();
  const childrenQ = useChildren();
  const listQ = useChildrenTransport();
  const { connected: liveConnected } = useLive();
  const { online } = useNetwork();
  const rows = listQ.data ?? [];
  const { connected: fleetConnected } = useTransportFleetPush(uniqueBusIds(rows));
  const kids = audience === 'student' ? [] : (childrenQ.data ?? []);
  const [viewId, setViewId] = useState(audience === 'student' ? '' : childId || ALL_CHILDREN_ID);
  const recenterRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (audience === 'student') return;
    if (childId && viewId !== ALL_CHILDREN_ID && !kids.some((k) => k.id === viewId)) {
      setViewId(childId);
    }
  }, [audience, childId, kids, viewId]);

  const selected = useMemo(() => {
    if (audience === 'student') return rows[0] ?? null;
    if (viewId === ALL_CHILDREN_ID) return null;
    return rows.find((r) => r.studentId === viewId) ?? rows[0] ?? null;
  }, [audience, rows, viewId]);

  if (isInitialLoad(listQ)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Bus track" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isBlockingError(listQ)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Bus track" />
        <ErrorState onRetry={() => listQ.refetch()} />
      </SafeAreaView>
    );
  }
  if (rows.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Bus track" />
        <Empty message="No school transport assigned." />
      </SafeAreaView>
    );
  }

  const showAll = viewId === ALL_CHILDREN_ID && kids.length > 1;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={
          selected?.busNo
            ? `Bus #${selected.busNo}${selected.routeName ? ` · ${selected.routeName}` : ''}`
            : audience === 'student'
              ? 'My bus'
              : 'My children'
        }
        title="Bus track"
        right={<IconButton icon="notifications-outline" onPress={() => nav.navigate('Announcements')} />}
      />
      {audience === 'parent' && kids.length > 1 ? (
        <KidSwitcher includeAll selectedId={viewId} onSelect={setViewId} />
      ) : null}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={listQ.isRefetching} onRefresh={() => listQ.refetch()} />}
      >
        {showAll ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 4, gap: 10 }}>
            {rows.map((row) => (
              <Pressable key={row.studentId} onPress={() => setViewId(row.studentId)}>
                <SummaryCard row={row} />
              </Pressable>
            ))}
          </View>
        ) : selected ? (
          <ChildTrack
            tr={selected}
            audience={audience}
            online={online}
            liveConnected={liveConnected}
            fleetConnected={fleetConnected}
            recenterRef={recenterRef}
          />
        ) : (
          <Empty message="No school transport assigned." />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ row }: { row: Transport }) {
  const seen = timeAgo(row.lastPingAt);
  const empty = assignmentMessage(row.assignment);
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.childName}>{row.studentName}</Text>
          <Text style={styles.childClass}>{classLabel(row.grade, row.section) || ' '}</Text>
        </View>
        <Pill tone={STATUS_TONE[row.trackingStatus]}>{trackingLabel(row.trackingStatus, row.motion)}</Pill>
      </View>
      {empty ? (
        <Text style={styles.idleNote}>{empty}</Text>
      ) : (
        <Text style={styles.busLine}>
          Bus #{row.busNo}
          {row.routeName ? ` · ${row.routeName}` : ''}
          {row.speedKmh != null ? ` · ${Math.round(row.speedKmh)} km/h` : ''}
        </Text>
      )}
      {seen ? <Text style={styles.seenAt}>Updated {seen}</Text> : null}
    </Card>
  );
}

function ChildTrack({
  tr,
  audience,
  online,
  liveConnected,
  fleetConnected,
  recenterRef,
}: {
  tr: Transport;
  audience: 'parent' | 'student';
  online: boolean;
  liveConnected: boolean;
  fleetConnected: boolean;
  recenterRef: { current: (() => void) | null };
}) {
  const empty = assignmentMessage(tr.assignment);
  const seen = timeAgo(tr.lastPingAt);
  const reconnect = connectionLabel(online, liveConnected, fleetConnected, tr.trackingStatus);
  const stopTitle = assignedStopLabel(audience);
  const studentStop =
    tr.studentStopLat != null && tr.studentStopLng != null
      ? {
          id: tr.studentStopId ?? 'student-stop',
          name: tr.studentStopName ?? stopTitle,
          lat: tr.studentStopLat,
          lng: tr.studentStopLng,
          yours: true,
        }
      : null;
  const mapStops = tr.routeStops
    .filter((s) => s.lat != null && s.lng != null)
    .map((s, i) => ({
      id: s.id,
      name: s.name,
      lat: s.lat as number,
      lng: s.lng as number,
      yours: Boolean(tr.studentStopId && s.id === tr.studentStopId),
      passed: stopProgressKind(i, tr.currentStopIndex) === 'passed',
    }));
  const hasMap = (tr.lat != null && tr.lng != null) || studentStop != null || mapStops.length > 0;
  const distance = formatStopDistance(
    busToStopMeters(tr.distanceToStudentStopM, { lat: tr.lat, lng: tr.lng }, {
      lat: tr.studentStopLat,
      lng: tr.studentStopLng,
    }),
  );
  const destination = routeDestinationName(tr);
  const boarded = boardingLabel(tr.boardingState);
  const statusText = reconnect
    ?? (tr.trackingStatus === 'OFFLINE' && seen ? `OFFLINE · last location ${seen}` : trackingLabel(tr.trackingStatus, tr.motion));
  const [mapOpen, setMapOpen] = useState(false);
  const fullRecenterRef = useRef<(() => void) | null>(null);
  const { point: me, ready: locReady } = useMyLocation(!empty);
  const routeGeometryQ = useRouteGeometry(tr.routeId);
  // A failed geometry fetch must render identically to the backend's own `unavailable`
  // status — never as a silent blank/loading state indistinguishable from "not loaded yet".
  // Likewise, an actively-tracked bus (hasMap) with no route id at all has nothing to ever
  // fetch (the query is disabled), so it must be forced to the same `unavailable` state
  // rather than left `undefined` — which would be indistinguishable from "still loading".
  // A child with no bus/tracking data at all (hasMap false) stays `undefined`, exactly as
  // before this feature existed — no badge for a bus that simply isn't active right now.
  const routeGeometry: RouteGeometryDTO | undefined = routeGeometryQ.isError
    ? unavailableRouteGeometryDTO(tr.routeId)
    : (routeGeometryQ.data ?? (hasMap && !tr.routeId ? unavailableRouteGeometryDTO(tr.routeId) : undefined));

  const youToBus = formatStopDistance(metersBetween(me ?? { lat: null, lng: null }, { lat: tr.lat, lng: tr.lng }));
  const youToStop = formatStopDistance(
    metersBetween(me ?? { lat: null, lng: null }, { lat: tr.studentStopLat, lng: tr.studentStopLng }),
  );

  const mapProps = {
    lat: tr.lat,
    lng: tr.lng,
    busNo: tr.busNo,
    trackingStatus: tr.trackingStatus,
    motion: tr.motion,
    studentStop,
    stops: mapStops,
    myLat: me?.lat ?? null,
    myLng: me?.lng ?? null,
    routeGeometry,
  };

  if (empty) {
    return (
      <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
        <Card style={styles.statusCard}>
          {audience === 'parent' ? (
            <>
              <Text style={styles.childName}>{tr.studentName}</Text>
              <Text style={styles.childClass}>{classLabel(tr.grade, tr.section)}</Text>
            </>
          ) : null}
          <Text style={styles.idleNote}>{empty}</Text>
        </Card>
      </View>
    );
  }

  return (
    <>
      {audience === 'parent' ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 4 }}>
          <Text style={styles.childName}>{tr.studentName}</Text>
          <Text style={styles.childClass}>{classLabel(tr.grade, tr.section)}</Text>
        </View>
      ) : null}

      {hasMap ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <Pressable onPress={() => setMapOpen(true)} style={styles.mapBox} accessibilityRole="button" accessibilityLabel="Open full map">
            <BusMap
              {...mapProps}
              interactive={false}
              onRecenterReady={(fn) => {
                recenterRef.current = fn;
              }}
            />
            <View style={styles.expandHint} pointerEvents="none">
              <Ionicons name="expand-outline" size={16} color={colors.white} />
              <Text style={styles.expandTxt}>Tap to open</Text>
            </View>
          </Pressable>
          <View style={styles.legend}>
            <LegendDot color="#DC2626" label="Bus" />
            <LegendDot color="#7C3AED" label="You" />
            <LegendDot color="#94A3B8" label="Stop" />
            <LegendDot color="#2563EB" label={stopTitle} />
            <LegendDot color="#22C55E" label="Passed" />
          </View>
          <Pressable onPress={() => recenterRef.current?.()} style={styles.recenterBtn}>
            <Ionicons name="locate-outline" size={16} color={colors.primary} />
            <Text style={styles.recenterTxt}>Recenter map</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <Card style={styles.statusCard}>
            <Text style={styles.idleNote}>
              {tr.trackingStatus === 'OFFLINE'
                ? seen
                  ? `Bus is offline. Last location: ${seen}.`
                  : 'Location temporarily unavailable.'
                : 'Route information unavailable.'}
            </Text>
          </Card>
        </View>
      )}

      <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
        <Card style={styles.statusCard}>
          <View style={styles.statusHeader}>
            <View style={styles.statusIcon}>
              <Ionicons name="bus" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.busLine}>
                Bus #{tr.busNo}
                {tr.routeName ? ` · ${tr.routeName}` : ''}
              </Text>
              {tr.driver ? <Text style={styles.seenAt}>Driver · {tr.driver}</Text> : null}
              {tr.speedKmh != null ? (
                <Text style={styles.seenAt}>Speed · {Math.round(tr.speedKmh)} km/h</Text>
              ) : null}
            </View>
            <Pill tone={STATUS_TONE[tr.trackingStatus]}>{statusText}</Pill>
          </View>
          {seen ? <Text style={styles.seenAt}>Updated {seen}</Text> : null}

          {tr.studentStopName ? (
            <View style={[styles.infoRow, styles.yoursRow]}>
              <Text style={styles.infoLabel}>{stopTitle}</Text>
              <View style={{ alignItems: 'flex-end', flex: 1, marginLeft: 12 }}>
                <Text style={styles.infoValue}>★ {tr.studentStopName}</Text>
                {distance ? <Text style={styles.seenAt}>Bus · {distance}</Text> : null}
                {youToStop ? <Text style={styles.seenAt}>You · {youToStop}</Text> : null}
              </View>
            </View>
          ) : (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Assigned stop</Text>
              <Text style={styles.infoValue}>Assigned stop information unavailable.</Text>
            </View>
          )}
          {youToBus ? (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>You → bus</Text>
              <Text style={styles.infoValue}>{youToBus}</Text>
            </View>
          ) : locReady && !me ? (
            <Text style={styles.idleNote}>Allow location to see your distance to the bus and stop.</Text>
          ) : null}

          {tr.trackingStatus === 'OFFLINE' && tr.status === 'idle' ? (
            <Text style={styles.idleNote}>
              This bus hasn&apos;t started today&apos;s trip yet. You&apos;ll get a notice when it starts,
              and again when it is 1 km from your stop.
            </Text>
          ) : (
            <>
              {tr.nextStopName ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Next stop</Text>
                  <Text style={styles.infoValue}>{tr.nextStopName}</Text>
                </View>
              ) : null}
              {destination && destination !== tr.nextStopName ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Destination</Text>
                  <Text style={styles.infoValue}>{destination}</Text>
                </View>
              ) : null}
              {tr.etaNextStopMin != null && tr.trackingStatus === 'LIVE' ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>ETA</Text>
                  <Text style={styles.infoValue}>~{tr.etaNextStopMin} min</Text>
                </View>
              ) : null}
              {boarded ? (
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Pickup</Text>
                  <Text style={styles.infoValue}>{boarded}</Text>
                </View>
              ) : null}
            </>
          )}
        </Card>
      </View>

      {tr.routeStops.length > 0 ? (
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <Text style={styles.sectionTitle}>Route progress</Text>
          {tr.passedStopCount != null && tr.totalStops ? (
            <Text style={styles.progressMeta}>
              {tr.passedStopCount} of {tr.totalStops} stops completed
            </Text>
          ) : null}
          <Card style={{ paddingVertical: 4 }}>
            {tr.routeStops.map((stop, i) => {
              const yours =
                Boolean(tr.studentStopId && stop.id === tr.studentStopId) ||
                Boolean(tr.studentStopName && stop.name === tr.studentStopName);
              const kind = stopProgressKind(i, tr.currentStopIndex);
              return (
                <View
                  key={stop.id || `${stop.name}-${i}`}
                  style={[styles.stopRow, i !== tr.routeStops.length - 1 && styles.stopDivider]}
                >
                  <View
                    style={[
                      styles.stopDot,
                      kind === 'passed' && styles.stopDotPassed,
                      kind === 'current' && styles.stopDotCurrent,
                      yours && styles.stopDotYours,
                    ]}
                  />
                  <Text
                    style={[styles.stopName, yours && styles.stopNameYours, kind === 'passed' && styles.stopPassed]}
                    numberOfLines={1}
                  >
                    {kind === 'passed' ? '✓ ' : ''}
                    {yours ? `★ ${stop.name}` : stop.name}
                  </Text>
                  {yours ? <Pill tone="primary">{stopTitle}</Pill> : <Text style={styles.stopSeq}>{stop.seq || i + 1}</Text>}
                </View>
              );
            })}
          </Card>
        </View>
      ) : (
        <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
          <Text style={styles.idleNote}>Route information unavailable.</Text>
        </View>
      )}

      <Modal
        visible={mapOpen}
        animationType="fade"
        presentationStyle="fullScreen"
        onRequestClose={() => setMapOpen(false)}
      >
        <SafeAreaView style={styles.fullSafe} edges={['top', 'bottom']}>
          <ScreenHeader
            showBack
            onBack={() => setMapOpen(false)}
            kicker={tr.busNo ? `Bus #${tr.busNo}` : undefined}
            title="Live map"
            right={
              <Pressable onPress={() => fullRecenterRef.current?.()} hitSlop={8} style={styles.fullRecenter}>
                <Ionicons name="locate-outline" size={20} color={colors.primary} />
              </Pressable>
            }
          />
          <View style={styles.fullMap}>
            <BusMap
              {...mapProps}
              interactive
              fullscreen
              onRecenterReady={(fn) => {
                fullRecenterRef.current = fn;
              }}
            />
            <View style={styles.fullHud} pointerEvents="none">
              <Text style={styles.fullHudLive}>{statusText}</Text>
              {tr.lat != null && tr.lng != null ? (
                <Text style={styles.fullHudLine}>
                  Bus now
                  {tr.speedKmh != null ? ` · ${Math.round(tr.speedKmh)} km/h` : ''}
                </Text>
              ) : (
                <Text style={styles.fullHudLine}>Waiting for live location…</Text>
              )}
              {youToBus ? <Text style={styles.fullHudLine}>You → bus · {youToBus}</Text> : null}
              {youToStop ? <Text style={styles.fullHudLine}>You → stop · {youToStop}</Text> : null}
              {studentStop ? (
                <Text style={styles.fullHudLine}>
                  {stopTitle} · {studentStop.name}
                  {distance ? ` · ${distance}` : ''}
                </Text>
              ) : null}
              {destination ? <Text style={styles.fullHudLine}>Destination · {destination}</Text> : null}
              {locReady && !me ? (
                <Text style={styles.fullHudMeta}>Allow location to show you on the map</Text>
              ) : null}
              {seen ? <Text style={styles.fullHudMeta}>Updated {seen}</Text> : null}
            </View>
          </View>
          <View style={[styles.legend, styles.fullLegend]}>
            <LegendDot color="#DC2626" label="Bus" />
            <LegendDot color="#7C3AED" label="You" />
            <LegendDot color="#94A3B8" label="Stop" />
            <LegendDot color="#2563EB" label={stopTitle} />
            <LegendDot color="#22C55E" label="Passed" />
          </View>
        </SafeAreaView>
      </Modal>
    </>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendTxt}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  mapBox: { height: 260, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.primarySoft },
  expandHint: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(15, 23, 42, 0.72)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  expandTxt: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.white },
  fullSafe: { flex: 1, backgroundColor: colors.paper },
  fullMap: { flex: 1, backgroundColor: colors.primarySoft, position: 'relative' },
  fullHud: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.82)',
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 2,
  },
  fullHudLive: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.white },
  fullHudLine: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.white },
  fullHudMeta: { fontFamily: fontFamily.medium, fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 2 },
  fullLegend: { paddingHorizontal: 18, paddingBottom: 12 },
  fullRecenter: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingTop: 8, paddingHorizontal: 4 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted },
  recenterBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  recenterTxt: { fontFamily: fontFamily.bold, fontSize: 12.5, color: colors.primary },
  statusCard: { padding: 16, gap: 12 },
  summaryCard: { padding: 16, gap: 6 },
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childName: { fontFamily: fontFamily.extraBold, fontSize: 18, color: colors.ink },
  childClass: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted, marginTop: 2 },
  busLine: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.ink },
  seenAt: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 4 },
  idleNote: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted, lineHeight: 18 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 10,
  },
  yoursRow: { alignItems: 'flex-start' },
  infoLabel: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted },
  infoValue: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink, textAlign: 'right' },
  sectionTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 13,
    color: colors.inkMuted,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  progressMeta: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginBottom: 8 },
  stopRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  stopDivider: { borderBottomWidth: 1, borderBottomColor: colors.rule },
  stopDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.inkMuted },
  stopDotYours: { backgroundColor: colors.primary },
  stopDotPassed: { backgroundColor: colors.present },
  stopDotCurrent: { backgroundColor: colors.coral },
  stopName: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13.5, color: colors.ink },
  stopNameYours: { fontFamily: fontFamily.bold },
  stopPassed: { color: colors.inkMuted },
  stopSeq: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted },
});
