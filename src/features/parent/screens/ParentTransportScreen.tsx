import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, Empty, ErrorState, IconButton, Loading, Pill, ScreenHeader } from '@/components/ui';
import type { PillTone } from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { useTransport } from '@/hooks/useTransport';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useToast } from '@/providers/ToastProvider';
import type { Transport, TransportStatus } from '@/models';
import { colors, fontFamily, radius } from '@/theme';
import { BusMap } from './transport/BusMap';

const STATUS_LABEL: Record<TransportStatus, string> = {
  on_route: 'On route',
  at_stop: 'At a stop',
  delayed: 'Delayed',
  idle: 'Not on a trip',
};

const STATUS_TONE: Record<TransportStatus, PillTone> = {
  on_route: 'present',
  at_stop: 'teal',
  delayed: 'late',
  idle: 'neutral',
};

function timeAgo(iso: string | null): string | null {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 'just now';
  const min = Math.round(ms / 60000);
  if (min < 1) return 'just now';
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  return `${hr}h ago`;
}

export function ParentTransportScreen() {
  const toast = useToast();
  const { childId } = useSelectedChild();
  const trQ = useTransport(childId);

  if (trQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Bus track" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (trQ.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Bus track" />
        <ErrorState onRetry={() => trQ.refetch()} />
      </SafeAreaView>
    );
  }
  if (!trQ.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Bus track" />
        <Empty message="No transport info yet." />
      </SafeAreaView>
    );
  }

  const tr: Transport = trQ.data;
  const seen = timeAgo(tr.lastPingAt);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={`Bus #${tr.busNo}${tr.routeName ? ` · ${tr.routeName}` : ''}`}
        title="Bus track"
        right={<IconButton icon="notifications-outline" onPress={() => toast('Coming soon')} />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={trQ.isRefetching} onRefresh={() => trQ.refetch()} />
        }
      >
        {tr.lat != null && tr.lng != null ? (
          <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
            <View style={styles.mapBox}>
              <BusMap lat={tr.lat} lng={tr.lng} busNo={tr.busNo} />
            </View>
          </View>
        ) : null}

        <View style={{ paddingHorizontal: 18, paddingTop: 8 }}>
          <Card style={styles.statusCard}>
            <View style={styles.statusHeader}>
              <View style={styles.statusIcon}>
                <Ionicons name="bus" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Pill tone={STATUS_TONE[tr.status]}>{STATUS_LABEL[tr.status]}</Pill>
                {seen ? <Text style={styles.seenAt}>Last update · {seen}</Text> : null}
              </View>
            </View>

            {tr.status === 'idle' ? (
              <Text style={styles.idleNote}>
                This bus hasn&apos;t started today&apos;s trip yet. Pull down to refresh.
              </Text>
            ) : (
              <>
                {tr.nextStopName ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Next stop</Text>
                    <Text style={styles.infoValue}>{tr.nextStopName}</Text>
                  </View>
                ) : null}
                {tr.speedKmh != null ? (
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>Speed</Text>
                    <Text style={styles.infoValue}>{Math.round(tr.speedKmh)} km/h</Text>
                  </View>
                ) : null}
              </>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  mapBox: { height: 200, borderRadius: radius.lg, overflow: 'hidden', backgroundColor: colors.primarySoft },
  statusCard: { padding: 16, gap: 14 },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seenAt: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 6 },
  idleNote: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted, lineHeight: 18 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    paddingTop: 10,
  },
  infoLabel: { fontFamily: fontFamily.medium, fontSize: 12.5, color: colors.inkMuted },
  infoValue: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink },
});
