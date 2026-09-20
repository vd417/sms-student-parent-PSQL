import { useState } from 'react';
import { Pressable, ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Avatar,
  Card,
  Empty,
  ErrorState,
  IconButton,
  Loading,
  Pill,
  ScreenHeader,
  TabBar,
} from '@/components/ui';
import { HomeworkCard } from '@/components/cards/HomeworkCard';
import { useSubject, useSubjects } from '@/hooks/useSubjects';
import { useGrades, useExams } from '@/hooks/useGrades';
import { useHomework } from '@/hooks/useHomework';
import { usePeriodAttendance } from '@/hooks/useAttendance';
import { useOpenThread } from '@/hooks/useMessaging';
import { belongsToSubject, examsForClassCatalog, gradesForSubject, normalizeSubjectName } from '@/lib/belongsToSubject';
import { attendanceForSubject } from '@/lib/attendanceBySubject';
import { buildReportFromGrades } from '@/lib/reportCardBuild';
import { gradeFor } from '@/lib/gradeScale';
import { subjectShortCode } from '@/services/http/mappers';
import { rangeForPreset, type AttendancePreset } from '@/lib/attendanceRange';
import { colors, fontFamily, hueColor, hueForName, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { Exam, Grade, Subject } from '@/models';

type Tab = 'overview' | 'grades' | 'tests' | 'homework' | 'attendance';

const ATTENDANCE_PRESETS: { key: AttendancePreset; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'overall', label: 'Overall' },
];

const WEEKDAY_LONG = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function dayLabelFor(dateStr: string): string {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return dateStr;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return `${WEEKDAY_LONG[d.getDay()]}, ${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function formatMarkedByRole(role?: string): string | null {
  if (!role) return null;
  const words = role.split(/[._-]+/).filter(Boolean);
  if (!words.length) return null;
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');
}
type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SubjectDetail'>;

export function SubjectDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const subjectId = route.params.id;
  const studentId = route.params.studentId;
  const [tab, setTab] = useState<Tab>('overview');

  const subjectQ = useSubject(subjectId, studentId);
  const subjectsQ = useSubjects(studentId);
  const gradesQ = useGrades(studentId);
  const examsQ = useExams(studentId);
  const homeworkQ = useHomework(studentId);
  const [attendancePreset, setAttendancePreset] = useState<AttendancePreset>('month');
  const { from: attnFrom, to: attnTo } = rangeForPreset(attendancePreset, new Date());
  const periodQ = usePeriodAttendance(studentId, attnFrom, attnTo);
  const openThread = useOpenThread('student');

  const catalog = subjectsQ.data ?? [];
  const sub = resolveSubject(subjectId, subjectQ.data, catalog);

  const isLoading = (subjectQ.isLoading && subjectsQ.isLoading) || (!sub && (subjectQ.isLoading || subjectsQ.isLoading));
  const isError = (subjectQ.isError && subjectsQ.isError) || (!isLoading && !sub);
  const onRefresh = () => {
    subjectQ.refetch();
    subjectsQ.refetch();
    gradesQ.refetch();
    examsQ.refetch();
    homeworkQ.refetch();
    periodQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Subject" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError || !sub) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Subject" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const grades = gradesQ.data ?? [];
  const catalogExams = examsForClassCatalog(examsQ.data ?? [], catalog);
  const homework = homeworkQ.data ?? [];
  const subjGrades = gradesForSubject(grades, sub, catalog);
  const subjExams = catalogExams
    .filter((e) => belongsToSubject(e, sub, catalog))
    .map((e) => overlayExamScore(e, subjGrades));
  const subjHw = homework.filter((h) => belongsToSubject(h, sub, catalog));
  const slice = buildReportFromGrades(subjGrades, [sub, ...catalog]);
  const avgPct = slice.rows.length ? Math.round(slice.pct) : sub.avg > 0 ? sub.avg : 0;
  const letter = slice.rows[0]?.grade || (avgPct > 0 ? gradeFor(avgPct) : '—');
  const subjAttn = attendanceForSubject(periodQ.data ?? [], sub);
  const wantSubjName = normalizeSubjectName(sub.name);
  const subjPeriods = (periodQ.data ?? [])
    .filter(
      (p) => (p.subjectId && p.subjectId === sub.id) || normalizeSubjectName(p.subject) === wantSubjName,
    )
    .sort((a, b) => b.date.localeCompare(a.date) || a.period - b.period);
  const attnLabel =
    subjAttn?.pct == null ? '—' : `${Number.isInteger(subjAttn.pct) ? subjAttn.pct : subjAttn.pct.toFixed(1)}%`;
  const sparkValues = subjGrades
    .slice(0, 8)
    .reverse()
    .map((g) => (g.max > 0 ? Math.round((g.score / g.max) * 100) : 0));
  while (sparkValues.length < 8) sparkValues.unshift(0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={sub.teacher}
        title={sub.name}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={
              subjectQ.isRefetching ||
              subjectsQ.isRefetching ||
              gradesQ.isRefetching ||
              examsQ.isRefetching ||
              homeworkQ.isRefetching ||
              periodQ.isRefetching
            }
            onRefresh={onRefresh}
          />
        }
      >
        <View style={[styles.hero, { backgroundColor: hueColor(sub.color) }]}>
          <Stat label="Average" value={`${avgPct}%`} />
          <Stat label="Grade" divider value={letter} />
          <Stat label="Attendance" value={attnLabel} />
        </View>

        <View style={{ marginVertical: 14 }}>
          <TabBar<Tab>
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'grades', label: 'Grades' },
              { key: 'tests', label: 'Tests' },
              { key: 'homework', label: 'Homework' },
              { key: 'attendance', label: 'Attendance' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'overview' ? (
          <View style={{ gap: 18 }}>
            <Card style={{ padding: 16 }}>
              <Text style={[typography.eyebrow, { marginBottom: 10 }]}>Last assessments</Text>
              {gradesQ.isLoading ? (
                <Loading />
              ) : subjGrades.length === 0 ? (
                <Empty message="No marks for this subject yet" />
              ) : (
                <>
                  <SparkBars values={sparkValues} />
                  <View style={styles.sparkLabels}>
                    {['Older', '', '', 'Recent'].map((m, i) => (
                      <Text key={`${m}-${i}`} style={styles.sparkLabel}>
                        {m}
                      </Text>
                    ))}
                  </View>
                </>
              )}
            </Card>

            <Card style={{ padding: 16 }}>
              <Text style={[typography.eyebrow, { marginBottom: 10 }]}>Attendance</Text>
              {periodQ.isLoading ? (
                <Loading />
              ) : !subjAttn ? (
                <Empty message="No period attendance for this subject yet" />
              ) : (
                <View style={{ gap: 4 }}>
                  <Text style={styles.teacherName}>{attnLabel}</Text>
                  <Text style={styles.teacherMeta}>
                    Present {subjAttn.present} · Late {subjAttn.late} · Absent {subjAttn.absent}
                    {subjAttn.leave ? ` · Leave ${subjAttn.leave}` : ''} · {subjAttn.marked} periods
                  </Text>
                </View>
              )}
            </Card>

            <View>
              <Text style={[typography.eyebrow, { marginBottom: 8 }]}>Teacher</Text>
              <Card style={styles.teacher}>
                <Avatar
                  initials={
                    sub.teacher
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2) || '?'
                  }
                  size={44}
                  hue={hueForName(sub.teacher)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.teacherName}>{sub.teacher || 'Teacher'}</Text>
                  <Text style={styles.teacherMeta}>{sub.name}</Text>
                </View>
                <IconButton
                  icon="chatbubble-outline"
                  onPress={() => {
                    const name = (sub.teacher ?? '').trim();
                    if (!name) return;
                    openThread.mutate(
                      { name, role: sub.name },
                      { onSuccess: (th) =>
                        nav.navigate('ChatThread', { id: th.id, name: th.name, role: th.role })
                      },
                    );
                  }}
                />
              </Card>
            </View>
          </View>
        ) : null}

        {tab === 'grades' ? (
          <View style={{ gap: 8 }}>
            {gradesQ.isPending && !gradesQ.data ? (
              <Loading />
            ) : gradesQ.isError && !gradesQ.data ? (
              <ErrorState onRetry={() => gradesQ.refetch()} />
            ) : subjGrades.length === 0 ? (
              <Empty message="No marks for this subject yet" />
            ) : (
              subjGrades.map((g) => {
              const pct = g.max > 0 ? Math.round((g.score / g.max) * 100) : 0;
              const band = g.grade || gradeFor(pct);
              return (
              <View key={g.id} style={styles.gradeRow}>
                <View style={[styles.gradeIcon, { backgroundColor: hueColor(sub.color, 'tint') }]}>
                  <Text style={[styles.gradeBadge, { color: hueColor(sub.color) }]}>{band || '—'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gradeTitle}>{g.title}</Text>
                  <Text style={styles.gradeMeta}>
                    {sub.name} · {g.date || '—'}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.gradeScore}>
                    {g.score}
                    <Text style={styles.gradeMax}>/{g.max}</Text>
                  </Text>
                  <Text style={styles.gradePct}>{pct}%</Text>
                </View>
              </View>
              );
              })
            )}
          </View>
        ) : null}

        {tab === 'tests' ? (
          <View style={{ gap: 10 }}>
            {examsQ.isPending && !examsQ.data ? (
              <Loading />
            ) : examsQ.isError && !examsQ.data ? (
              <ErrorState onRetry={() => examsQ.refetch()} />
            ) : subjExams.length === 0 ? (
              <Empty message="No exams scheduled for this subject yet" />
            ) : (
              subjExams.map((e) => {
              const upcoming = e.status === 'upcoming';
              return (
                <View key={e.id} style={styles.examRow}>
                  <View style={styles.examTop}>
                    <Pill tone={upcoming ? 'primary' : 'present'}>{e.status}</Pill>
                    <Text style={styles.examDate}>
                      {e.date} · {e.time}
                    </Text>
                  </View>
                  <Text style={styles.examTitle}>{e.title}</Text>
                  <Text style={styles.examMeta}>
                    {sub.name} · {e.dur} · {e.max} marks
                    {!upcoming && e.score != null
                      ? ` · scored ${e.score}/${e.max} (${e.grade})`
                      : ''}
                  </Text>
                </View>
              );
              })
            )}
          </View>
        ) : null}

        {tab === 'homework' ? (
          <View style={{ gap: 10 }}>
            {homeworkQ.isPending && !homeworkQ.data ? (
              <Loading />
            ) : homeworkQ.isError && !homeworkQ.data ? (
              <ErrorState onRetry={() => homeworkQ.refetch()} />
            ) : subjHw.length === 0 ? (
              <Empty message="No homework for this subject yet" />
            ) : (
            subjHw.map((h) => (
              <HomeworkCard
                key={h.id}
                homework={h}
                onPress={() => nav.navigate('HomeworkDetail', { id: h.id, studentId })}
              />
            ))
            )}
          </View>
        ) : null}

        {tab === 'attendance' ? (
          <View style={{ gap: 10 }}>
            <View style={styles.presetRow}>
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
            {periodQ.isPending && !periodQ.data ? (
              <Loading />
            ) : periodQ.isError && !periodQ.data ? (
              <ErrorState onRetry={() => periodQ.refetch()} />
            ) : subjPeriods.length === 0 ? (
              <Empty message="No period attendance for this subject in this range" />
            ) : (
              <>
                {attendancePreset === 'month' ? (
                  <Card style={{ padding: 16 }}>
                    <MonthAttendanceGrid month={new Date()} periods={subjPeriods} />
                  </Card>
                ) : null}
                {subjPeriods.map((p) => {
                  const markedBy = formatMarkedByRole(p.markedByRole);
                  return (
                    <View key={p.id} style={styles.attnRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.gradeTitle}>{dayLabelFor(p.date)}</Text>
                        <Text style={styles.gradeMeta}>
                          Period {p.period}
                          {sub.teacher ? ` · ${sub.teacher}` : ''}
                          {markedBy ? ` · Marked by ${markedBy}` : ''}
                        </Text>
                      </View>
                      <Pill tone={attendanceTone(p.status)}>{p.status}</Pill>
                    </View>
                  );
                })}
              </>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function attendanceTone(status: string): 'present' | 'absent' | 'late' | 'neutral' {
  const s = status.trim().toLowerCase();
  if (s === 'present' || s === 'p') return 'present';
  if (s === 'absent' || s === 'a') return 'absent';
  if (s === 'late' || s === 'l') return 'late';
  return 'neutral';
}

function resolveSubject(
  id: string,
  fetched: Subject | undefined,
  catalog: Subject[],
): Subject | null {
  if (fetched) return fetched;
  const byId = catalog.find((s) => s.id === id);
  if (byId) return byId;
  const raw = id.replace(/^(name|title|tt):/i, '').trim();
  const want = normalizeSubjectName(raw || id);
  const byName = catalog.find(
    (s) => normalizeSubjectName(s.name) === want || s.id === raw,
  );
  if (byName) return byName;
  if (!raw) return null;
  return {
    id,
    name: raw,
    short: subjectShortCode(raw),
    teacher: '',
    avg: 0,
    trend: 0,
    color: hueForName(raw),
  };
}

function overlayExamScore(exam: Exam, grades: Grade[]): Exam {
  if (exam.score != null) return exam;
  const title = exam.title.trim().toLowerCase();
  const g = grades.find((row) => row.title.trim().toLowerCase() === title);
  if (!g) return exam;
  return {
    ...exam,
    score: g.score,
    grade: g.grade || exam.grade,
    max: g.max || exam.max,
    status: 'graded',
  };
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View
      style={[
        styles.stat,
        divider && {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function MonthAttendanceGrid({ month, periods }: { month: Date; periods: { date: string; status: string }[] }) {
  const year = month.getFullYear();
  const mo = month.getMonth();
  const firstDay = new Date(year, mo, 1);
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const byDate = new Map(periods.map((p) => [p.date, p.status]));

  const cells: Array<{ day: number; date: string } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const date = `${year}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      return { day, date };
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <View>
      <View style={styles.gridWeekRow}>
        {WEEKDAY_LONG.map((w) => (
          <Text key={w} style={styles.gridWeekLabel}>
            {w[0]}
          </Text>
        ))}
      </View>
      <View style={styles.gridWrap}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={i} style={styles.gridCell} />;
          const status = byDate.get(cell.date);
          const tone = status ? attendanceTone(status) : 'neutral';
          const toneColors = gridToneColors(tone);
          return (
            <View
              key={i}
              style={[styles.gridCell, styles.gridCellFilled, { backgroundColor: toneColors.soft }]}
            >
              <Text style={[styles.gridCellDay, { color: toneColors.base }]}>{cell.day}</Text>
            </View>
          );
        })}
      </View>
      <View style={styles.gridLegend}>
        <LegendDot tone="present" label="Present" />
        <LegendDot tone="late" label="Late" />
        <LegendDot tone="absent" label="Absent" />
      </View>
    </View>
  );
}

function gridToneColors(tone: 'present' | 'absent' | 'late' | 'neutral'): { base: string; soft: string } {
  if (tone === 'present') return { base: colors.present, soft: colors.presentSoft };
  if (tone === 'absent') return { base: colors.absent, soft: colors.absentSoft };
  if (tone === 'late') return { base: colors.late, soft: colors.lateSoft };
  return { base: colors.inkMuted, soft: colors.ruleSoft };
}

function LegendDot({ tone, label }: { tone: 'present' | 'absent' | 'late'; label: string }) {
  const toneColors = gridToneColors(tone);
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: toneColors.base }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function SparkBars({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  return (
    <View style={styles.sparkRow}>
      {values.map((v, i) => (
        <View
          key={i}
          style={[
            styles.sparkBar,
            {
              height: Math.max(8, (v / max) * 60),
              backgroundColor: i === values.length - 1 ? colors.primary : colors.primarySoft2,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  hero: { flexDirection: 'row', padding: 18, borderRadius: radius.lg },
  stat: { flex: 1, paddingHorizontal: 8 },
  statLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.white,
    marginTop: 4,
  },
  sparkRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 6,
    height: 64,
  },
  sparkBar: { flex: 1, borderRadius: 4 },
  sparkLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sparkLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.inkMuted,
  },
  teacher: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  teacherName: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  teacherMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  gradeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.ruleSoft,
  },
  presetChipActive: { backgroundColor: colors.ink },
  presetLabel: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  presetLabelActive: { color: colors.paper },
  gridWeekRow: { flexDirection: 'row', marginBottom: 6 },
  gridWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellFilled: { borderRadius: radius.md },
  gridCellDay: { fontFamily: fontFamily.bold, fontSize: 13 },
  gridLegend: { flexDirection: 'row', gap: 16, marginTop: 12, justifyContent: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: colors.inkMuted },
  attnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  gradeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeBadge: { fontFamily: fontFamily.extraBold, fontSize: 16 },
  gradeTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  gradeMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  gradeScore: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  gradeMax: { fontSize: 12, color: colors.inkMuted },
  gradePct: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.inkMuted },
  examRow: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  examTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  examDate: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  examTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.ink,
    marginTop: 8,
  },
  examMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
