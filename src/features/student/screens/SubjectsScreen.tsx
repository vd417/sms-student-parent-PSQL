import { useCallback, useState } from 'react';
import { ScrollView, RefreshControl, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Empty,
  ErrorState,
  IconButton,
  Loading,
  ScreenHeader,
  SearchField,
} from '@/components/ui';
import { SubjectCard } from '@/components/cards/SubjectCard';
import { useStudentProfile } from '@/hooks/useStudent';
import { useSubjects } from '@/hooks/useSubjects';
import { colors, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function SubjectsScreen() {
  const nav = useNavigation<Nav>();
  const subjectsQ = useSubjects();
  const profileQ = useStudentProfile();
  const classLabel = profileQ.data?.classroom || profileQ.data?.grade || '';
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');

  useFocusEffect(
    useCallback(() => {
      void subjectsQ.refetch();
    }, [subjectsQ.refetch]),
  );

  if (subjectsQ.isLoading && subjectsQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader
          kicker={classLabel || undefined}
          title="My subjects"
          right={
            <IconButton
              icon={searchOpen ? 'close' : 'search'}
              onPress={() => {
                setSearchOpen((v) => !v);
                setQuery('');
              }}
            />
          }
        />
        <Loading />
      </SafeAreaView>
    );
  }
  if (subjectsQ.isError && subjectsQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker={classLabel || undefined} title="My subjects" />
        <ErrorState onRetry={() => subjectsQ.refetch()} />
      </SafeAreaView>
    );
  }

  const q = query.trim().toLowerCase();
  const subjects = subjectsQ.data!.filter(
    (s) =>
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.teacher ?? '').toLowerCase().includes(q),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={classLabel || undefined}
        title="My subjects"
        right={
          <IconButton
            icon={searchOpen ? 'close' : 'search'}
            onPress={() => {
              setSearchOpen((v) => !v);
              setQuery('');
            }}
          />
        }
      />
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

        {searchOpen ? (
          <View style={{ paddingBottom: 14 }}>
            <SearchField
              placeholder="Search subjects or teachers"
              value={query}
              onChangeText={setQuery}
            />
          </View>
        ) : null}

        {subjects.length === 0 ? (
          <Empty
            message={
              !q
                ? 'No subjects assigned to your class yet'
                : `No subjects match “${query}”`
            }
          />
        ) : (
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
        )}
      </ScrollView>
    </SafeAreaView>
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
});
