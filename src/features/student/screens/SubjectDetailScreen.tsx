import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Avatar,
  Card,
  ErrorState,
  IconButton,
  Loading,
  Pill,
  ScreenHeader,
  TabBar,
} from '@/components/ui';
import { HomeworkCard } from '@/components/cards/HomeworkCard';
import { useSubjects } from '@/hooks/useSubjects';
import { useGrades, useExams } from '@/hooks/useGrades';
import { useHomework } from '@/hooks/useHomework';
import { colors, fontFamily, hueColor, hueForName, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Tab = 'overview' | 'grades' | 'tests' | 'homework';
type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, 'SubjectDetail'>;

export function SubjectDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const [tab, setTab] = useState<Tab>('overview');

  const subjectsQ = useSubjects();
  const gradesQ = useGrades();
  const examsQ = useExams();
  const homeworkQ = useHomework();

  const isLoading =
    subjectsQ.isLoading || gradesQ.isLoading || examsQ.isLoading || homeworkQ.isLoading;
  const isError = subjectsQ.isError || gradesQ.isError || examsQ.isError || homeworkQ.isError;
  const onRefresh = () => {
    subjectsQ.refetch();
    gradesQ.refetch();
    examsQ.refetch();
    homeworkQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Subject" onBack={() => nav.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Subject" onBack={() => nav.goBack()} />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const subjects = subjectsQ.data!;
  const sub = subjects.find((s) => s.id === route.params.id) ?? subjects[0];
  const subjGrades = gradesQ.data!.filter((g) => g.subjId === sub.id);
  const subjExams = examsQ.data!.filter((e) => e.subjId === sub.id);
  const subjHw = homeworkQ.data!.filter((h) => h.subjId === sub.id);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader kicker={sub.teacher} title={sub.name} onBack={() => nav.goBack()} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { backgroundColor: hueColor(sub.color) }]}>
          <Stat label="Average" value={`${sub.avg}%`} />
          <Stat
            label="Grade"
            divider
            value={sub.avg >= 90 ? 'A+' : sub.avg >= 85 ? 'A' : sub.avg >= 80 ? 'A−' : 'B+'}
          />
          <Stat label="Trend" value={sub.trend > 0 ? `+${sub.trend}%` : `${sub.trend}%`} />
        </View>

        <View style={{ marginVertical: 14 }}>
          <TabBar<Tab>
            tabs={[
              { key: 'overview', label: 'Overview' },
              { key: 'grades', label: 'Grades' },
              { key: 'tests', label: 'Tests' },
              { key: 'homework', label: 'Homework' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        {tab === 'overview' ? (
          <View style={{ gap: 18 }}>
            <Card style={{ padding: 16 }}>
              <Text style={[typography.eyebrow, { marginBottom: 10 }]}>Last 8 assessments</Text>
              <SparkBars values={[78, 82, 88, 84, 91, 85, 90, sub.avg]} />
              <View style={styles.sparkLabels}>
                {['Jan', 'Feb', 'Mar', 'Apr'].map((m) => (
                  <Text key={m} style={styles.sparkLabel}>
                    {m}
                  </Text>
                ))}
              </View>
            </Card>

            <View>
              <Text style={[typography.eyebrow, { marginBottom: 8 }]}>Teacher</Text>
              <Card style={styles.teacher}>
                <Avatar
                  initials={sub.teacher
                    .split(' ')
                    .map((w) => w[0])
                    .join('')
                    .slice(0, 2)}
                  size={44}
                  hue={hueForName(sub.teacher)}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.teacherName}>{sub.teacher}</Text>
                  <Text style={styles.teacherMeta}>{sub.name} · Office hours: Tue & Thu, 4 PM</Text>
                </View>
                <IconButton
                  icon="chatbubble-outline"
                  onPress={() => nav.navigate('ChatThread', { id: sub.id })}
                />
              </Card>
            </View>
          </View>
        ) : null}

        {tab === 'grades' ? (
          <View style={{ gap: 8 }}>
            {subjGrades.map((g) => (
              <View key={g.id} style={styles.gradeRow}>
                <View style={[styles.gradeIcon, { backgroundColor: hueColor(sub.color, 'tint') }]}>
                  <Text style={[styles.gradeBadge, { color: hueColor(sub.color) }]}>{g.grade}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.gradeTitle}>{g.title}</Text>
                  <Text style={styles.gradeMeta}>
                    {sub.name} · {g.date}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.gradeScore}>
                    {g.score}
                    <Text style={styles.gradeMax}>/{g.max}</Text>
                  </Text>
                  <Text style={styles.gradePct}>{Math.round((g.score / g.max) * 100)}%</Text>
                </View>
              </View>
            ))}
          </View>
        ) : null}

        {tab === 'tests' ? (
          <View style={{ gap: 10 }}>
            {subjExams.map((e) => {
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
            })}
          </View>
        ) : null}

        {tab === 'homework' ? (
          <View style={{ gap: 10 }}>
            {subjHw.map((h) => (
              <HomeworkCard
                key={h.id}
                homework={h}
                onPress={() => nav.navigate('HomeworkDetail', { id: h.id })}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
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

function SparkBars({ values }: { values: number[] }) {
  const max = Math.max(...values);
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
