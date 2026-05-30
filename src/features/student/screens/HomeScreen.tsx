import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { Card, ErrorState, IconButton, Loading, Pill, SectionHeader } from '@/components/ui';
import { SubjectCard } from '@/components/cards/SubjectCard';
import { HomeworkCard } from '@/components/cards/HomeworkCard';
import { useStudentProfile, useToday } from '@/hooks/useStudent';
import { useHomework } from '@/hooks/useHomework';
import { useSubjects } from '@/hooks/useSubjects';
import { useAnnouncements } from '@/hooks/useAnnouncements';
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

  const isLoading =
    profileQ.isLoading || todayQ.isLoading || homeworkQ.isLoading || subjectsQ.isLoading || annQ.isLoading;
  const isError =
    profileQ.isError || todayQ.isError || homeworkQ.isError || subjectsQ.isError || annQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
    todayQ.refetch();
    homeworkQ.refetch();
    subjectsQ.refetch();
    annQ.refetch();
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
  const today = todayQ.data!;
  const allHomework = homeworkQ.data!;
  const subjects = subjectsQ.data!;
  const announcements = annQ.data!;
  const subjectById = (id: string) => subjects.find((s) => s.id === id) ?? subjects[0];

  const todoCount = allHomework.filter(
    (h) => h.status === 'todo' || h.status === 'progress',
  ).length;
  const next = today.find((x) => x.kind === 'class') ?? today[0];
  const nextSub = next.subjId ? subjectById(next.subjId) : null;
  const upcoming = allHomework
    .filter((h) => h.status === 'todo' || h.status === 'progress')
    .slice(0, 2);
  const firstAnn = announcements[0];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greet}>Hey {student.name.split(' ')[0]} 👋</Text>
            <Text style={[typography.h1, styles.date]}>Friday, Apr 25</Text>
          </View>
          <IconButton icon="notifications-outline" badge />
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
              <Text style={styles.heroEyebrow}>UP NEXT</Text>
              <Pill tone="primary_solid" style={styles.heroPill}>
                in 12 min
              </Pill>
            </View>
            <View style={styles.heroBody}>
              <View
                style={[
                  styles.heroIcon,
                  {
                    backgroundColor: nextSub
                      ? hueColor(nextSub.color)
                      : 'rgba(255,255,255,0.2)',
                  },
                ]}
              >
                <Text style={styles.heroIconTxt}>
                  {nextSub ? nextSub.short.slice(0, 2) : 'AS'}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroTitle}>{next.label}</Text>
                <Text style={styles.heroMeta}>
                  {next.t} · {next.room ?? '—'}
                  {next.teacher ? ` · ${next.teacher}` : ''}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.white} />
            </View>
          </LinearGradient>
        </Pressable>

        <View style={styles.statsRow}>
          <StatTile label="Average" value={`${student.overallAvg}%`} hue="pink" trend="+2" />
          <StatTile label="Attendance" value={`${student.attnPct}%`} hue="teal" trend="+1" />
          <StatTile
            label="Class rank"
            value={`${student.rank}/${student.rankOf}`}
            hue="amber"
            trend="↑"
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
          <View style={styles.grid}>
            {subjects.slice(0, 4).map((s, i) => (
              <View key={s.id} style={[styles.gridCell, i % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}>
                <SubjectCard
                  subject={s}
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
}: {
  label: string;
  value: string;
  hue: 'pink' | 'teal' | 'amber';
  trend: string;
}) {
  const fg = hueColor(hue);
  return (
    <View style={[styles.tile, { backgroundColor: hueColor(hue, 'tint') }]}>
      <Text style={[styles.tileVal, { color: fg }]}>{value}</Text>
      <View style={styles.tileBottom}>
        <Text style={styles.tileLabel}>{label}</Text>
        <Text style={[styles.tileTrend, { color: fg }]}>{trend}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
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
