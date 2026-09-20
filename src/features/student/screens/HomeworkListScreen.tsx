import { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HomeworkCard } from '@/components/cards/HomeworkCard';
import { Empty, ErrorState, Loading, ScreenHeader, TabBar } from '@/components/ui';
import { useHomework } from '@/hooks/useHomework';
import { useSubjects } from '@/hooks/useSubjects';
import { formatDueLabel } from '@/lib/homeworkDue';
import { colors, fontFamily, radius, spacing } from '@/theme';
import type { Homework } from '@/models';
import type { RootStackParamList } from '@/navigation/types';

type Tab = 'todo' | 'done' | 'all';
type Nav = NativeStackNavigationProp<RootStackParamList>;

function isOpen(h: Homework) {
  return h.status === 'todo' || h.status === 'progress';
}

function isDone(h: Homework) {
  return h.status === 'submitted' || h.status === 'graded';
}

const EMPTY: Record<Tab, string> = {
  todo: "You're all caught up — nothing due.",
  done: 'Nothing submitted yet.',
  all: 'No homework yet.',
};

export function HomeworkListScreen() {
  const nav = useNavigation<Nav>();
  const [tab, setTab] = useState<Tab>('todo');

  const homeworkQ = useHomework();
  const subjectsQ = useSubjects();

  const isLoading = homeworkQ.isLoading && homeworkQ.data === undefined;
  const isError = homeworkQ.isError && homeworkQ.data === undefined;
  const onRefresh = () => {
    homeworkQ.refetch();
    subjectsQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Homework" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Homework" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const data = homeworkQ.data ?? [];
  const open = data.filter(isOpen);
  const done = data.filter(isDone);
  const dueToday = open.filter((h) => formatDueLabel(h.due) === 'Today').length;

  const filtered = (tab === 'all' ? data : tab === 'done' ? done : open).slice().sort((a, b) =>
    a.due.localeCompare(b.due),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={open.length ? `${open.length} to do` : 'All caught up'}
        title="Homework"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={homeworkQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.summaryRow}>
          <SummaryCard label="To do" value={String(open.length)} hue="absent" />
          <SummaryCard label="Done" value={String(done.length)} hue="present" />
          <SummaryCard label="Due today" value={String(dueToday)} hue="primary" />
        </View>

        <View style={styles.tabs}>
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

        {filtered.length === 0 ? (
          <Empty message={EMPTY[tab]} />
        ) : (
          <View style={styles.list}>
            {filtered.map((h) => (
              <HomeworkCard
                key={h.id}
                homework={h}
                onPress={() => nav.navigate('HomeworkDetail', { id: h.id })}
              />
            ))}
          </View>
        )}
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
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summary: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  summaryVal: { fontFamily: fontFamily.extraBold, fontSize: 22, letterSpacing: -0.4 },
  summaryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    marginTop: 2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  tabs: { marginVertical: 14 },
  list: { gap: 10 },
});
