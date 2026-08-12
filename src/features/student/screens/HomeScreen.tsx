import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Card,
  Empty,
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
import { useTodayAttendance } from '@/hooks/useAttendance';
import {
  colors,
  fontFamily,
  hueColor,
  primaryGradient,
  radius,
  spacing,
} from '@/theme';
import { useToast } from '@/providers/ToastProvider';
import { minutesUntil } from '@/services/http/mappers';
import type { RootStackParamList, TabParamList } from '@/navigation/types';
import type { DailyAttendanceStatus } from '@/models';
import type { PillTone } from '@/components/ui';

type Nav = BottomTabNavigationProp<TabParamList, 'Home'> & {
  navigate: NativeStackNavigationProp<RootStackParamList>['navigate'];
};

export function HomeScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();

  const profileQ = useStudentProfile();
  const todayQ = useToday();
  const homeworkQ = useHomework();
  const subjectsQ = useSubjects();
  const annQ = useAnnouncements('student');
  const todayAttnQ = useTodayAttendance();

  const isLoading = profileQ.isLoading;
  const isError = profileQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
    todayQ.refetch();
    homeworkQ.refetch();
    subjectsQ.refetch();
    annQ.refetch();
    todayAttnQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <SchoolBadge />
        </View>
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.topBar}>
          <SchoolBadge />
        </View>
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const student = profileQ.data!;
  const today = todayQ.data ?? [];
  const allHomework = homeworkQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const announcements = annQ.data ?? [];
  const fallbackSubject = {
    id: '',
    name: 'Subject',
    short: '—',
    teacher: '',
    avg: 0,
    trend: 0,
    color: 'blue' as const,
  };
  const subjectById = (id: string) => subjects.find((s) => s.id === id) ?? subjects[0] ?? fallbackSubject;

  const todoCount = allHomework.filter(
    (h) => h.status === 'todo' || h.status === 'progress',
  ).length;
  const firstAnn = announcements[0];
  const firstName = (student.name ?? 'there').split(' ')[0];
  const todayLabel = new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
  const nowMins = new Date().getHours() * 60 + new Date().getMinutes();
  const upcomingClass =
    today.find((x) => {
      if (x.kind !== 'class') return false;
      const m = /^(\d{1,2}):(\d{2})/.exec(x.t);
      if (!m) return true;
      return Number(m[1]) * 60 + Number(m[2]) >= nowMins;
    }) ?? today.find((x) => x.kind === 'class') ?? today[0];
  const next = upcomingClass;
  const nextSub = next?.subjId ? subjectById(next.subjId) : subjects.find((s) => s.name === next?.label) ?? null;
  const eta = next ? minutesUntil(next.t) : null;
  const etaLabel = eta == null ? (next ? next.t : 'Today') : eta <= 0 ? 'now' : `in ${eta} min`;
  const rankLabel = student.rankOf > 0 ? `${student.rank}/${student.rankOf}` : '—';
  const upcoming = allHomework
    .filter((h) => h.status === 'todo' || h.status === 'progress')
    .slice(0, 2);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.topBar}>
        <SchoolBadge />
        <IconButton icon="notifications-outline" badge onPress={() => toast('Coming soon')} />
      </View>
      <View style={styles.greetBlock}>
        <Text style={styles.hey} numberOfLines={1}>
          Hey {firstName}
          {student.classroom ? (
            <Text style={styles.heyClass}> · {student.classroom}</Text>
          ) : null}
        </Text>
        <Text style={styles.dateLine}>{todayLabel}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />}
      >

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
              <Text style={styles.heroEyebrow}>UP NEXT</Text>
              <Pill tone="primary_solid" style={styles.heroPill}>
                {etaLabel}
              </Pill>
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
                  {nextSub ? nextSub.short.slice(0, 2) : next ? next.label.slice(0, 2).toUpperCase() : '—'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{next?.label ?? 'No class scheduled'}</Text>
                <Text style={styles.heroMeta}>
                  {next ? `${next.t} · ${next.room ?? '—'}` : 'Check back later'}
                  {next?.teacher ? ` · ${next.teacher}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.statsRow}>
          <StatTile label="Average" value={`${student.overallAvg || 0}%`} hue="pink" trend="" />
          <StatTile
            label="Attendance"
            value={`${student.attnPct || 0}%`}
            hue="teal"
            trend=""
            dailyStatus={todayAttnQ.data ?? null}
          />
          <StatTile label="Class rank" value={rankLabel} hue="amber" trend="" />
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
            {upcoming.map((h) => (
              <HomeworkCard
                key={h.id}
                homework={h}
                onPress={() => nav.navigate('HomeworkDetail', { id: h.id })}
              />
            ))}
          </View>
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionHeader
            title="My subjects"
            action={{ label: 'See all', onPress: () => nav.navigate('Subjects') }}
          />
          {subjects.length === 0 ? (
            <Empty message="No subjects assigned to your class yet" />
          ) : (
            <View style={styles.grid}>
              {subjects.slice(0, 4).map((s, i) => (
                <View
                  key={s.id}
                  style={[styles.gridCell, i % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}
                >
                  <SubjectCard
                    subject={s}
                    onPress={() => nav.navigate('SubjectDetail', { id: s.id })}
                  />
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={{ marginTop: 20 }}>
          <SectionHeader
            title="From school"
            action={{ label: 'See all', onPress: () => nav.navigate('Announcements') }}
          />
          <Card style={{ padding: 14, marginTop: 12 }}>
            {firstAnn ? (
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
            ) : (
              <Text style={styles.annBody}>No notices yet.</Text>
            )}
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatTile({
  label,
  value,
  hue,
  trend,
  dailyStatus,
}: {
  label: string;
  value: string;
  hue: 'pink' | 'teal' | 'amber';
  trend: string;
  dailyStatus?: DailyAttendanceStatus;
}) {
  const fg = hueColor(hue);
  const attendanceChip = dailyStatus === undefined ? null : dailyAttendanceChip(dailyStatus);
  return (
    <View style={[styles.tile, { backgroundColor: hueColor(hue, 'tint') }]}>
      <Text style={[styles.tileVal, { color: fg }]}>{value}</Text>
      {attendanceChip ? (
        <Pill tone={attendanceChip.tone} style={styles.dailyAttendanceChip}>
          {attendanceChip.label}
        </Pill>
      ) : null}
      <View style={styles.tileBottom}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={[styles.tileTrend, { color: fg }]}>{trend}</Text>
      </View>
    </View>
  );
}

function dailyAttendanceChip(status: DailyAttendanceStatus): { label: string; tone: PillTone } {
  if (status === 'present') return { label: 'Present today', tone: 'present' };
  if (status === 'absent') return { label: 'Absent', tone: 'absent' };
  if (status === 'late') return { label: 'Late', tone: 'late' };
  if (status === 'leave') return { label: 'On leave', tone: 'primary' };
  return { label: 'Not marked', tone: 'neutral' };
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  topBar: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    paddingBottom: spacing.s,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.m,
  },
  greetBlock: {
    paddingHorizontal: spacing.l,
    paddingBottom: spacing.m,
  },
  hey: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    color: colors.ink,
    letterSpacing: -0.4,
  },
  heyClass: {
    fontFamily: fontFamily.semiBold,
    fontSize: 18,
    color: colors.inkMuted,
  },
  dateLine: {
    marginTop: 4,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.inkMuted,
  },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
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
  heroBody: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 },
  heroIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIconTxt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    color: colors.white,
    letterSpacing: -0.4,
  },
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
  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  tile: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: radius.lg,
  },
  tileVal: { fontFamily: fontFamily.extraBold, fontSize: 22, letterSpacing: -0.4 },
  dailyAttendanceChip: { marginTop: 6, paddingHorizontal: 8 },
  tileBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  tileLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.ink3,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tileTrend: { fontFamily: fontFamily.bold, fontSize: 10 },
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
