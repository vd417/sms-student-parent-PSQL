import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, ErrorState, IconButton, Loading, Pill, SectionHeader } from '@/components/ui';
import { useChildren, useParentProfile } from '@/hooks/useParent';
import { useAuth } from '@/providers/AuthProvider';
import { colors, fontFamily, hueColor, primaryGradient, radius } from '@/theme';

export function ParentProfileScreen() {
  const { signOut } = useAuth();
  const profileQ = useParentProfile();
  const childrenQ = useChildren();

  const isLoading = profileQ.isLoading || childrenQ.isLoading;
  const isError = profileQ.isError || childrenQ.isError;
  const onRefresh = () => {
    profileQ.refetch();
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

  const parent = profileQ.data!;
  const children = childrenQ.data!;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 14, paddingBottom: 24 }}
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
              <Text style={styles.avatarTxt}>{parent.initials}</Text>
            </View>
            <View>
              <Text style={styles.name}>{parent.name}</Text>
              <Text style={styles.sub}>
                {parent.relation} · {children.length} children
              </Text>
              <Text style={styles.phone}>{parent.phone}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={{ marginTop: 18 }}>
          <SectionHeader title="My children" action={{ label: 'Add child' }} />
          <View style={{ gap: 10, marginTop: 10 }}>
            {children.map((c) => (
              <View key={c.id} style={styles.childRow}>
                <View style={[styles.childIcon, { backgroundColor: hueColor(c.hue) }]}>
                  <Text style={styles.childIconTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{c.name}</Text>
                  <Text style={styles.childMeta}>
                    {c.grade} · {c.school}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <Pill tone="primary">{c.avg}% avg</Pill>
                    <Pill tone={c.attn >= 95 ? 'present' : 'late'}>{c.attn}% attn</Pill>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
              </View>
            ))}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionHeader title="Account" />
          <Card style={{ padding: 4, marginTop: 10 }}>
            <ProfileRow icon="person-outline" label="Personal info" chev />
            <ProfileRow icon="card-outline" label="Payment methods" chev />
            <ProfileRow icon="lock-closed-outline" label="Privacy & security" chev />
            <ProfileRow icon="notifications-outline" label="Notifications" chev />
            <ProfileRow
              icon="log-out-outline"
              label="Sign out"
              chev
              last
              danger
              onPress={() => signOut()}
            />
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function ProfileRow({
  icon,
  label,
  chev,
  last,
  danger,
  onPress,
}: {
  icon: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  label: string;
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
      <Ionicons name={icon} size={18} color={danger ? colors.absent : colors.ink2} />
      <Text style={[styles.prLabel, danger && { color: colors.absent }]}>{label}</Text>
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
  hero: { padding: 18, borderRadius: radius.xl },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
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
  sub: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 2,
  },
  phone: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 4,
  },
  childRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  childIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  childIconTxt: { fontFamily: fontFamily.extraBold, fontSize: 14, color: colors.white },
  childName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  childMeta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  prDivider: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  prLabel: { flex: 1, fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.ink },
});
