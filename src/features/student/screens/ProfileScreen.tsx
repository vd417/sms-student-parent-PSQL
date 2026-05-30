import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, ErrorState, IconButton, Loading, SectionHeader } from '@/components/ui';
import { useStudentProfile, useAchievements } from '@/hooks/useStudent';
import { useAuth } from '@/providers/AuthProvider';
import {
  colors,
  fontFamily,
  hueColor,
  primaryGradient,
  radius,
  spacing,
} from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const ACH_ICON: Record<'award' | 'star' | 'check' | 'flag', keyof typeof Ionicons.glyphMap> =
  {
    award: 'trophy',
    star: 'star',
    check: 'checkmark-circle',
    flag: 'flag',
  };

export function ProfileScreen() {
  const nav = useNavigation<Nav>();
  const { signOut } = useAuth();

  const profileQ = useStudentProfile();
  const achievementsQ = useAchievements();

  const isLoading = profileQ.isLoading || achievementsQ.isLoading;
  const isError = profileQ.isError || achievementsQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
    achievementsQ.refetch();
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

  const student = profileQ.data!;
  const achievements = achievementsQ.data!;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />}
      >
        <LinearGradient
          colors={primaryGradient as [string, string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <View style={styles.heroTop}>
            <Text style={styles.heroTitle}>Profile</Text>
            <IconButton icon="settings-outline" dark />
          </View>
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{student.initials}</Text>
            </View>
            <View>
              <Text style={styles.name}>{student.name}</Text>
              <Text style={styles.gradeTxt}>
                {student.grade} · Roll #{student.roll}
              </Text>
              <Text style={styles.school}>
                {student.school} · {student.studentId}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ marginTop: 18 }}>
          <SectionHeader title="Achievements" action={{ label: 'See all' }} />
          <View style={styles.grid}>
            {achievements.map((a, i) => (
              <View
                key={a.id}
                style={[
                  styles.gridCell,
                  i % 2 === 0 ? { paddingRight: 5 } : { paddingLeft: 5 },
                ]}
              >
                <View
                  style={[
                    styles.ach,
                    {
                      backgroundColor: hueColor(a.hue, 'tint'),
                      borderColor: hueColor(a.hue, 'soft'),
                    },
                  ]}
                >
                  <View
                    style={[styles.achIcon, { backgroundColor: hueColor(a.hue) }]}
                  >
                    <Ionicons name={ACH_ICON[a.icon]} size={18} color={colors.white} />
                  </View>
                  <Text style={styles.achTitle}>{a.title}</Text>
                  <Text style={styles.achWhen}>{a.when}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionHeader title="This term" />
          <Card style={{ padding: 4, marginTop: 10 }}>
            <ProfileRow icon="checkmark-circle-outline" label="Days present" value="84/87" />
            <ProfileRow
              icon="trophy-outline"
              label="Class rank"
              value={`${student.rank}/${student.rankOf}`}
            />
            <ProfileRow
              icon="bar-chart-outline"
              label="Avg score"
              value={`${student.overallAvg}%`}
            />
            <ProfileRow icon="flag-outline" label="Days off" value="3" last />
          </Card>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionHeader title="Account" />
          <Card style={{ padding: 4, marginTop: 10 }}>
            <ProfileRow icon="person-outline" label="Personal info" chev />
            <ProfileRow
              icon="lock-closed-outline"
              label="Privacy & parental controls"
              chev
            />
            <ProfileRow icon="notifications-outline" label="Notifications" chev />
            <ProfileRow icon="log-out-outline" label="Sign out" chev last danger onPress={() => signOut()} />
          </Card>
        </View>

        <Pressable
          onPress={() => nav.navigate('Grades')}
          style={({ pressed }) => [styles.viewReport, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="document-text-outline" size={18} color={colors.primary} />
          <Text style={styles.viewReportTxt}>View full report card</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.primary} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
  chev,
  last,
  danger,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value?: string;
  chev?: boolean;
  last?: boolean;
  danger?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.prRow,
        !last && styles.prDivider,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons
        name={icon}
        size={18}
        color={danger ? colors.absent : colors.ink2}
      />
      <Text
        style={[styles.prLabel, danger && { color: colors.absent }]}
      >
        {label}
      </Text>
      {value ? <Text style={styles.prValue}>{value}</Text> : null}
      {chev ? (
        <Ionicons
          name="chevron-forward"
          size={16}
          color={danger ? colors.absent : colors.inkSoft}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingTop: 14, paddingBottom: 24 },
  hero: { padding: 18, borderRadius: radius.xl },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.white,
    letterSpacing: -0.2,
  },
  heroRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 14 },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.white },
  name: { fontFamily: fontFamily.extraBold, fontSize: 18, color: colors.white },
  gradeTxt: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  school: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    marginHorizontal: -5,
  },
  gridCell: { width: '50%', paddingVertical: 5 },
  ach: { padding: 14, borderRadius: radius.md, borderWidth: 1 },
  achIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 10,
    letterSpacing: -0.1,
  },
  achWhen: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  prDivider: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  prLabel: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: colors.ink,
  },
  prValue: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.inkMuted },
  viewReport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  viewReportTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primary,
  },
});
