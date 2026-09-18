import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Empty, ErrorState, Loading, Pill, ScreenHeader } from '@/components/ui';
import { useNoticeList } from '@/hooks/useAnnouncements';
import { goToNotice, noticeKind } from '@/lib/noticeRoute';
import { colors, fontFamily } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

export function ParentAnnouncementsScreen() {
  const { annQ, clear, unreadCount } = useNoticeList('parent');
  const nav = useNavigation<Nav>();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="From the school"
        title="Notices"
        right={
          unreadCount > 0 ? (
            <Pressable
              onPress={() => clear.mutate()}
              disabled={clear.isPending}
              hitSlop={8}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={styles.clear}>{clear.isPending ? 'Clearing…' : 'Clear all'}</Text>
            </Pressable>
          ) : null
        }
      />
      {annQ.isLoading ? (
        <Loading />
      ) : annQ.isError ? (
        <ErrorState onRetry={() => annQ.refetch()} />
      ) : annQ.data!.length === 0 ? (
        <Empty message="No notices yet." />
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24, gap: 10 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={annQ.isRefetching} onRefresh={() => annQ.refetch()} />
          }
        >
          {annQ.data!.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => goToNotice(nav, noticeKind(n), 'parent')}
              style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
            >
              <Card style={{ padding: 14, borderColor: n.unread ? colors.absent : colors.rule }}>
                <View style={styles.top}>
                  <Pill tone={n.unread ? 'absent' : 'neutral'}>{n.role}</Pill>
                  <Text style={[styles.when, n.unread && styles.unreadMeta]}>{n.when}</Text>
                </View>
                <Text style={[styles.title, n.unread && styles.unreadTitle]}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.from}>— {n.from}</Text>
              </Card>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  clear: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.primary },
  top: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  when: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.inkMuted },
  title: { fontFamily: fontFamily.extraBold, fontSize: 15, color: colors.ink, letterSpacing: -0.2 },
  unreadTitle: { color: colors.absent },
  unreadMeta: { color: colors.absent },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 19,
    marginTop: 6,
  },
  from: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.inkMuted, marginTop: 10 },
});
