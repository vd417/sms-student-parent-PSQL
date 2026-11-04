import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Empty, ErrorState, Loading, ScreenHeader, SearchField } from '@/components/ui';
import { useMappedTeachers } from '@/hooks/useMappedTeachers';
import { useOpenThread, useThreads } from '@/hooks/useMessaging';
import { messageRoleLine, samePerson, teacherCardLine, teacherRoleLine } from '@/lib/classTeachers';
import { isBlockingError, isInitialLoad } from '@/lib/queryStatus';
import { useToast } from '@/providers/ToastProvider';
import { colors, fontFamily, hueForName, radius, spacing } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';
import type { Teacher } from '@/models';

type Nav = NativeStackNavigationProp<RootStackParamList>;

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function InboxScreen() {
  const nav = useNavigation<Nav>();
  const inboxFocused = useIsFocused();
  const [query, setQuery] = useState('');
  const threadsQ = useThreads('student', inboxFocused);
  const { teachers: mappedTeachers, teachersQ, identity } = useMappedTeachers();
  const openThread = useOpenThread('student');
  const toast = useToast();

  const isLoading = isInitialLoad(threadsQ);
  const isError = isBlockingError(threadsQ);
  const onRefresh = () => {
    threadsQ.refetch();
    teachersQ.refetch();
  };

  const openTeacher = (t: Teacher) => {
    openThread.mutate(
      { name: t.name, role: teacherCardLine(t, identity) },
      {
        onSuccess: (th) => nav.navigate('ChatThread', { id: th.id, name: th.name, role: th.role }),
        onError: () => toast('Could not open conversation. Try again.'),
      },
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Inbox" showBack={false} />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Inbox" showBack={false} />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const q = query.trim().toLowerCase();
  const threads = (Array.isArray(threadsQ.data) ? threadsQ.data : []).filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q),
  );
  const directory = teachersQ.data ?? [];
  const teacherFor = (name: string) => directory.find((teacher) => samePerson(teacher.name, name));
  const teachers = mappedTeachers.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || teacherCardLine(t, identity).toLowerCase().includes(q),
  );
  const noResults = q !== '' && threads.length === 0 && teachers.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Inbox" showBack={false} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={threadsQ.isRefetching} onRefresh={onRefresh} />}
      >
        <View style={{ paddingVertical: 14 }}>
          <SearchField
            placeholder="Search conversations, teachers"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {noResults ? <Empty message={`No matches for “${query}”`} /> : null}

        {threads.length > 0 ? <Text style={styles.eyebrow}>Messages</Text> : null}
        <View style={{ gap: 8 }}>
          {threads.map((t) => (
            <Pressable
              key={t.id}
              onPress={() =>
                nav.navigate('ChatThread', {
                  id: t.id,
                  name: t.name,
                  role: messageRoleLine(t.role, teacherFor(t.name), identity),
                })
              }
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View>
                <Avatar
                  initials={initialsFor(t.name)}
                  size={44}
                  hue={hueForName(t.name)}
                  photoUri={teacherFor(t.name)?.photoUrl}
                />
                {t.unread > 0 ? (
                  <View style={styles.badge}>
                    <Text style={styles.badgeTxt}>{t.unread}</Text>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <View style={styles.rowTop}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.when}>{t.when}</Text>
                </View>
                <Text style={styles.meta}>
                  {messageRoleLine(t.role, teacherFor(t.name), identity)}
                </Text>
                <Text style={[styles.last, t.unread > 0 && styles.lastUnread]} numberOfLines={1}>
                  {t.last || 'No messages yet'}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>

        <Text style={[styles.eyebrow, threads.length > 0 && { marginTop: 18 }]}>Teachers for this class</Text>
        <View style={{ gap: 8 }}>
          {teachers.length === 0 ? (
            <Empty message="No teachers are mapped to this class." />
          ) : (
            teachers.map((t) => (
              <Pressable
                key={t.id}
                onPress={() => openTeacher(t)}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <Avatar initials={t.initials} size={44} hue={hueForName(t.name)} photoUri={t.photoUrl} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{t.name}</Text>
                  <Text style={styles.meta}>{teacherRoleLine(t, identity)}</Text>
                </View>
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: colors.inkMuted,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 5,
    borderRadius: 9,
    backgroundColor: colors.coral,
    borderWidth: 2,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { fontFamily: fontFamily.extraBold, fontSize: 10, color: colors.white },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  name: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink, flex: 1 },
  when: { fontFamily: fontFamily.semiBold, fontSize: 10.5, color: colors.inkMuted },
  meta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  last: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  lastUnread: { color: colors.ink, fontFamily: fontFamily.semiBold },
});
