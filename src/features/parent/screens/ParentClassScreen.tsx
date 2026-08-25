import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Empty, ErrorState, Loading, Pill } from '@/components/ui';
import { KidSwitcher } from '../components/KidSwitcher';
import { useChildren } from '@/hooks/useParent';
import { useSubjects } from '@/hooks/useSubjects';
import { useGrades, useExams } from '@/hooks/useGrades';
import { useAttendanceSummary, usePeriodAttendance } from '@/hooks/useAttendance';
import { useTimetable } from '@/hooks/useStudent';
import { useHomework } from '@/hooks/useHomework';
import { useSelectedChild } from '@/providers/ChildProvider';
import { rangeForPreset, type AttendancePreset } from '@/lib/attendanceRange';
import {
  colors,
  fontFamily,
  hueColor,
  radius,
  primaryGradient,
  spacing,
  typography,
} from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { buildReportFromGrades } from '@/lib/reportCardBuild';
import { examsForClassCatalog, gradesForSubject, normalizeSubjectName } from '@/lib/belongsToSubject';
import { attendanceBySubject, attendanceForSubject } from '@/lib/attendanceBySubject';
import { gradeFor } from '@/lib/gradeScale';
import { subjectShortCode, compareTimetableBlocks } from '@/services/http/mappers';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const ATTENDANCE_PRESETS: { key: AttendancePreset; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'overall', label: 'Overall' },
];

function formatPct(pct: number | null | undefined): string {
  if (pct == null || Number.isNaN(Number(pct))) return '—';
  const n = Number(pct);
  return `${Number.isInteger(n) ? n : n.toFixed(1)}%`;
}

export function ParentClassScreen() {
  const nav = useNavigation<Nav>();
  const { childId } = useSelectedChild();
  const [attendancePreset, setAttendancePreset] = useState<AttendancePreset>('month');
  const { from: attnFrom, to: attnTo } = rangeForPreset(attendancePreset, new Date());
  const childrenQ = useChildren();
  const subjectsQ = useSubjects(childId);
  const gradesQ = useGrades(childId);
  const examsQ = useExams(childId);
  const summaryQ = useAttendanceSummary(childId);
  const periodQ = usePeriodAttendance(childId, attnFrom, attnTo);
  const timetableQ = useTimetable(childId);
  const homeworkQ = useHomework(childId);

  const isLoading = childrenQ.isLoading || subjectsQ.isLoading || gradesQ.isLoading;
  const isError = childrenQ.isError || gradesQ.isError;
  const onRefresh = () => {
    childrenQ.refetch();
    subjectsQ.refetch();
    gradesQ.refetch();
    examsQ.refetch();
    summaryQ.refetch();
    periodQ.refetch();
    timetableQ.refetch();
    homeworkQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const children = childrenQ.data ?? [];
  if (children.length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Class</Text>
          <Text style={[typography.h1, { marginTop: 2 }]}>Class</Text>
        </View>
        <Empty message="No children are linked to this account yet." />
      </SafeAreaView>
    );
  }
  const child = children.find((c) => c.id === childId) ?? children[0];
  const subjects = subjectsQ.data ?? [];
  const report = buildReportFromGrades(gradesQ.data ?? [], subjects);
  const overall = report.rows.length ? Math.round(report.pct) : child?.avg || 0;
  const letter = report.rows.length ? report.grade : overall > 0 ? gradeFor(overall) : '—';
  const attn = summaryQ.data?.attendancePercentage ?? child?.attn ?? null;
  const classExams = examsForClassCatalog(examsQ.data ?? [], subjects).slice(0, 6);
  const bySubject = attendanceBySubject(periodQ.data ?? []);
  const todayShort = WEEKDAY_SHORT[new Date().getDay()];
  const todayBlocks = (timetableQ.data ?? [])
    .filter((b) => b.day === todayShort)
    .sort(compareTimetableBlocks);
  const homeworkRows = (homeworkQ.data ?? [])
    .filter((h) => h.status !== 'graded')
    .slice(0, 6);
  const subjectName = (subjId: string) => subjects.find((s) => s.id === subjId)?.name || 'Subject';

  const subjectRows = (subjects.length ? subjects : report.rows.map((r) => ({
    id: `name:${r.subject.toLowerCase()}`,
    name: r.subject,
    short: subjectShortCode(r.subject),
    teacher: '',
    avg: 0,
    trend: 0,
    color: 'blue' as const,
  }))).map((sub) => {
    const slice = buildReportFromGrades(gradesForSubject(gradesQ.data ?? [], sub, subjects), [sub, ...subjects]);
    const avg = slice.rows.length ? Math.round(slice.pct) : 0;
    const attnRow = attendanceForSubject(periodQ.data ?? [], sub);
    return { sub, avg, letter: slice.rows[0]?.grade || (avg > 0 ? gradeFor(avg) : '—'), attn: attnRow?.pct ?? null };
  });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={childrenQ.isRefetching || gradesQ.isRefetching}
            onRefresh={onRefresh}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>{child?.grade || 'Class'}</Text>
          <Text style={[typography.h1, { marginTop: 2 }]}>Class</Text>
        </View>

        <KidSwitcher />

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Pressable onPress={() => nav.navigate('Grades', { studentId: childId })}>
            <LinearGradient
              colors={primaryGradient as [string, string, string]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.hero}
            >
              <Text style={styles.heroEyebrow}>{child?.name || 'Child'} · report card</Text>
              <View style={styles.heroVal}>
                <Text style={styles.heroNum}>
                  {overall}
                  <Text style={styles.heroPct}>%</Text>
                </Text>
                <View style={{ paddingBottom: 8 }}>
                  <Text style={styles.heroGrade}>{letter}</Text>
                  <Text style={styles.heroDelta}>{report.rows.length ? report.result : child?.grade || ''}</Text>
                </View>
              </View>
              <View style={styles.heroStats}>
                <HeroStat label="GPA" value={report.rows.length ? String(report.gpa) : '—'} />
                <HeroStat
                  label="Attendance"
                  value={formatPct(attn)}
                  divider
                  onPress={() => nav.navigate('Attendance')}
                />
                <HeroStat
                  label="Papers"
                  value={String(report.rows.length)}
                  onPress={() => nav.navigate('Grades', { studentId: childId })}
                />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          {"Today's timetable"}
        </Text>
        <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 16 }}>
          {todayBlocks.length === 0 ? (
            <Empty message="No periods on the timetable for today." />
          ) : (
            todayBlocks.map((b, i) => (
              <View key={`${b.t}-${i}`} style={styles.subjCard}>
                <View style={styles.subjTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjName}>{b.label}</Text>
                    <Text style={styles.subjTeacher}>
                      {b.t}
                      {b.endT ? `–${b.endT}` : ''}
                      {b.room ? ` · Room ${b.room}` : ''}
                      {b.teacher ? ` · ${b.teacher}` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Subject performance
        </Text>
        <View style={{ paddingHorizontal: 18, gap: 10, marginBottom: 16 }}>
          {subjectRows.length === 0 ? (
            <Empty message="No subjects or exam marks yet for this class" />
          ) : (
            subjectRows.map(({ sub, avg, letter: band, attn: subAttn }) => (
              <Pressable
                key={sub.id}
                onPress={() => nav.navigate('SubjectDetail', { id: sub.id, studentId: childId })}
                style={styles.subjCard}
              >
                <View style={styles.subjTop}>
                  <View style={[styles.subjIcon, { backgroundColor: hueColor(sub.color) }]}>
                    <Text style={styles.subjIconTxt}>{sub.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjName}>{sub.name}</Text>
                    <Text style={styles.subjTeacher}>
                      {sub.teacher || band}
                      {subAttn != null ? ` · attn ${formatPct(subAttn)}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.subjAvg}>{avg > 0 ? `${avg}%` : '—'}</Text>
                    <Text style={[styles.subjTrend, { color: colors.inkMuted }]}>{band}</Text>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${Math.min(100, avg)}%`, backgroundColor: hueColor(sub.color) },
                    ]}
                  />
                </View>
              </Pressable>
            ))
          )}
        </View>

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Attendance by subject
        </Text>
        <View style={[styles.presetRow, { paddingHorizontal: 18 }]}>
          {ATTENDANCE_PRESETS.map((p) => (
            <Pressable
              key={p.key}
              onPress={() => setAttendancePreset(p.key)}
              style={[styles.presetChip, attendancePreset === p.key && styles.presetChipActive]}
            >
              <Text
                style={[styles.presetLabel, attendancePreset === p.key && styles.presetLabelActive]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </View>
        <View style={{ paddingHorizontal: 18, gap: 8, marginBottom: 16 }}>
          {bySubject.length === 0 ? (
            <Empty message="No period attendance yet for this range" />
          ) : (
            bySubject.map((row) => {
              const catalogId = subjects.find(
                (s) =>
                  (row.subjectId && s.id === row.subjectId) ||
                  normalizeSubjectName(s.name) === normalizeSubjectName(row.subject),
              )?.id;
              return (
                <Pressable
                  key={`${row.subjectId ?? row.subject}`}
                  disabled={!catalogId}
                  onPress={() =>
                    catalogId && nav.navigate('SubjectDetail', { id: catalogId, studentId: childId })
                  }
                  style={styles.subjCard}
                >
                  <View style={styles.subjTop}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subjName}>{row.subject}</Text>
                      <Text style={styles.subjTeacher}>
                        Present {row.present} · Late {row.late} · Absent {row.absent}
                      </Text>
                    </View>
                    <Text style={styles.subjAvg}>{formatPct(row.pct)}</Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Tests
        </Text>
        <View style={{ paddingHorizontal: 18, gap: 8 }}>
          {classExams.length === 0 ? (
            <Empty message="No exams scheduled for this class yet" />
          ) : (
            classExams.map((e) => (
              <View key={e.id} style={styles.subjCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Pill tone={e.status === 'upcoming' ? 'primary' : 'present'}>{e.status}</Pill>
                  <Text style={styles.subjTeacher}>{e.date} · {e.time}</Text>
                </View>
                <Text style={[styles.subjName, { marginTop: 8 }]}>{e.title}</Text>
                <Text style={styles.subjTeacher}>
                  {e.subjectName || 'Subject'} · {e.dur} · {e.max} marks
                </Text>
              </View>
            ))
          )}
        </View>

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginTop: 16, marginBottom: 8 }]}>
          Homework
        </Text>
        <View style={{ paddingHorizontal: 18, gap: 8 }}>
          {homeworkRows.length === 0 ? (
            <Empty message="No homework pending." />
          ) : (
            homeworkRows.map((h) => (
              <Pressable
                key={h.id}
                onPress={() => nav.navigate('HomeworkDetail', { id: h.id, studentId: childId })}
                style={styles.subjCard}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Pill tone={h.status === 'submitted' ? 'present' : 'primary'}>{h.status}</Pill>
                  <Text style={styles.subjTeacher}>{h.due}{h.dueT ? ` · ${h.dueT}` : ''}</Text>
                </View>
                <Text style={[styles.subjName, { marginTop: 8 }]}>{h.title}</Text>
                <Text style={styles.subjTeacher}>{subjectName(h.subjId)}</Text>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({
  label,
  value,
  divider,
  onPress,
}: {
  label: string;
  value: string;
  divider?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.heroStat, divider && styles.heroStatDivider]}
    >
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12, gap: spacing.s },
  kicker: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  hero: { borderRadius: radius.lg, padding: 18 },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroVal: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 8 },
  heroNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: 56,
    color: colors.white,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroPct: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  heroGrade: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.white },
  heroDelta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStat: { flex: 1, paddingHorizontal: 8 },
  heroStatDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroStatValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.white,
    marginTop: 4,
  },
  subjCard: {
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  subjTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjIconTxt: { fontFamily: fontFamily.extraBold, fontSize: 12, color: colors.white },
  subjName: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  subjTeacher: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  subjAvg: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  subjTrend: { fontFamily: fontFamily.bold, fontSize: 10 },
  barBg: {
    height: 6,
    backgroundColor: colors.ruleSoft,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
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
});
