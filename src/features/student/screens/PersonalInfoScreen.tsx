import { Image, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card, ErrorState, Loading, ScreenHeader, SectionHeader } from '@/components/ui';
import { useStudentProfile } from '@/hooks/useStudent';
import { useChildren, useParentProfile } from '@/hooks/useParent';
import { useSchool } from '@/hooks/useSchool';
import { useAuth } from '@/providers/AuthProvider';
import { dash, formatDob } from '@/lib/personalInfo';
import { properName, properPlace } from '@/lib/properCase';
import { colors, fontFamily, spacing } from '@/theme';

export function PersonalInfoScreen() {
  const { role, session } = useAuth();
  if (role === 'parent') return <ParentPersonalInfo emailFallback={session?.email} />;
  return <StudentPersonalInfo emailFallback={session?.email} />;
}

function StudentPersonalInfo({ emailFallback }: { emailFallback?: string }) {
  const profileQ = useStudentProfile();
  const schoolQ = useSchool();

  const onRefresh = () => {
    profileQ.refetch();
    schoolQ.refetch();
  };

  if (profileQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Personal info" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (profileQ.isError || !profileQ.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Personal info" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const s = profileQ.data;
  const school = (s.school || schoolQ.data?.name || '').trim();
  const email = s.email || emailFallback || '';
  const classLabel = s.classroom || [s.grade, s.section].filter(Boolean).join('-');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Personal info" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.identity}>
          {s.photoUrl ? (
            <Image source={{ uri: s.photoUrl }} style={styles.photo} />
          ) : (
            <View style={styles.photoFallback}>
              <Text style={styles.photoTxt}>{s.initials}</Text>
            </View>
          )}
          <Text style={styles.identityName}>{properName(s.name)}</Text>
          <Text style={styles.identityMeta}>{dash(classLabel)}</Text>
        </View>

        <SectionHeader title="Identity" />
        <Card style={styles.card}>
          <InfoRow label="Full name" value={dash(properName(s.name))} />
          <InfoRow label="Admission no." value={dash(s.studentId)} />
          <InfoRow label="Gender" value={dash(properName(s.gender))} />
          <InfoRow label="Date of birth" value={formatDob(s.dob)} last />
        </Card>

        <SectionHeader title="School" />
        <Card style={styles.card}>
          <InfoRow label="School" value={dash(school)} />
          <InfoRow label="Class" value={dash(classLabel)} />
          <InfoRow label="Roll no." value={s.roll > 0 ? String(s.roll) : '—'} />
          <InfoRow label="House" value={dash(s.house)} last />
        </Card>

        <SectionHeader title="Contact" />
        <Card style={styles.card}>
          <InfoRow label="Email" value={dash(email)} />
          <InfoRow label="Address" value={dash(properPlace(s.address))} last />
        </Card>

        <SectionHeader title="Family" />
        <Card style={styles.card}>
          <InfoRow label="Guardian" value={dash(properName(s.guardianName))} />
          <InfoRow label="Guardian phone" value={dash(s.guardianPhone)} last />
        </Card>

        <Text style={styles.hint}>To change these details, contact the school office.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParentPersonalInfo({ emailFallback }: { emailFallback?: string }) {
  const profileQ = useParentProfile();
  const childrenQ = useChildren();

  const onRefresh = () => {
    profileQ.refetch();
    childrenQ.refetch();
  };

  if (profileQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Personal info" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (profileQ.isError || !profileQ.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Personal info" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const p = profileQ.data;
  const children = childrenQ.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Personal info" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <View style={styles.identity}>
          <View style={styles.photoFallback}>
            <Text style={styles.photoTxt}>{p.initials}</Text>
          </View>
          <Text style={styles.identityName}>{properName(p.name)}</Text>
          <Text style={styles.identityMeta}>{dash(p.relation)}</Text>
        </View>

        <SectionHeader title="Account" />
        <Card style={styles.card}>
          <InfoRow label="Full name" value={dash(properName(p.name))} />
          <InfoRow label="Relation" value={dash(p.relation)} />
          <InfoRow label="Email" value={dash(p.email || emailFallback)} />
          <InfoRow label="Phone" value={dash(p.phone)} last />
        </Card>

        <SectionHeader title="Children" />
        <Card style={styles.card}>
          {children.length === 0 ? (
            <InfoRow label="Linked students" value="None yet" last />
          ) : (
            children.map((c, i) => (
              <InfoRow
                key={c.id}
                label={dash(properName(c.name))}
                value={dash(c.grade)}
                last={i === children.length - 1}
              />
            ))
          )}
        </Card>

        <Text style={styles.hint}>To change these details, contact the school office.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 28 },
  identity: { alignItems: 'center', paddingVertical: 18, gap: 8 },
  photo: { width: 72, height: 72, borderRadius: 22, backgroundColor: colors.ruleSoft },
  photoFallback: {
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoTxt: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.primary },
  identityName: { fontFamily: fontFamily.extraBold, fontSize: 20, color: colors.ink, letterSpacing: -0.3 },
  identityMeta: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  card: { padding: 4, marginTop: 10, marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  label: {
    width: 120,
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.inkMuted,
    paddingTop: 1,
  },
  value: {
    flex: 1,
    fontFamily: fontFamily.bold,
    fontSize: 13.5,
    color: colors.ink,
    textAlign: 'right',
  },
  hint: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
