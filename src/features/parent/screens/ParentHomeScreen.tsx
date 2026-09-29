import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import {
  Button,
  Card,
  Empty,
  ErrorState,
  IconButton,
  Loading,
  Pill,
  SchoolBadge,
  SectionHeader,
  LastUpdated,
} from '@/components/ui';
import type { PillTone } from '@/components/ui';
import { KidSwitcher } from '../components/KidSwitcher';
import { useChildren, useChildToday, useParentProfile } from '@/hooks/useParent';
import { useFees } from '@/hooks/useFees';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { useNotifications } from '@/hooks/useNotifications';
import { useGrades } from '@/hooks/useGrades';
import { useSubjects } from '@/hooks/useSubjects';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, hueColor, radius, spacing, typography } from '@/theme';
import type { DailyAttendanceStatus } from '@/models';
import type { ParentStackParamList, ParentTabParamList } from '@/navigation/types';
import { buildReportFromGrades } from '@/lib/reportCardBuild';
import { formatHomeAttn, formatReportOrHomeAvg } from '@/lib/homeStats';
import { attendancePctFromStatuses } from '@/lib/todayAttendance';
import { isBlockingError, isInitialLoad } from '@/lib/queryStatus';
import { goToLatestNotice, unreadNoticeCount } from '@/lib/noticeRoute';

type Nav = BottomTabNavigationProp<ParentTabParamList, 'Home'> & {
  navigate: NativeStackNavigationProp<ParentStackParamList>['navigate'];
};

const ACTIONS = [
  { icon: 'clipboard' as const, label: 'Attendance', target: 'Attendance' as const, hue: 'forest' as const },
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
  const noticesQ = useNotifications();
  const feesQ = useFees(childId);
  const gradesQ = useGrades(childId);
  const subjectsQ = useSubjects(childId);

  useFocusEffect(
    useCallback(() => {
      void todayQ.refetch();
      void annQ.refetch();
      void noticesQ.refetch();
    }, [todayQ.refetch, annQ.refetch, noticesQ.refetch]),
  );

  const onRefresh = () => {
    profileQ.refetch();
    childrenQ.refetch();
    todayQ.refetch();
    annQ.refetch();
    noticesQ.refetch();
    gradesQ.refetch();
    subjectsQ.refetch();
  };

  if (isInitialLoad(profileQ)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }
  if (isBlockingError(profileQ)) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const parent = profileQ.data!;
  const children = childrenQ.data ?? [];
  if (children.length === 0) {
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
              <Text style={[typography.h1, { marginTop: 2 }]}>
                {new Date().toLocaleDateString(undefined, {
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric',
                })}
              </Text>
            </View>
            <IconButton
              icon="notifications-outline"
              badge={unreadNoticeCount(noticesQ.data)}
              onPress={() => goToLatestNotice(nav, noticesQ.data, 'parent')}
            />
          </View>
          <Empty message="No children are linked to this account yet." />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const child = children.find((c) => c.id === childId) ?? children[0];
  // No live "today" schedule/meals endpoint yet — render an empty state, not an error.
  const today = todayQ.data ?? { classes: [], meals: { breakfast: '', lunch: '' }, pickup: '—', todayAttn: null };
  // 'partial' invoices are still outstanding — only fully-paid fees drop off this alert.
  const dueFee = feesQ.data?.find((f) => f.status === 'due' || f.status === 'partial');
  const firstAnn = annQ.data![0];
  const doneClasses = today.classes.filter((x) => x.done).length;
  const attendanceChip = dailyAttendanceChip(today.todayAttn);
  const todayAttnPct = attendancePctFromStatuses(today.classes.map((c) => c.attn));
  const avgLabel =
    todayAttnPct != null
      ? formatHomeAttn(todayAttnPct)
      : formatReportOrHomeAvg(
          buildReportFromGrades(gradesQ.data ?? [], subjectsQ.data ?? []),
          child.avg,
        );

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
            <Text style={[typography.h1, { marginTop: 2 }]}>
              {new Date().toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <IconButton
            icon="notifications-outline"
            badge={unreadNoticeCount(noticesQ.data)}
            onPress={() => goToLatestNotice(nav, noticesQ.data, 'parent')}
          />
        </View>

        <KidSwitcher />

        {/* Today snapshot hero */}
        <View style={{ paddingHorizontal: 18 }}>
          <View style={[styles.hero, { backgroundColor: colors.primary }]}>
            <View style={styles.brandRow}>
              <SchoolBadge light />
            </View>
            <View style={styles.heroTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.heroEyebrow}>{child.name}&apos;s day</Text>
                <Text style={styles.heroTitle}>Attendance today</Text>
                <Pressable onPress={() => nav.navigate('Attendance')} style={styles.attendanceChip}>
                  <Pill tone={attendanceChip.tone}>{attendanceChip.label}</Pill>
                </Pressable>
              </View>
              <View style={styles.heroIcon}>
                <Ionicons name="shield-checkmark" size={20} color={colors.white} />
              </View>
            </View>
            <View style={styles.heroStats}>
              <HeroStat label="Classes done" value={`${doneClasses}/${today.classes.length}`} />
              <HeroStat label="Pickup" value={today.pickup} divider />
              <HeroStat label="Avg" value={avgLabel} />
            </View>
          </View>
        </View>

        {/* Today's classes */}
        <View style={styles.section}>
          <SectionHeader title="Today's classes" style={{ marginBottom: 12 }} />
          {today.classes.length === 0 ? (
            <Card style={{ padding: 14 }}>
              <Empty message="No classes today." />
            </Card>
          ) : (
            <Card style={{ padding: 14 }}>
              {today.classes.map((cl, i) => (
                <View
                  key={`${cl.t}-${i}`}
                  style={[styles.classRow, i !== today.classes.length - 1 && styles.classDivider]}
                >
                  <Text style={styles.classTime}>{cl.t}</Text>
                  <Text style={styles.classLabel}>{cl.label}</Text>
                  {cl.attn ? (
                    <Pill tone={cl.attn === 'present' ? 'present' : cl.attn === 'late' ? 'late' : 'absent'}>
                      {cl.attn}
                    </Pill>
                  ) : null}
                </View>
              ))}
            </Card>
          )}
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
        {dueFee ? (
          <View style={styles.section}>
            <Card style={styles.feeAlert}>
              <View style={styles.feeIcon}>
                <Ionicons name="alert-circle" size={20} color={colors.late} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.feeTitle}>{dueFee.period} fee due</Text>
                <Text style={styles.feeMeta}>
                  ₹{(dueFee.amount - (dueFee.paidAmount ?? 0)).toLocaleString()}
                  {dueFee.dueDate ? ` · due ${dueFee.dueDate}` : ''}
                </Text>
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
            <Card style={{ padding: 14, borderColor: firstAnn.unread ? colors.absent : colors.rule }}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={styles.noticeIcon}>
                  <Ionicons name="megaphone" size={16} color={firstAnn.unread ? colors.absent : colors.coral} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noticeTitle, firstAnn.unread && { color: colors.absent }]}>{firstAnn.title}</Text>
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

function dailyAttendanceChip(status: DailyAttendanceStatus): { label: string; tone: PillTone } {
  if (status === 'present') return { label: 'Present today', tone: 'present' };
  if (status === 'absent') return { label: 'Absent', tone: 'absent' };
  if (status === 'late') return { label: 'Late', tone: 'late' };
  if (status === 'leave') return { label: 'On leave', tone: 'primary' };
  return { label: 'Not marked', tone: 'neutral' };
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
  brandRow: { marginBottom: spacing.m },
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
  attendanceChip: { alignSelf: 'flex-start', marginTop: 8 },
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
  classLabel: { flex: 1, fontFamily: fontFamily.bold, fontSize: 13 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: { width: '18%', flexGrow: 1, alignItems: 'center' },
  actionIcon: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  actionLabel: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.ink2, textAlign: 'center' },
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
