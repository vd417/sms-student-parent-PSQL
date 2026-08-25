import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import {
  Avatar,
  Button,
  Card,
  Empty,
  ErrorState,
  IconButton,
  Loading,
  ScreenHeader,
} from '@/components/ui';
import { Ionicons } from '@expo/vector-icons';
import { monogramFromName } from '@/components/ui/monogram';
import { useTransport } from '@/hooks/useTransport';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useToast } from '@/providers/ToastProvider';
import { colors, fontFamily, radius } from '@/theme';

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

  const tr = trQ.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={`Bus #${tr.busNo} · ${tr.plate}`}
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
        {/* mock map */}
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <View style={styles.map}>
            <Svg width="100%" height="100%" viewBox="0 0 400 220" style={StyleSheet.absoluteFill}>
              <Path
                d="M-10 160 Q 100 140 200 150 T 410 130"
                stroke="rgba(255,255,255,0.6)"
                strokeWidth={20}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M50 -10 Q 80 80 120 120 T 200 200"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={14}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d="M260 -10 Q 280 80 300 130"
                stroke="rgba(255,255,255,0.4)"
                strokeWidth={14}
                fill="none"
                strokeLinecap="round"
              />
              <Circle cx={80} cy={153} r={6} fill={colors.primary} opacity={0.6} />
              <Circle cx={160} cy={148} r={6} fill={colors.primary} opacity={0.6} />
              <Circle cx={220} cy={148} r={9} fill={colors.coral} stroke="#fff" strokeWidth={3} />
              <Circle cx={320} cy={138} r={6} fill={colors.inkSoft} />
              <G x={165} y={130}>
                <Rect width={36} height={22} rx={6} fill={colors.primary} />
                <Rect x={4} y={4} width={9} height={9} rx={2} fill="rgba(255,255,255,0.5)" />
                <Rect x={15} y={4} width={9} height={9} rx={2} fill="rgba(255,255,255,0.5)" />
                <Circle cx={9} cy={22} r={3} fill={colors.ink} />
                <Circle cx={27} cy={22} r={3} fill={colors.ink} />
              </G>
            </Svg>
            <View style={styles.mapCard}>
              <View style={styles.mapIcon}>
                <Ionicons name="location" size={20} color={colors.white} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.mapTitle}>
                  {tr.nextStops.length} stop{tr.nextStops.length === 1 ? '' : 's'} away
                </Text>
                <Text style={styles.mapMeta}>ETA at your stop · {tr.eta}</Text>
              </View>
              <Button size="md" variant="primary">
                Notify me
              </Button>
            </View>
          </View>
        </View>

        <Text style={[styles.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>Driver</Text>
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Card style={styles.driver}>
            <Avatar initials={monogramFromName(tr.driver)} size={44} hue="mint" />
            <View style={{ flex: 1 }}>
              <Text style={styles.driverName}>{tr.driver}</Text>
              <Text style={styles.driverMeta}>Bus #{tr.busNo}</Text>
            </View>
            <IconButton icon="chatbubble-outline" onPress={() => toast('Coming soon')} />
            <IconButton icon="call-outline" onPress={() => toast('Coming soon')} />
          </Card>
        </View>

        <Text style={[styles.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Route — afternoon run
        </Text>
        <View style={{ paddingHorizontal: 18 }}>
          <Card style={{ padding: 14 }}>
            {tr.nextStops.map((s, i) => (
              <View key={i} style={styles.stopRow}>
                <View style={styles.stopCol}>
                  <View
                    style={[
                      styles.stopDot,
                      {
                        backgroundColor: s.done
                          ? colors.present
                          : s.you
                            ? colors.coral
                            : colors.white,
                        borderWidth: s.you ? 3 : s.done ? 0 : 2,
                        borderColor: s.you ? colors.coral : colors.rule,
                      },
                    ]}
                  />
                  {i < tr.nextStops.length - 1 ? (
                    <View
                      style={[
                        styles.stopLine,
                        { backgroundColor: s.done ? colors.present : colors.rule },
                      ]}
                    />
                  ) : null}
                </View>
                <View style={{ flex: 1, paddingBottom: 8 }}>
                  <Text
                    style={[
                      styles.stopName,
                      {
                        color: s.you ? colors.coral : colors.ink,
                        fontFamily: s.you ? fontFamily.extraBold : fontFamily.bold,
                      },
                    ]}
                  >
                    {s.stop}
                    {s.you ? ' · your stop' : ''}
                  </Text>
                  <Text style={styles.stopEta}>
                    {s.done ? 'Picked up · ' : 'ETA · '}
                    {s.eta}
                  </Text>
                </View>
              </View>
            ))}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  map: {
    height: 220,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  mapCard: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.95)',
  },
  mapIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapTitle: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.ink },
  mapMeta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  driver: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  driverName: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  driverMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  stopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  stopCol: { width: 24, alignItems: 'center' },
  stopDot: { width: 14, height: 14, borderRadius: 7 },
  stopLine: { width: 2, flex: 1, minHeight: 16, marginTop: 2 },
  stopName: { fontSize: 13 },
  stopEta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
});
