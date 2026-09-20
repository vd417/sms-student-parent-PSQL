import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Card, Empty, ErrorState, IconButton, Loading, Pill, ScreenHeader, SectionHeader } from '@/components/ui';
import { useChildren, useParentProfile } from '@/hooks/useParent';
import { useAuth } from '@/providers/AuthProvider';
import { useToast } from '@/providers/ToastProvider';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, hueColor, primaryGradient, radius, spacing } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

export function ParentProfileScreen() {
  const nav = useNavigation<Nav>();
  const { signOut } = useAuth();
  const toast = useToast();
  const { setChildId } = useSelectedChild();
  const profileQ = useParentProfile();
  const childrenQ = useChildren();

  const isLoading = (profileQ.isLoading && profileQ.data === undefined) || (childrenQ.isLoading && childrenQ.data === undefined);
  const isError = profileQ.isError && profileQ.data === undefined;
  const onRefresh = () => {
    profileQ.refetch();
    childrenQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Profile" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Profile" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const parent = profileQ.data!;
  const children = childrenQ.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        title="Profile"
        right={<IconButton icon="log-out-outline" onPress={() => signOut()} />}
      />
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
            {children.length === 0 ? (
              <Empty message="No children are linked to this account yet." />
            ) : (
              children.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => {
                  setChildId(c.id);
                  nav.navigate('Main', { screen: 'Class' });
                }}
                style={({ pressed }) => [styles.childRow, pressed && { opacity: 0.85 }]}
              >
                <View style={[styles.childIcon, { backgroundColor: hueColor(c.hue) }]}>
                  <Text style={styles.childIconTxt}>{c.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{c.name}</Text>
                  <Text style={styles.childMeta}>
                    {[c.grade, c.studentId || c.school].filter(Boolean).join(' · ')}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 8 }}>
                    <Pill tone="primary">{c.avg}% avg</Pill>
                    <Pill tone={c.attn >= 95 ? 'present' : 'late'}>{c.attn}% attn</Pill>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.inkSoft} />
              </Pressable>
              ))
            )}
          </View>
        </View>

        <View style={{ marginTop: 18 }}>
          <SectionHeader title="Account" />
          <Card style={{ padding: 4, marginTop: 10 }}>
            <ProfileRow
              icon="person-outline"
              label="Personal info"
              chev
              onPress={() => nav.navigate('PersonalInfo')}
            />
            <ProfileRow
              icon="card-outline"
              label="Payment methods"
              chev
              onPress={() => toast('Coming soon')}
            />
            <ProfileRow
              icon="lock-closed-outline"
              label="Privacy & security"
              chev
              onPress={() => nav.navigate('Privacy')}
            />
            <ProfileRow
              icon="notifications-outline"
              label="Notifications"
              chev
              last
              onPress={() => nav.navigate('NotificationSettings')}
            />
          </Card>
        </View>

        <Pressable
          onPress={() => signOut()}
          style={({ pressed }) => [styles.logoutBtn, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.absent} />
          <Text style={styles.logoutTxt}>Log out</Text>
        </Pressable>
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
  brandRow: { marginBottom: spacing.m },
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
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 18,
    paddingVertical: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.absent,
    backgroundColor: colors.white,
  },
  logoutTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.absent,
  },
});
