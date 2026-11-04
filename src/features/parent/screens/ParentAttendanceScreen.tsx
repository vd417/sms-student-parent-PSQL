import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Empty, ErrorState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { AttendanceMonthCard } from '@/features/attendance/AttendanceMonthCard';
import { useAttendance, usePeriodAttendance, useAttendanceSummary } from '@/hooks/useAttendance';
import { useLeave } from '@/hooks/useLeave';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { useToast } from '@/providers/ToastProvider';
import { attendanceBySubject } from '@/lib/attendanceBySubject';
import { attendanceMonthCells } from '@/services/http/mappers';
import { rangeForPreset, type AttendancePreset } from '@/lib/attendanceRange';
import { isBlockingError, isInitialLoad } from '@/lib/queryStatus';
import { colors, fontFamily, radius } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

const PRESETS: { key: AttendancePreset; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'overall', label: 'Overall' },
];

export function ParentAttendanceScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const { childId } = useSelectedChild();
  const now = new Date();
  const attnQ = useAttendance(childId);
  const [preset, setPreset] = useState<AttendancePreset>('month');
  const { from, to } = rangeForPreset(preset, now);
  const monthRange = rangeForPreset('month', now);
  const periodQ = usePeriodAttendance(childId, from, to);
  const monthPeriodsQ = usePeriodAttendance(childId, monthRange.from, monthRange.to);
  const summaryQ = useAttendanceSummary(childId, from, to);
  const leaveQ = useLeave(childId);
  const childrenQ = useChildren();

  const isLoading = isInitialLoad(attnQ) || isInitialLoad(periodQ);
  const isError = isBlockingError(attnQ) && periodQ.data === undefined;
  const onRefresh = () => {
    attnQ.refetch();
    periodQ.refetch();
    monthPeriodsQ.refetch();
    summaryQ.refetch();
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
  if (!childId || !attnQ.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Attendance" onBack={() => nav.goBack()} />
        <Empty message="No children are linked to this account yet." />
      </SafeAreaView>
    );
  }

  const days = attnQ.data.days ?? [];
  const flags = Array.isArray(attnQ.data.flags) ? attnQ.data.flags : [];
  const cells = attendanceMonthCells(now.getFullYear(), now.getMonth(), days);
  const todayKind = cells.find((c) => c.d === now.getDate())?.kind;
  const showPresentToday = Boolean(summaryQ.data?.presentTodayBadge) && todayKind !== 'absent';
  const summary = summaryQ.data;
  const pct =
    summary?.attendancePercentage == null
      ? 'Not marked'
      : `${Number.isInteger(summary.attendancePercentage)
        ? summary.attendancePercentage
        : summary.attendancePercentage.toFixed(2)}%`;
  const counts = {
    present: summary?.presentPeriods ?? days.filter((d) => d.kind === 'present').length,
    absent: summary?.absentPeriods ?? days.filter((d) => d.kind === 'absent').length,
    late: summary?.latePeriods ?? days.filter((d) => d.kind === 'late').length,
    leave: summary?.leavePeriods ?? leaveQ.data?.length ?? 0,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={child?.name}
        title="Attendance"
        onBack={() => nav.goBack()}
        right={<IconButton icon="filter" onPress={() => toast('Coming soon')} />}
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
          <Card style={{ padding: 16, marginBottom: 12 }}>
            <Text style={styles.monthTitle}>Official attendance</Text>
            <Text style={{ fontFamily: fontFamily.extraBold, fontSize: 28, color: colors.ink, marginTop: 4 }}>
              {pct}
            </Text>
            {showPresentToday ? (
              <Text style={{ fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.present, marginTop: 6 }}>
                Present today
              </Text>
            ) : null}
            <Text style={{ fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 6 }}>
              Marked periods: {summary?.totalMarkedPeriods ?? 0}
            </Text>
          </Card>
          <AttendanceMonthCard
            now={now}
            days={days}
            periods={monthPeriodsQ.data ?? []}
            audience="parent"
          />
        </View>

        <Text style={[styles.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          By subject
        </Text>
        <View style={[styles.presetRow, { paddingHorizontal: 18 }]}>
          {PRESETS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setPreset(p.key)}
              style={[styles.presetChip, preset === p.key && styles.presetChipActive]}
            >
              <Text style={[styles.presetLabel, preset === p.key && styles.presetLabelActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 16 }}>
          {attendanceBySubject(periodQ.data ?? []).length === 0 ? (
            <Text style={styles.flagReason}>No subject attendance yet this month.</Text>
          ) : (
            attendanceBySubject(periodQ.data ?? []).map((row) => (
              <View key={`${row.subjectId ?? row.subject}`} style={styles.flagRow}>
                <View style={[styles.flagIcon, { backgroundColor: colors.primarySoft }]}>
                  <Text style={[styles.flagIconTxt, { color: colors.primary }]}>
                    {row.pct == null ? '—' : `${Math.round(row.pct)}%`}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flagDate}>{row.subject}</Text>
                  <Text style={styles.flagReason}>
                    Present {row.present} · Late {row.late} · Absent {row.absent}
                    {row.leave ? ` · Leave ${row.leave}` : ''}
                  </Text>
                </View>
                <Text style={styles.flagAction}>{row.marked} periods</Text>
              </View>
            ))
          )}
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
                  {String(f.date ?? '').split(' ')[1] ?? ''}
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
  presetRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.ruleSoft,
  },
  presetChipActive: { backgroundColor: colors.ink },
  presetLabel: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  presetLabelActive: { color: colors.paper },
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
