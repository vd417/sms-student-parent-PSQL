import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  IconButton,
  Loading,
  Pill,
  ScreenHeader,
} from '@/components/ui';
import { usePTM, useSetPTMStatus } from '@/hooks/usePTM';
import { useChildren } from '@/hooks/useParent';
import { colors, fontFamily, radius } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

export function ParentPTMScreen() {
  const nav = useNavigation<Nav>();
  const ptmQ = usePTM();
  const childrenQ = useChildren();
  const setStatus = useSetPTMStatus();

  const isLoading = ptmQ.isLoading || childrenQ.isLoading;
  const isError = ptmQ.isError || childrenQ.isError;
  const onRefresh = () => {
    ptmQ.refetch();
    childrenQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Parent–Teacher Meet" title="Meetings" onBack={() => nav.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Parent–Teacher Meet" title="Meetings" onBack={() => nav.goBack()} />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const meetings = ptmQ.data!;
  const children = childrenQ.data!;
  const kidName = (id: string) => children.find((c) => c.id === id)?.name ?? 'your child';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="Parent–Teacher Meet"
        title="Meetings"
        onBack={() => nav.goBack()}
        right={<IconButton icon="add" />}
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={ptmQ.isRefetching} onRefresh={onRefresh} />}
      >
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Card style={styles.banner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="calendar" size={20} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Term-end PTM open</Text>
              <Text style={styles.bannerMeta}>Book 15-min slots · May 3–7</Text>
            </View>
            <Button size="md" variant="primary">
              Book slot
            </Button>
          </Card>
        </View>

        <Text style={[styles.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Scheduled meetings
        </Text>
        {meetings.length === 0 ? (
          <Empty message="No meetings scheduled." />
        ) : (
          <View style={{ paddingHorizontal: 18, gap: 10 }}>
            {meetings.map((m) => (
              <View key={m.id} style={styles.card}>
                <View style={styles.cardTop}>
                  <Pill tone={m.status === 'confirmed' ? 'present' : 'late'}>{m.status}</Pill>
                  <Text style={styles.cardDate}>
                    {m.date} · {m.time}
                  </Text>
                </View>
                <Text style={styles.cardTeacher}>{m.teacher}</Text>
                <Text style={styles.cardSubj}>
                  {m.subj} · for {kidName(m.child)}
                </Text>
                <View style={styles.mode}>
                  <Ionicons
                    name={m.mode.startsWith('Video') ? 'videocam' : 'location'}
                    size={12}
                    color={colors.ink2}
                  />
                  <Text style={styles.modeTxt}>{m.mode}</Text>
                </View>
                <View style={styles.actions}>
                  {m.status === 'pending' ? (
                    <Button
                      size="md"
                      variant="primary"
                      loading={setStatus.isPending}
                      onPress={() => setStatus.mutate({ id: m.id, status: 'confirmed' })}
                    >
                      Confirm
                    </Button>
                  ) : (
                    <Button size="md" variant="primary">
                      Join / directions
                    </Button>
                  )}
                  <Button
                    size="md"
                    variant="ghost"
                    onPress={() => setStatus.mutate({ id: m.id, status: 'pending' })}
                  >
                    Reschedule
                  </Button>
                </View>
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
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  bannerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bannerTitle: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.primary },
  bannerMeta: { fontFamily: fontFamily.medium, fontSize: 11.5, color: colors.ink2, marginTop: 2 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  card: {
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.lg,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardDate: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.inkMuted },
  cardTeacher: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    color: colors.ink,
    marginTop: 8,
    letterSpacing: -0.1,
  },
  cardSubj: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 2 },
  mode: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: colors.paper2,
  },
  modeTxt: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: colors.ink2 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
});
