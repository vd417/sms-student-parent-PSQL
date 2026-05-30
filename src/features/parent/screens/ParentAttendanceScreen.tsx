import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, ErrorState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { useAttendance } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import type { AttendanceKind } from '@/models';
import { colors, fontFamily, radius } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

const TONES: Record<AttendanceKind, { bg: string; fg: string; border?: string }> = {
  present: { bg: colors.present, fg: colors.white },
  absent: { bg: colors.absent, fg: colors.white },
  late: { bg: colors.late, fg: colors.white },
  off: { bg: colors.ruleSoft, fg: colors.inkSoft },
  future: { bg: colors.white, fg: colors.inkSoft, border: colors.rule },
};

export function ParentAttendanceScreen() {
  const nav = useNavigation<Nav>();
  const { childId } = useSelectedChild();
  const attnQ = useAttendance(childId);
  const leaveQ = useLeave(childId);
  const childrenQ = useChildren();

  const isLoading = attnQ.isLoading || childrenQ.isLoading;
  const isError = attnQ.isError || childrenQ.isError;
  const onRefresh = () => {
    attnQ.refetch();
    leaveQ.refetch();
    childrenQ.refetch();
  };

  const child = childrenQ.data?.find((c) => c.id === childId);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Attendance" onBack={() => nav.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Attendance" onBack={() => nav.goBack()} />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const { days, flags } = attnQ.data!;
  const counts = {
    present: days.filter((d) => d.kind === 'present').length,
    absent: days.filter((d) => d.kind === 'absent').length,
    late: days.filter((d) => d.kind === 'late').length,
    leave: leaveQ.data?.length ?? 0,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={child?.name}
        title="Attendance"
        onBack={() => nav.goBack()}
        right={<IconButton icon="filter" />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={attnQ.isRefetching} onRefresh={onRefresh} />}
      >
        <View style={styles.statsRow}>
          <SmallStat tone="present" label="Present" value={String(counts.present)} />
          <SmallStat tone="absent" label="Absent" value={String(counts.absent)} />
          <SmallStat tone="late" label="Late" value={String(counts.late)} />
          <SmallStat tone="primary" label="Leave" value={String(counts.leave)} />
        </View>

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Card style={{ padding: 16 }}>
            <Text style={styles.monthTitle}>April 2026</Text>
            <View style={styles.weekRow}>
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((x, i) => (
                <Text key={i} style={styles.weekLabel}>
                  {x}
                </Text>
              ))}
            </View>
            <View style={styles.grid}>
              {[0, 1].map((i) => (
                <View key={`b${i}`} style={styles.cell} />
              ))}
              {days.map(({ d, kind }) => {
                const t = TONES[kind];
                return (
                  <View
                    key={d}
                    style={[
                      styles.cell,
                      styles.dayCell,
                      {
                        backgroundColor: t.bg,
                        borderWidth: t.border ? 1 : 0,
                        borderColor: t.border,
                      },
                    ]}
                  >
                    <Text style={[styles.dayTxt, { color: t.fg }]}>{d}</Text>
                  </View>
                );
              })}
            </View>
            <View style={styles.legend}>
              {(
                [
                  ['present', 'Present'],
                  ['absent', 'Absent'],
                  ['late', 'Late'],
                  ['off', 'Off'],
                ] as [AttendanceKind, string][]
              ).map(([k, l]) => (
                <View key={k} style={styles.legendItem}>
                  <View
                    style={[
                      styles.legendDot,
                      {
                        backgroundColor: TONES[k].bg,
                        borderWidth: TONES[k].border ? 1 : 0,
                        borderColor: TONES[k].border,
                      },
                    ]}
                  />
                  <Text style={styles.legendTxt}>{l}</Text>
                </View>
              ))}
            </View>
          </Card>
        </View>

        <Text style={[styles.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Recent flags
        </Text>
        <View style={{ paddingHorizontal: 18, gap: 8 }}>
          {flags.map((f) => (
            <View key={f.id} style={styles.flagRow}>
              <View
                style={[
                  styles.flagIcon,
                  { backgroundColor: f.tone === 'absent' ? colors.absentSoft : colors.lateSoft },
                ]}
              >
                <Text
                  style={[
                    styles.flagIconTxt,
                    { color: f.tone === 'absent' ? colors.absent : colors.late },
                  ]}
                >
                  {f.date.split(' ')[1]}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flagDate}>{f.date}</Text>
                <Text style={styles.flagReason}>{f.reason}</Text>
              </View>
              <Text style={styles.flagAction}>{f.action}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SmallStat({
  tone,
  label,
  value,
}: {
  tone: 'present' | 'absent' | 'late' | 'primary';
  label: string;
  value: string;
}) {
  const map = {
    present: { bg: colors.presentSoft, fg: colors.present },
    absent: { bg: colors.absentSoft, fg: colors.absent },
    late: { bg: colors.lateSoft, fg: colors.late },
    primary: { bg: colors.primarySoft, fg: colors.primary },
  }[tone];
  return (
    <View style={[styles.smallStat, { backgroundColor: map.bg }]}>
      <Text style={[styles.smallStatVal, { color: map.fg }]}>{value}</Text>
      <Text style={[styles.smallStatLabel, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 14 },
  smallStat: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  smallStatVal: { fontFamily: fontFamily.extraBold, fontSize: 20, fontVariant: ['tabular-nums'] },
  smallStatLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  monthTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 14,
  },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayCell: { borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayTxt: { fontFamily: fontFamily.bold, fontSize: 11 },
  legend: { flexDirection: 'row', gap: 12, marginTop: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendTxt: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.inkMuted },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  flagIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagIconTxt: { fontFamily: fontFamily.extraBold, fontSize: 11, textTransform: 'uppercase' },
  flagDate: { fontFamily: fontFamily.bold, fontSize: 12.5, color: colors.ink },
  flagReason: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  flagAction: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.primary },
});
