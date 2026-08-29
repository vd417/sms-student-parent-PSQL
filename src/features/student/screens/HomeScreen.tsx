import { useCallback } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Card,
  ErrorState,
  IconButton,
  Loading,
  Pill,
  SchoolBadge,
  SectionHeader,
} from '@/components/ui';
import { SubjectCard } from '@/components/cards/SubjectCard';
import { HomeworkCard } from '@/components/cards/HomeworkCard';
import { useStudentProfile, useToday } from '@/hooks/useStudent';
import { useHomework } from '@/hooks/useHomework';
import { useSubjects } from '@/hooks/useSubjects';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useNotifications } from '@/hooks/useNotifications';
import { useTodayAttendance } from '@/hooks/useAttendance';
import { useGrades } from '@/hooks/useGrades';
import {
  colors,
  fontFamily,
  hueColor,
  primaryGradient,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import type { DailyAttendanceStatus } from '@/models';
import type { PillTone } from '@/components/ui';
import {
  heroEyebrow,
  heroMeta,
  minutesFromMidnight,
  pickNowOrNext,
} from '@/lib/nextPeriod';
import { formatHomeAttn, formatHomeRank, formatReportOrHomeAvg } from '@/lib/homeStats';
import { buildReportFromGrades } from '@/lib/reportCardBuild';
import { gradesForSubject, normalizeSubjectName } from '@/lib/belongsToSubject';

type Nav = BottomTabNavigationProp<TabParamList, 'Home'> & {
  navigate: NativeStackNavigationProp<RootStackParamList>['navigate'];
};

export function HomeScreen() {
  const nav = useNavigation<Nav>();

  const profileQ = useStudentProfile();
  const todayQ = useToday();
  const homeworkQ = useHomework();
  const subjectsQ = useSubjects();
  const annQ = useAnnouncements('student');
  const noticesQ = useNotifications();
  const todayAttnQ = useTodayAttendance();
  const gradesQ = useGrades();

  useFocusEffect(
    useCallback(() => {
      void todayQ.refetch();
      void annQ.refetch();
    }, [todayQ.refetch, annQ.refetch]),
  );

  const isLoading = profileQ.isLoading || todayQ.isLoading;
  const isError = profileQ.isError || todayQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
    todayQ.refetch();
    homeworkQ.refetch();
    subjectsQ.refetch();
    annQ.refetch();
    todayAttnQ.refetch();
    gradesQ.refetch();
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

  const student = profileQ.data!;
  const today = todayQ.data ?? [];
  const allHomework = homeworkQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const announcements = annQ.data ?? [];
  const grades = gradesQ.data ?? [];
  const report = buildReportFromGrades(grades, subjects);
  const subjectById = (id: string) =>
    subjects.find((s) => s.id === id) ??
    subjects.find((s) => normalizeSubjectName(s.name) === normalizeSubjectName(id));

  const todoCount = allHomework.filter(
    (h) => h.status === 'todo' || h.status === 'progress',
  ).length;
  const picked = pickNowOrNext(today, minutesFromMidnight(new Date()));
  const next = picked?.block;
  const nextSub = next?.subjId
    ? subjectById(next.subjId) ??
      subjects.find((s) => normalizeSubjectName(s.name) === normalizeSubjectName(next.label))
    : subjects.find((s) => normalizeSubjectName(s.name) === normalizeSubjectName(next?.label));
  const upcoming = allHomework
    .filter((h) => h.status === 'todo' || h.status === 'progress')
    .slice(0, 2);
  const firstAnn = announcements[0];
  const firstName = (student.name ?? 'there').trim().split(/\s+/)[0] || 'there';
  const overallLabel = formatReportOrHomeAvg(report, student.overallAvg);
  const attnChip = dailyAttendanceChip(todayAttnQ.data ?? null);
  const notices = noticesQ.data ?? [];
  const hasUnreadNotice = notices.some((n) => n.unread);
  const latestUnread = notices.find((n) => n.unread);
  const onBellPress = () => {
    const tone = (latestUnread?.tone ?? '').trim().toLowerCase();
    const text = `${latestUnread?.title ?? ''} ${latestUnread?.body ?? ''}`.toLowerCase();
    if (tone === 'chat') {
      nav.navigate('Main', { screen: 'Inbox' });
    } else if (tone.includes('homework') || text.includes('homework')) {
      nav.navigate('Main', { screen: 'Homework' });
    } else {
      nav.navigate('Announcements');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />}
      >
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <SchoolBadge logoOnly />
            <View style={styles.headerText}>
              <Text style={styles.greet} numberOfLines={1}>
                Hey {firstName}
              </Text>
              <Text style={[typography.h1, styles.date]} numberOfLines={1}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
          </View>
          <IconButton icon="notifications-outline" badge={hasUnreadNotice} onPress={onBellPress} />
        </View>

        <Pressable
          onPress={() => nav.navigate('Schedule')}
          style={({ pressed }) => [styles.heroWrap, pressed && { opacity: 0.92 }]}
        >
          <LinearGradient
            colors={primaryGradient as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <View style={styles.heroTop}>
              <Text style={styles.heroEyebrow}>{heroEyebrow(picked?.phase ?? null)}</Text>
              {next ? (
                <Pill tone="primary_solid" style={styles.heroPill}>
                  {next.t}
                </Pill>
              ) : null}
            </View>
            <View style={styles.heroBody}>
              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor: nextSub ? hueColor(nextSub.color) : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <Text style={styles.heroIconTxt}>
                  {nextSub?.short?.slice(0, 2) ?? (next ? (next.label || '—').slice(0, 2) : '·')}
                </Text>
              </View>
              <View style={styles.heroCopy}>
                <Text style={styles.heroTitle} numberOfLines={1}>
                  {next?.label ?? 'No classes on the timetable today'}
                </Text>
                <Text style={styles.heroMeta} numberOfLines={1}>
                  {next
                    ? heroMeta(next) || 'On today’s timetable'
                    : 'Open timetable to see the week'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.white} />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.statsRow}>
          <StatTile label="Average" value={overallLabel} hue="pink" />
          <Pressable style={{ flex: 1, minWidth: 0 }} onPress={() => nav.navigate('Attendance')}>
            <StatTile
              label="Attendance"
              value={formatHomeAttn(student.attnPct)}
              hue="teal"
              chip={attnChip}
            />
          </Pressable>
          <StatTile
            label="Rank"
            value={formatHomeRank(student.rank, student.rankOf)}
            hue="amber"
          />
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionHeader
            title="Homework"
            action={{
              label: `${todoCount} due`,
              onPress: () => nav.navigate('Homework'),
            }}
          />
          <View style={{ gap: 10, marginTop: 12 }}>
            {upcoming.length === 0 ? (
              <Text style={styles.annBody}>No homework due right now.</Text>
            ) : (
              upcoming.map((h) => (
                <HomeworkCard
                  key={h.id}
                  homework={h}
                  onPress={() => nav.navigate('HomeworkDetail', { id: h.id })}
                />
              ))
            )}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionHeader
            title="My subjects"
            action={{ label: 'See all', onPress: () => nav.navigate('Subjects') }}
          />
          <View style={styles.grid}>
            {subjects.slice(0, 4).map((s, i) => (
              <View
                key={s.id}
                style={[styles.gridCell, i % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}
              >
                <SubjectCard
                  subject={{
                    ...s,
                    avg: (() => {
                      const slice = buildReportFromGrades(
                        gradesForSubject(grades, s, subjects),
                        [s, ...subjects],
                      );
                      return slice.rows.length ? Math.round(slice.pct) : 0;
                    })(),
                    trend: 0,
                  }}
                  onPress={() => nav.navigate('SubjectDetail', { id: s.id })}
                />
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionHeader
            title="From school"
            action={{ label: 'See all', onPress: () => nav.navigate('Announcements') }}
          />
          {firstAnn ? (
            <Card style={{ padding: 14, marginTop: 12 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.annIcon}>
                  <Ionicons name="megaphone" size={16} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.annTitle}>{firstAnn.title}</Text>
                  <Text style={styles.annBody}>{firstAnn.body}</Text>
                  <Text style={styles.annMeta}>
                    {firstAnn.from} · {firstAnn.when}
                  </Text>
                </View>
              </View>
            </Card>
          ) : (
            <Text style={[styles.annBody, { marginTop: 12 }]}>No announcements yet.</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  label,
  value,
  hue,
  chip,
}: {
  label: string;
  value: string;
  hue: 'pink' | 'teal' | 'amber';
  chip?: { label: string; tone: PillTone } | null;
}) {
  const fg = hueColor(hue);
  return (
    <View style={[styles.tile, { backgroundColor: hueColor(hue, 'tint') }]}>
      <Text style={[styles.tileVal, { color: fg }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.tileLabel} numberOfLines={1}>
        {label}
      </Text>
      {chip ? (
        <Pill tone={chip.tone} style={styles.dailyAttendanceChip}>
          {chip.label}
        </Pill>
      ) : null}
    </View>
  );
}

function dailyAttendanceChip(status: DailyAttendanceStatus): { label: string; tone: PillTone } | null {
  if (status === 'present') return { label: 'Present', tone: 'present' };
  if (status === 'absent') return { label: 'Absent', tone: 'absent' };
  if (status === 'late') return { label: 'Late', tone: 'late' };
  if (status === 'leave') return { label: 'Leave', tone: 'primary' };
  return null;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
    paddingVertical: 14,
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
    minWidth: 0,
  },
  headerText: { flex: 1, minWidth: 0 },
  greet: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  date: { marginTop: 2 },
  heroWrap: { borderRadius: radius.lg, overflow: 'hidden' },
  hero: { padding: 16 },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
  },
  heroPill: { backgroundColor: 'rgba(255,255,255,0.22)' },
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12 },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  heroIconTxt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.white,
    letterSpacing: -0.4,
  },
  heroCopy: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.white,
    letterSpacing: -0.2,
  },
  heroMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  statsRow: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'stretch' },
  tile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: radius.lg,
  },
  tileVal: { fontFamily: fontFamily.extraBold, fontSize: 18, letterSpacing: -0.4 },
  dailyAttendanceChip: { marginTop: 8, paddingHorizontal: 6, alignSelf: 'flex-start' },
  tileLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.ink3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginHorizontal: -6,
  },
  gridCell: { width: '50%', paddingVertical: 6 },
  annIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  annBody: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    lineHeight: 17,
    marginTop: 4,
  },
  annMeta: {
    fontFamily: fontFamily.bold,
    fontSize: 10.5,
    color: colors.inkMuted,
    marginTop: 6,
  },
});
