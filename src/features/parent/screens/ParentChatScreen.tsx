import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Avatar, Empty, ErrorState, IconButton, Loading, SearchField } from '@/components/ui';
import { useThreads } from '@/hooks/useMessaging';
import { useChildren } from '@/hooks/useParent';
import { colors, fontFamily, hueColor, hueForName, radius, typography } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

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
  const threadsQ = useThreads('parent');
  const childrenQ = useChildren();

  const isLoading = threadsQ.isLoading || childrenQ.isLoading;
  const isError = threadsQ.isError || childrenQ.isError;
  const onRefresh = () => {
    threadsQ.refetch();
    childrenQ.refetch();
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

  const threads = threadsQ.data!;
  const children = childrenQ.data!;
  const kidFor = (id?: string | null) => (id ? children.find((c) => c.id === id) : undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Text style={typography.h1}>Inbox</Text>
        <IconButton icon="create-outline" />
      </View>
      <View style={{ paddingHorizontal: 18, paddingVertical: 14 }}>
        <SearchField placeholder="Search teachers, groups" />
      </View>

      {threads.length === 0 ? (
        <Empty message="No conversations yet." />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 8 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={threadsQ.isRefetching} onRefresh={onRefresh} />}
        >
          {threads.map((t) => {
            const kid = kidFor(t.kid);
            return (
              <Pressable
                key={t.id}
                onPress={() => nav.navigate('ChatThread', { id: t.id })}
                style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
              >
                <View>
                  <Avatar initials={initialsFor(t.name)} size={44} hue={hueForName(t.name)} />
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
                    <Text style={styles.role}>{t.role}</Text>
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
                    style={[styles.last, t.unread > 0 && { color: colors.ink, fontFamily: fontFamily.semiBold }]}
                    numberOfLines={1}
                  >
                    {t.last}
                  </Text>
                </View>
              </Pressable>
            );
          })}
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
