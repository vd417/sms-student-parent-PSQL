import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Button,
  Card,
  ErrorState,
  IconButton,
  Loading,
  Pill,
  SectionHeader,
} from '@/components/ui';
import { KidSwitcher } from '../components/KidSwitcher';
import { useChildren, useChildToday, useParentProfile } from '@/hooks/useParent';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, hueColor, radius, spacing, typography } from '@/theme';
import type { ParentStackParamList, ParentTabParamList } from '@/navigation/types';

type Nav = BottomTabNavigationProp<ParentTabParamList, 'Home'> & {
  navigate: NativeStackNavigationProp<ParentStackParamList>['navigate'];
};

const ACTIONS = [
  { icon: 'card' as const, label: 'Pay fees', target: 'Fees' as const, hue: 'coral' as const },
  { icon: 'flag' as const, label: 'Apply leave', target: 'Leave' as const, hue: 'blue' as const },
  { icon: 'calendar' as const, label: 'PTM', target: 'PTM' as const, hue: 'teal' as const },
  { icon: 'bus' as const, label: 'Bus track', target: 'Transport' as const, hue: 'pink' as const },
];

export function ParentHomeScreen() {
  const nav = useNavigation<Nav>();
  const { childId } = useSelectedChild();

  const profileQ = useParentProfile();
  const childrenQ = useChildren();
  const todayQ = useChildToday(childId);
  const annQ = useAnnouncements('parent');

  const isLoading = profileQ.isLoading || childrenQ.isLoading || todayQ.isLoading || annQ.isLoading;
  const isError = profileQ.isError || childrenQ.isError || todayQ.isError || annQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
    childrenQ.refetch();
    todayQ.refetch();
    annQ.refetch();
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

  const parent = profileQ.data!;
  const children = childrenQ.data!;
  const child = children.find((c) => c.id === childId) ?? children[0];
  const today = todayQ.data!;
  const firstAnn = annQ.data![0];
  const doneClasses = today.classes.filter((x) => x.done).length;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greet}>Hello {parent.name.split(' ')[0]} 👋</Text>
            <Text style={[typography.h1, { marginTop: 2 }]}>Friday, Apr 25</Text>
          </View>
          <IconButton icon="notifications-outline" badge />
        </View>

        <KidSwitcher />

        {/* Today snapshot hero */}
        <View style={{ paddingHorizontal: 18 }}>
          <View style={[styles.hero, { backgroundColor: hueColor(child.hue) }]}>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>{child.name}&apos;s day</Text>
                <Text style={styles.heroTitle}>At school · safe</Text>
                <Text style={styles.heroSub}>Marked present at 8:42 AM</Text>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="shield-checkmark" size={20} color={colors.white} />
              </View>
            </View>
            <View style={styles.heroStats}>
              <HeroStat label="Classes done" value={`${doneClasses}/${today.classes.length}`} />
              <HeroStat label="Pickup" value={today.pickup} divider />
              <HeroStat label="Avg" value={`${child.avg}%`} />
            </View>
          </View>
        </View>

        {/* Today's classes */}
        <View style={styles.section}>
          <SectionHeader title="Today's classes" style={{ marginBottom: 12 }} />
          <Card style={{ padding: 14 }}>
            {today.classes.map((cl, i) => (
              <View
                key={`${cl.t}-${i}`}
                style={[styles.classRow, i !== today.classes.length - 1 && styles.classDivider]}
              >
                <Text style={styles.classTime}>{cl.t}</Text>
                <View
                  style={[
                    styles.classDot,
                    { backgroundColor: cl.done ? colors.present : colors.rule },
                  ]}
                />
                <Text
                  style={[styles.classLabel, { color: cl.done ? colors.inkMuted : colors.ink }]}
                >
                  {cl.label}
                </Text>
                {cl.attn === 'present' ? (
                  <Pill tone="present">Present</Pill>
                ) : cl.attn === 'late' ? (
                  <Pill tone="late">Late</Pill>
                ) : cl.done ? (
                  <Pill tone="neutral">—</Pill>
                ) : (
                  <Text style={styles.upcoming}>upcoming</Text>
                )}
              </View>
            ))}
          </Card>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <SectionHeader title="Quick actions" style={{ marginBottom: 12 }} />
          <View style={styles.actions}>
            {ACTIONS.map((a) => (
              <Pressable
                key={a.label}
                onPress={() => nav.navigate(a.target as never)}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
              >
                <View style={[styles.actionIcon, { backgroundColor: hueColor(a.hue, 'tint') }]}>
                  <Ionicons name={a.icon} size={22} color={hueColor(a.hue)} />
                </View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Fee due alert */}
        {child.fee !== 'Paid' ? (
          <View style={styles.section}>
            <Card style={styles.feeAlert}>
              <View style={styles.feeIcon}>
                <Ionicons name="alert-circle" size={20} color={colors.late} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeTitle}>Term 4 fee due</Text>
                <Text style={styles.feeMeta}>$1,240 · {child.fee}</Text>
              </View>
              <Button size="md" variant="primary" onPress={() => nav.navigate('Fees')}>
                Pay
              </Button>
            </Card>
          </View>
        ) : null}

        {/* Latest notice */}
        <View style={styles.section}>
          <SectionHeader
            title="From school"
            action={{ label: 'See all', onPress: () => nav.navigate('Announcements') }}
            style={{ marginBottom: 12 }}
          />
          {firstAnn ? (
            <Card style={{ padding: 14 }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.noticeIcon}>
                  <Ionicons name="megaphone" size={16} color={colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.noticeTitle}>{firstAnn.title}</Text>
                  <Text style={styles.noticeBody}>{firstAnn.body}</Text>
                  <Text style={styles.noticeMeta}>
                    {firstAnn.from} · {firstAnn.when}
                  </Text>
                </View>
              </View>
            </Card>
          ) : null}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function HeroStat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View style={[styles.heroStat, divider && styles.heroStatDivider]}>
      <Text style={styles.heroStatLabel}>{label}</Text>
      <Text style={styles.heroStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
  },
  greet: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  hero: { borderRadius: radius.lg, padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    color: colors.white,
    marginTop: 6,
    letterSpacing: -0.2,
  },
  heroSub: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  heroIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStats: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  heroStat: { flex: 1, paddingHorizontal: 8 },
  heroStatDivider: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroStatLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  heroStatValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.white,
    marginTop: 4,
  },
  section: { paddingHorizontal: 18, marginTop: 20 },
  classRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  classDivider: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  classTime: { width: 50, fontFamily: fontFamily.bold, fontSize: 12, color: colors.ink3 },
  classDot: { width: 8, height: 8, borderRadius: 4 },
  classLabel: { flex: 1, fontFamily: fontFamily.bold, fontSize: 13 },
  upcoming: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.inkMuted },
  actions: { flexDirection: 'row', gap: 10 },
  action: { flex: 1, alignItems: 'center' },
  actionIcon: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.ink2 },
  feeAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.late,
    backgroundColor: colors.lateSoft,
  },
  feeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feeTitle: { fontFamily: fontFamily.extraBold, fontSize: 13.5, color: colors.late },
  feeMeta: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: colors.late, marginTop: 2 },
  noticeIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.coralTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noticeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  noticeBody: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 4,
    lineHeight: 17,
  },
  noticeMeta: { fontFamily: fontFamily.bold, fontSize: 10.5, color: colors.inkMuted, marginTop: 6 },
});
