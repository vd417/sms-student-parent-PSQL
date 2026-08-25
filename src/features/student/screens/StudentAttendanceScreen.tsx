import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, ErrorState, Loading, ScreenHeader } from '@/components/ui';
import { useStudentProfile } from '@/hooks/useStudent';
import { useSubjects } from '@/hooks/useSubjects';
import { useAttendanceSummary, usePeriodAttendance } from '@/hooks/useAttendance';
import { attendanceBySubject } from '@/lib/attendanceBySubject';
import { normalizeSubjectName } from '@/lib/belongsToSubject';
import { rangeForPreset, type AttendancePreset } from '@/lib/attendanceRange';
import { colors, fontFamily, radius } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const PRESETS: { key: AttendancePreset; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'overall', label: 'Overall' },
];

function formatPct(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(Number(pct))) return 'Not marked';
  const n = Number(pct);
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export function StudentAttendanceScreen() {
  const nav = useNavigation<Nav>();
  const meQ = useStudentProfile();
  const subjectsQ = useSubjects();
  const [preset, setPreset] = useState<AttendancePreset>('month');
  const { from, to } = rangeForPreset(preset, new Date());
  const summaryQ = useAttendanceSummary('', from, to);
  const periodQ = usePeriodAttendance('', from, to);

  const isLoading = meQ.isLoading || summaryQ.isLoading || periodQ.isLoading;
  const isError = meQ.isError || summaryQ.isError || periodQ.isError;
  const onRefresh = () => {
    meQ.refetch();
    subjectsQ.refetch();
    summaryQ.refetch();
    periodQ.refetch();
  };

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

  const summary = summaryQ.data;
  const rows = periodQ.data ?? [];
  const bySubject = attendanceBySubject(rows);
  const catalog = subjectsQ.data ?? [];
  const pctLabel = formatPct(summary?.attendancePercentage ?? meQ.data?.attnPct);
  const classLabel = meQ.data?.classroom || meQ.data?.grade || '';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader kicker={classLabel || undefined} title="Attendance" onBack={() => nav.goBack()} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 18 }}
        refreshControl={<RefreshControl refreshing={periodQ.isRefetching} onRefresh={onRefresh} />}
      >
        <Card style={{ padding: 16, gap: 10, marginBottom: 14 }}>
          <Text style={styles.eyebrow}>Official attendance</Text>
          <Text style={styles.pct}>{pctLabel}</Text>
          {summary?.presentTodayBadge ? (
            <Text style={styles.badge}>Present today</Text>
          ) : null}
          <View style={styles.breakdown}>
            <Text style={styles.meta}>Present: {summary?.presentPeriods ?? 0}</Text>
            <Text style={styles.meta}>Late: {summary?.latePeriods ?? 0}</Text>
            <Text style={styles.meta}>Absent: {summary?.absentPeriods ?? 0}</Text>
            <Text style={styles.meta}>Marked periods: {summary?.totalMarkedPeriods ?? 0}</Text>
          </View>
        </Card>

        <Text style={styles.eyebrow}>By subject</Text>
        <View style={styles.presetRow}>
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
        <Card style={{ padding: 16, gap: 10, marginBottom: 14 }}>
          {bySubject.length === 0 ? (
            <Text style={styles.empty}>No period attendance yet.</Text>
          ) : (
            bySubject.map((row) => {
              const catalogId = catalog.find(
                (s) =>
                  (row.subjectId && s.id === row.subjectId) ||
                  normalizeSubjectName(s.name) === normalizeSubjectName(row.subject),
              )?.id;
              return (
                <Pressable
                  key={`${row.subjectId ?? row.subject}`}
                  disabled={!catalogId}
                  onPress={() => catalogId && nav.navigate('SubjectDetail', { id: catalogId })}
                  style={styles.row}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={styles.date}>{row.subject}</Text>
                    <Text style={styles.subject}>
                      Present {row.present} · Late {row.late} · Absent {row.absent}
                    </Text>
                  </View>
                  <Text style={styles.status}>{formatPct(row.pct)}</Text>
                </Pressable>
              );
            })
          )}
        </Card>

        <Text style={styles.eyebrow}>Period marks</Text>
        <Card style={{ padding: 16, gap: 10 }}>
          {rows.length === 0 ? (
            <Text style={styles.empty}>No period attendance yet.</Text>
          ) : (
            rows.map((row) => (
              <View key={row.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.date}>{row.date}</Text>
                  <Text style={styles.subject}>
                    P{row.period} · {row.subject}
                  </Text>
                </View>
                <Text style={styles.status}>{row.status}</Text>
              </View>
            ))
          )}
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  eyebrow: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.inkSoft,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  pct: { fontFamily: fontFamily.extraBold, fontSize: 32, color: colors.ink },
  badge: {
    alignSelf: 'flex-start',
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.present,
    backgroundColor: colors.ruleSoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.md,
  },
  breakdown: { gap: 4, marginTop: 4 },
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
  meta: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.inkMuted },
  empty: { fontFamily: fontFamily.medium, fontSize: 14, color: colors.inkMuted },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.ruleSoft,
  },
  date: { fontFamily: fontFamily.semiBold, fontSize: 14, color: colors.ink },
  subject: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  status: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.ink, textTransform: 'capitalize' },
});
