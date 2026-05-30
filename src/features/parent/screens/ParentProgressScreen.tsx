import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ErrorState, Loading } from '@/components/ui';
import { KidSwitcher } from '../components/KidSwitcher';
import { useChildren } from '@/hooks/useParent';
import { useSubjects } from '@/hooks/useSubjects';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, hueColor, radius, primaryGradient, typography } from '@/theme';
import { LinearGradient } from 'expo-linear-gradient';

export function ParentProgressScreen() {
  const { childId } = useSelectedChild();
  const childrenQ = useChildren();
  const subjectsQ = useSubjects();

  const isLoading = childrenQ.isLoading || subjectsQ.isLoading;
  const isError = childrenQ.isError || subjectsQ.isError;
  const onRefresh = () => {
    childrenQ.refetch();
    subjectsQ.refetch();
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

  const children = childrenQ.data!;
  const child = children.find((c) => c.id === childId) ?? children[0];
  const subjects = subjectsQ.data!;
  const grade = child.avg >= 85 ? 'A−' : child.avg >= 80 ? 'B+' : 'B';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={childrenQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Term 4 · 2026</Text>
          <Text style={[typography.h1, { marginTop: 2 }]}>Progress</Text>
        </View>

        <KidSwitcher />

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <LinearGradient
            colors={primaryGradient as [string, string, string]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Text style={styles.heroEyebrow}>{child.name} · overall</Text>
            <View style={styles.heroVal}>
              <Text style={styles.heroNum}>
                {child.avg}
                <Text style={styles.heroPct}>%</Text>
              </Text>
              <View style={{ paddingBottom: 8 }}>
                <Text style={styles.heroGrade}>{grade}</Text>
                <Text style={styles.heroDelta}>↑ 3% vs last term</Text>
              </View>
            </View>
            <View style={styles.heroStats}>
              <HeroStat label="Class rank" value="4 / 28" />
              <HeroStat label="Attendance" value={`${child.attn}%`} divider />
              <HeroStat label="Best" value="CS" />
            </View>
          </LinearGradient>
        </View>

        <Text style={[typography.eyebrow, { paddingHorizontal: 18, marginBottom: 8 }]}>
          Subject performance
        </Text>
        <View style={{ paddingHorizontal: 18, gap: 10 }}>
          {subjects.map((sub) => {
            const adj = child.id === 'k2' ? -8 : 0;
            const avg = Math.max(60, Math.min(99, sub.avg + adj));
            return (
              <View key={sub.id} style={styles.subjCard}>
                <View style={styles.subjTop}>
                  <View style={[styles.subjIcon, { backgroundColor: hueColor(sub.color) }]}>
                    <Text style={styles.subjIconTxt}>{sub.short}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.subjName}>{sub.name}</Text>
                    <Text style={styles.subjTeacher}>{sub.teacher}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.subjAvg}>{avg}%</Text>
                    <Text
                      style={[
                        styles.subjTrend,
                        { color: sub.trend > 0 ? colors.present : colors.absent },
                      ]}
                    >
                      {sub.trend > 0 ? `↑ ${sub.trend}%` : `↓ ${Math.abs(sub.trend)}%`}
                    </Text>
                  </View>
                </View>
                <View style={styles.barBg}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${avg}%`, backgroundColor: hueColor(sub.color) },
                    ]}
                  />
                </View>
              </View>
            );
          })}
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
  header: { paddingHorizontal: 18, paddingTop: 8, paddingBottom: 12 },
  kicker: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  hero: { borderRadius: radius.lg, padding: 18 },
  heroEyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  heroVal: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 8 },
  heroNum: {
    fontFamily: fontFamily.extraBold,
    fontSize: 56,
    color: colors.white,
    lineHeight: 56,
    letterSpacing: -1,
  },
  heroPct: { fontSize: 24, color: 'rgba(255,255,255,0.7)' },
  heroGrade: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.white },
  heroDelta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
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
  subjCard: {
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  subjTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  subjIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subjIconTxt: { fontFamily: fontFamily.extraBold, fontSize: 12, color: colors.white },
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
