import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  ErrorState,
  IconButton,
  Loading,
  Pill,
  SchoolBadge,
  ScreenHeader,
  TabBar,
  type PillTone,
} from '@/components/ui';
import { useHomework } from '@/hooks/useHomework';
import { useSubjects } from '@/hooks/useSubjects';
import { colors, fontFamily, hueColor, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Tab = 'todo' | 'done' | 'all';
type Nav = NativeStackNavigationProp<RootStackParamList>;

export function HomeworkListScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('todo');

  const homeworkQ = useHomework();
  const subjectsQ = useSubjects();

  const isLoading = homeworkQ.isLoading || subjectsQ.isLoading;
  const isError = homeworkQ.isError || subjectsQ.isError;
  const onRefresh = () => {
    homeworkQ.refetch();
    subjectsQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          kicker="Term 4 · Apr–Jun"
          title="Homework"
          right={<IconButton icon="filter" />}
        />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          kicker="Term 4 · Apr–Jun"
          title="Homework"
          right={<IconButton icon="filter" />}
        />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const data = homeworkQ.data!;
  const subjects = subjectsQ.data!;
  const subjectById = (id: string) => subjects.find((s) => s.id === id) ?? subjects[0];

  const filtered = data.filter((h) => {
    if (tab === 'all') return true;
    if (tab === 'done') return h.status === 'submitted' || h.status === 'graded';
    return h.status === 'todo' || h.status === 'progress';
  });

  const counts = {
    todo: data.filter((h) => h.status === 'todo' || h.status === 'progress').length,
    done: data.filter((h) => h.status === 'submitted' || h.status === 'graded').length,
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <SchoolBadge />
      </View>
      <ScreenHeader
        kicker="Term 4 · Apr–Jun"
        title="Homework"
        right={<IconButton icon="filter" />}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={homeworkQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryRow}>
          <SummaryCard label="To do" value={String(counts.todo)} hue="absent" />
          <SummaryCard label="Done" value={String(counts.done)} hue="present" />
          <SummaryCard label="Avg score" value="A−" hue="primary" />
        </View>

        <View style={{ marginVertical: 14 }}>
          <TabBar<Tab>
            tabs={[
              { key: 'todo', label: 'To do' },
              { key: 'done', label: 'Submitted' },
              { key: 'all', label: 'All' },
            ]}
            value={tab}
            onChange={setTab}
          />
        </View>

        <View style={{ gap: 10 }}>
          {filtered.map((h) => {
            const sub = subjectById(h.subjId);
            const tone: PillTone =
              h.status === 'graded'
                ? 'present'
                : h.status === 'submitted'
                  ? 'teal'
                  : h.priority === 'high'
                    ? 'absent'
                    : h.priority === 'med'
                      ? 'late'
                      : 'neutral';
            const pillLabel =
              h.status === 'graded'
                ? `Graded · ${h.grade ?? ''}`
                : h.status === 'submitted'
                  ? 'Submitted'
                  : `Due ${h.due}`;
            return (
              <Pressable
                key={h.id}
                onPress={() => nav.navigate('HomeworkDetail', { id: h.id })}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.85 }]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View
                      style={[styles.subjPill, { backgroundColor: hueColor(sub.color, 'tint') }]}
                    >
                      <Text style={[styles.subjPillTxt, { color: hueColor(sub.color) }]}>
                        {sub.name}
                      </Text>
                    </View>
                    {h.priority === 'high' && h.status === 'todo' ? (
                      <Text style={styles.high}>● HIGH</Text>
                    ) : null}
                  </View>
                  <Pill tone={tone}>{pillLabel}</Pill>
                </View>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {h.title}
                </Text>
                <Text style={styles.cardMeta}>{h.dueT}</Text>
                {h.status === 'progress' ? (
                  <View style={styles.progressBg}>
                    <View style={styles.progressFill} />
                  </View>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({
  label,
  value,
  hue,
}: {
  label: string;
  value: string;
  hue: 'absent' | 'present' | 'primary';
}) {
  const map = {
    absent: { bg: colors.absentSoft, fg: colors.absent },
    present: { bg: colors.presentSoft, fg: colors.present },
    primary: { bg: colors.primarySoft, fg: colors.primary },
  }[hue];
  return (
    <View style={[styles.summary, { backgroundColor: map.bg }]}>
      <Text style={[styles.summaryVal, { color: map.fg }]}>{value}</Text>
      <Text style={[styles.summaryLabel, { color: map.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: { paddingHorizontal: spacing.l, paddingTop: spacing.m, gap: spacing.s },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summary: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  summaryVal: { fontFamily: fontFamily.extraBold, fontSize: 24, letterSpacing: -0.4 },
  summaryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  card: {
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.lg,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  subjPill: { paddingVertical: 3, paddingHorizontal: 10, borderRadius: 100 },
  subjPillTxt: { fontFamily: fontFamily.extraBold, fontSize: 11 },
  high: { fontFamily: fontFamily.extraBold, fontSize: 10, color: colors.absent },
  cardTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 14.5,
    color: colors.ink,
    marginTop: 10,
    letterSpacing: -0.1,
  },
  cardMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 4,
  },
  progressBg: {
    marginTop: 10,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ruleSoft,
    overflow: 'hidden',
  },
  progressFill: { width: '60%', height: '100%', backgroundColor: colors.primary },
});
