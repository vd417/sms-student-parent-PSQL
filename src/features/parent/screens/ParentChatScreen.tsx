import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Avatar,
  Empty,
  ErrorState,
  IconButton,
  Loading,
  ScreenHeader,
  SearchField,
} from '@/components/ui';
import { BookMeetingBanner } from '@/features/inbox/BookMeetingBanner';
import { useMappedTeachers } from '@/hooks/useMappedTeachers';
import { useOpenThread, useThreads } from '@/hooks/useMessaging';
import { samePerson, teacherCardLine, teacherRoleLine } from '@/lib/classTeachers';
import { useChildren } from '@/hooks/useParent';
import { useToast } from '@/providers/ToastProvider';
import { colors, fontFamily, hueColor, hueForName, radius, spacing } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';
import type { Teacher } from '@/models';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

function initialsFor(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function ParentChatScreen() {
  const nav = useNavigation<Nav>();
  const toast = useToast();
  const inboxFocused = useIsFocused();
  const [query, setQuery] = useState('');
  const threadsQ = useThreads('parent', inboxFocused);
  const childrenQ = useChildren();
  const { teachers: mappedTeachers, teachersQ, identity } = useMappedTeachers();
  const openThread = useOpenThread('parent');

  const isLoading =
    (threadsQ.isLoading && threadsQ.data === undefined) ||
    (childrenQ.isLoading && childrenQ.data === undefined);
  const isError =
    (threadsQ.isError && threadsQ.data === undefined) ||
    (childrenQ.isError && childrenQ.data === undefined);
  const onRefresh = () => {
    threadsQ.refetch();
    childrenQ.refetch();
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
  const threads = (threadsQ.data ?? []).filter(
    (t) => !q || t.name.toLowerCase().includes(q) || t.role.toLowerCase().includes(q),
  );
  const children = childrenQ.data ?? [];
  const kidFor = (id?: string | null) => (id ? children.find((c) => c.id === id) : undefined);

  const directory = teachersQ.data ?? [];
  const teacherFor = (name: string) => directory.find((teacher) => samePerson(teacher.name, name));
  const teachers = mappedTeachers.filter(
    (t) => !q || t.name.toLowerCase().includes(q) || teacherCardLine(t, identity).toLowerCase().includes(q),
  );
  const noResults = q !== '' && threads.length === 0 && teachers.length === 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Inbox"
        showBack={false}
        right={<IconButton icon="calendar-outline" onPress={() => nav.navigate('PTM')} />}
      />
      <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
        <SearchField placeholder="Search teachers, groups" value={query} onChangeText={setQuery} />
      </View>

      {noResults ? (
        <Empty message={`No matches for “${query}”`} />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={threadsQ.isRefetching} onRefresh={onRefresh} />
          }
        >
          {threads.length > 0 ? <Text style={styles.eyebrow}>Messages</Text> : null}
          <View style={{ gap: 8 }}>
            {threads.map((t) => {
              const kid = kidFor(t.kid);
              return (
                <Pressable
                  key={t.id}
                  onPress={() =>
                    nav.navigate('ChatThread', {
                      id: t.id,
                      name: t.name,
                      role: t.role,
                      kid: t.kid,
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
                    <View style={styles.metaRow}>
                      <Text style={styles.role}>
                        {teacherFor(t.name) ? teacherRoleLine(teacherFor(t.name) as Teacher, identity) : t.role}
                      </Text>
                      {kid ? (
                        <>
                          <Text style={styles.dotSep}>·</Text>
                          <Text style={[styles.kid, { color: hueColor(kid.hue) }]}>
                            {kid.name.split(' ')[0]}
                          </Text>
                        </>
                      ) : null}
                    </View>
                    <Text
                      style={[
                        styles.last,
                        t.unread > 0 && { color: colors.ink, fontFamily: fontFamily.semiBold },
                      ]}
                      numberOfLines={1}
                    >
                      {t.last}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>

          <View style={{ marginTop: threads.length ? 18 : 0 }}>
            <BookMeetingBanner onPress={() => nav.navigate('PTM')} />
          </View>
          <Text style={styles.eyebrow}>Teachers for this class</Text>
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
                    <Text style={styles.role}>{teacherRoleLine(t, identity)}</Text>
                  </View>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 8,
    gap: spacing.s,
  },
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
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  when: { fontFamily: fontFamily.semiBold, fontSize: 10.5, color: colors.inkMuted },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  role: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.inkMuted },
  dotSep: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.inkMuted },
  kid: { fontFamily: fontFamily.bold, fontSize: 11 },
  last: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
});
