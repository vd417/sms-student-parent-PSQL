import { useCallback } from 'react';
import { ScrollView, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { Card, Empty, ErrorState, Loading, Pill, ScreenHeader } from '@/components/ui';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { qk } from '@/hooks/keys';
import { services } from '@/services';
import { colors, fontFamily, spacing } from '@/theme';

export function AnnouncementsScreen() {
  const annQ = useAnnouncements('student');
  const qc = useQueryClient();

  useFocusEffect(
    useCallback(() => {
      void services.notifications.markRead().then(() => {
        void qc.invalidateQueries({ queryKey: qk.notifications });
      });
    }, [qc]),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="From the school"
        title="Notices"
      />
      {annQ.isLoading ? (
        <Loading />
      ) : annQ.isError ? (
        <ErrorState onRetry={() => annQ.refetch()} />
      ) : annQ.data!.length === 0 ? (
        <Empty message="No notices yet." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={annQ.isRefetching} onRefresh={() => annQ.refetch()} />
          }
        >
          <View style={{ gap: 10 }}>
            {annQ.data!.map((n) => (
              <Card key={n.id} style={{ padding: 14 }}>
                <View style={styles.top}>
                  <Pill tone="primary">{n.role}</Pill>
                  <Text style={styles.when}>{n.when}</Text>
                </View>
                <Text style={styles.title}>{n.title}</Text>
                <Text style={styles.body}>{n.body}</Text>
                <Text style={styles.from}>— {n.from}</Text>
              </Card>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  when: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  title: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: colors.ink,
    letterSpacing: -0.2,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 12.5,
    color: colors.ink2,
    lineHeight: 19,
    marginTop: 6,
  },
  from: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 10,
  },
});
