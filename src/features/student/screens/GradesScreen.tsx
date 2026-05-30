import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorState, IconButton, Loading, ScreenHeader } from '@/components/ui';
import { useStudentProfile } from '@/hooks/useStudent';
import { useSubjects } from '@/hooks/useSubjects';
import {
  colors,
  fontFamily,
  hueColor,
  primaryGradient,
  radius,
  spacing,
  typography,
} from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function GradesScreen() {
  const nav = useNavigation<Nav>();
  const profileQ = useStudentProfile();
  const subjectsQ = useSubjects();

  const isLoading = profileQ.isLoading || subjectsQ.isLoading;
  const isError = profileQ.isError || subjectsQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
    subjectsQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Term 4 · 2026" title="Report card" onBack={() => nav.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader kicker="Term 4 · 2026" title="Report card" onBack={() => nav.goBack()} />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const student = profileQ.data!;
  const subjects = subjectsQ.data!;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker="Term 4 · 2026"
        title="Report card"
        onBack={() => nav.goBack()}
        right={<IconButton icon="download-outline" />}
      />
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
          <Text style={styles.heroEyebrow}>OVERALL THIS TERM</Text>
          <View style={styles.heroVal}>
            <Text style={styles.heroNum}>
              {student.overallAvg}
              <Text style={styles.heroPct}>%</Text>
            </Text>
            <View style={styles.heroSide}>
              <Text style={styles.heroGrade}>A−</Text>
              <Text style={styles.heroDelta}>↑ 3% vs Term 3</Text>
            </View>
          </View>
          <View style={styles.heroBottom}>
            <Stat label="Class rank" value={`${student.rank}/${student.rankOf}`} />
            <Stat label="Attendance" value={`${student.attnPct}%`} divider />
            <Stat label="Best subject" value="CS" />
          </View>
        </LinearGradient>

        <Text style={[typography.eyebrow, { marginTop: 18, marginBottom: 8 }]}>
          Subject breakdown
        </Text>
        <View style={{ gap: 10 }}>
          {subjects.map((sub) => (
            <Pressable
              key={sub.id}
              onPress={() => nav.navigate('SubjectDetail', { id: sub.id })}
              style={({ pressed }) => [styles.row, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.rowTop}>
                <View
                  style={[
                    styles.subjIcon,
                    { backgroundColor: hueColor(sub.color) },
                  ]}
                >
                  <Text style={styles.subjIconTxt}>{sub.short}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.subjName}>{sub.name}</Text>
                  <Text style={styles.subjTeacher}>{sub.teacher}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.subjAvg}>{sub.avg}%</Text>
                  <Text
                    style={[
                      styles.subjTrend,
                      {
                        color:
                          sub.trend > 0
                            ? colors.present
                            : sub.trend < 0
                              ? colors.absent
                              : colors.inkMuted,
                      },
                    ]}
                  >
                    {sub.trend > 0
                      ? `↑ ${sub.trend}%`
                      : sub.trend < 0
                        ? `↓ ${Math.abs(sub.trend)}%`
                        : '—'}
                  </Text>
                </View>
              </View>
              <View style={styles.barBg}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${sub.avg}%`, backgroundColor: hueColor(sub.color) },
                  ]}
                />
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({
  label,
  value,
  divider,
}: {
  label: string;
  value: string;
  divider?: boolean;
}) {
  return (
    <View
      style={[
        styles.stat,
        divider && {
          borderLeftWidth: 1,
          borderRightWidth: 1,
          borderColor: 'rgba(255,255,255,0.2)',
        },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  hero: { padding: 18, borderRadius: radius.lg },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.6,
  },
  heroVal: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    marginTop: 8,
  },
  heroNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: 56,
    color: colors.white,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroPct: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  heroSide: { paddingBottom: 8 },
  heroGrade: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.white },
  heroDelta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  heroBottom: {
    flexDirection: 'row',
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  stat: { flex: 1, paddingHorizontal: 8 },
  statLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.white,
    marginTop: 4,
  },
  row: {
    padding: 14,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjIconTxt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    color: colors.white,
  },
  subjName: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  subjTeacher: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  subjAvg: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  subjTrend: { fontFamily: fontFamily.bold, fontSize: 10 },
  barBg: {
    height: 6,
    backgroundColor: colors.ruleSoft,
    borderRadius: 3,
    marginTop: 12,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 3 },
});
