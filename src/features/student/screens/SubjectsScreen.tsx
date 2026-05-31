import { ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorState, IconButton, Loading, SchoolBadge, SectionHeader } from '@/components/ui';
import { SubjectCard } from '@/components/cards/SubjectCard';
import { useSubjects } from '@/hooks/useSubjects';
import { colors, fontFamily, hueColor, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SubjectsScreen() {
  const nav = useNavigation<Nav>();
  const subjectsQ = useSubjects();

  if (subjectsQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }
  if (subjectsQ.isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState onRetry={() => subjectsQ.refetch()} />
      </SafeAreaView>
    );
  }

  const subjects = subjectsQ.data!;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={subjectsQ.isRefetching}
            onRefresh={() => subjectsQ.refetch()}
          />
        }
      >
        <View style={styles.headerRow}>
          <SchoolBadge />
          <Text style={typography.h1}>My subjects</Text>
          <IconButton icon="search" />
        </View>

        <View style={styles.grid}>
          {subjects.map((s, i) => (
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

        <View style={{ marginTop: 24 }}>
          <SectionHeader title="Clubs & cohorts" />
          <View style={{ gap: 10, marginTop: 12 }}>
            <CohortMini
              icon="trophy"
              title="Math Olympiad squad"
              sub="Wed 4 PM · 12 members"
              hue="amber"
            />
            <CohortMini
              icon="people"
              title="Indus House"
              sub="35 members · Senior wing"
              hue="primary"
            />
            <CohortMini
              icon="book"
              title="Reading Circle"
              sub="Monday lunch · 8 members"
              hue="teal"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function CohortMini({
  icon,
  title,
  sub,
  hue,
}: {
  icon: 'trophy' | 'people' | 'book';
  title: string;
  sub: string;
  hue: 'amber' | 'primary' | 'teal';
}) {
  const bg = hue === 'primary' ? colors.primarySoft : hueColor(hue, 'soft');
  const fg = hue === 'primary' ? colors.primary : hueColor(hue);
  return (
    <View style={styles.cohort}>
      <View style={[styles.cohortIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={18} color={fg} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cohortTitle}>{title}</Text>
        <Text style={styles.cohortSub}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
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
    paddingVertical: 8,
    gap: spacing.s,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 14,
    marginHorizontal: -6,
  },
  gridCell: { width: '50%', paddingVertical: 6 },
  cohort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  cohortIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cohortTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  cohortSub: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
