import { useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card, ErrorState, Loading, ScreenHeader, SectionHeader } from '@/components/ui';
import { useStudentProfile } from '@/hooks/useStudent';
import { useChildren, useParentProfile } from '@/hooks/useParent';
import { useAuth } from '@/providers/AuthProvider';
import { dash } from '@/lib/personalInfo';
import { properName } from '@/lib/properCase';
import { loginPrefs } from '@/services/auth/loginPrefs';
import { colors, fontFamily, spacing } from '@/theme';

export function PrivacyScreen() {
  const { role, session } = useAuth();
  if (role === 'parent') return <ParentPrivacy email={session?.email} />;
  return <StudentPrivacy email={session?.email} />;
}

function StudentPrivacy({ email }: { email?: string }) {
  const profileQ = useStudentProfile();
  const [savedLogin, setSavedLogin] = useState(false);

  useEffect(() => {
    void loginPrefs.load().then((prefs) => setSavedLogin(!!prefs?.rememberMe));
  }, []);

  if (profileQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Privacy & parental controls" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (profileQ.isError || !profileQ.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Privacy & parental controls" />
        <ErrorState onRetry={() => profileQ.refetch()} />
      </SafeAreaView>
    );
  }

  const s = profileQ.data;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Privacy & parental controls" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={profileQ.isRefetching}
            onRefresh={() => {
              void profileQ.refetch();
              void loginPrefs.load().then((prefs) => setSavedLogin(!!prefs?.rememberMe));
            }}
          />
        }
      >
        <SectionHeader title="School policy" />
        <Card style={styles.card}>
          <InfoRow label="Chat language filter" value="On" hint="Blocks abusive or sexual language in messages" />
          <InfoRow label="Who can message you" value="Class teachers" />
          <InfoRow
            label="Who can see your profile"
            value="School staff and your parent"
            last
          />
        </Card>

        <SectionHeader title="Linked parent" />
        <Card style={styles.card}>
          <InfoRow label="Guardian" value={dash(properName(s.guardianName))} />
          <InfoRow label="Phone" value={dash(s.guardianPhone)} last />
        </Card>

        <SectionHeader title="This device" />
        <Card style={styles.card}>
          <InfoRow label="Signed in as" value={dash(email || s.email)} />
          <InfoRow label="Saved login" value={savedLogin ? 'Yes' : 'No'} last />
          {savedLogin ? (
            <View style={{ padding: 12 }}>
              <Button
                variant="secondary"
                full
                onPress={async () => {
                  await loginPrefs.clear();
                  setSavedLogin(false);
                }}
              >
                Forget saved login
              </Button>
            </View>
          ) : null}
        </Card>

        <Text style={styles.hint}>
          The school sets who can contact you and which parent is linked. Ask the office to change guardian details.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function ParentPrivacy({ email }: { email?: string }) {
  const profileQ = useParentProfile();
  const childrenQ = useChildren();
  const [savedLogin, setSavedLogin] = useState(false);

  useEffect(() => {
    void loginPrefs.load().then((prefs) => setSavedLogin(!!prefs?.rememberMe));
  }, []);

  const onRefresh = () => {
    profileQ.refetch();
    childrenQ.refetch();
    void loginPrefs.load().then((prefs) => setSavedLogin(!!prefs?.rememberMe));
  };

  if (profileQ.isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Privacy & security" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (profileQ.isError || !profileQ.data) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Privacy & security" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const p = profileQ.data;
  const children = childrenQ.data ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader title="Privacy & security" />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={profileQ.isRefetching} onRefresh={onRefresh} />
        }
      >
        <SectionHeader title="What you can see" />
        <Card style={styles.card}>
          <InfoRow label="Children" value={children.length ? children.map((c) => properName(c.name)).join(', ') : 'None linked'} />
          <InfoRow label="Access" value="Grades, attendance, fees, chat, timetable" />
          <InfoRow label="Chat language filter" value="On" last />
        </Card>

        <SectionHeader title="This device" />
        <Card style={styles.card}>
          <InfoRow label="Signed in as" value={dash(email || p.email)} />
          <InfoRow label="Saved login" value={savedLogin ? 'Yes' : 'No'} last />
          {savedLogin ? (
            <View style={{ padding: 12 }}>
              <Button
                variant="secondary"
                full
                onPress={async () => {
                  await loginPrefs.clear();
                  setSavedLogin(false);
                }}
              >
                Forget saved login
              </Button>
            </View>
          ) : null}
        </Card>

        <Text style={styles.hint}>
          Only linked parents can see this child’s school record. Ask the office to add or remove a guardian.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({
  label,
  value,
  hint,
  last,
}: {
  label: string;
  value: string;
  hint?: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.row, !last && styles.divider]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>{label}</Text>
        {hint ? <Text style={styles.sub}>{hint}</Text> : null}
      </View>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 28 },
  card: { padding: 4, marginTop: 10, marginBottom: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
  label: { fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.ink, width: 140 },
  sub: { fontFamily: fontFamily.medium, fontSize: 11.5, color: colors.inkMuted, marginTop: 3, width: 140 },
  value: { flex: 1, fontFamily: fontFamily.bold, fontSize: 13.5, color: colors.ink, textAlign: 'right' },
  hint: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.inkMuted,
    textAlign: 'center',
    marginTop: 4,
  },
});
