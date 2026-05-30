import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, ErrorState, Loading, ScreenHeader, Toast } from '@/components/ui';
import { useHomeworkItem, useSubmitHomework } from '@/hooks/useHomework';
import { useSubjects } from '@/hooks/useSubjects';
import { colors, fontFamily, hueColor, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList, 'HomeworkDetail'>;
type Route = RouteProp<RootStackParamList, 'HomeworkDetail'>;

export function HomeworkDetailScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute<Route>();
  const hwQ = useHomeworkItem(route.params.id);
  const subjectsQ = useSubjects();
  const submitMut = useSubmitHomework();
  const [toast, setToast] = useState(false);

  const isLoading = hwQ.isLoading || subjectsQ.isLoading;
  const isError = hwQ.isError || subjectsQ.isError || !hwQ.data;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Homework" onBack={() => nav.goBack()} />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Homework" onBack={() => nav.goBack()} />
        <ErrorState
          message="Couldn't load this homework."
          onRetry={() => {
            hwQ.refetch();
            subjectsQ.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  const h = hwQ.data!;
  const subjects = subjectsQ.data!;
  const sub = subjects.find((s) => s.id === h.subjId) ?? subjects[0];
  const submitted = h.status === 'submitted' || h.status === 'graded';

  const onSubmit = () => {
    submitMut.mutate(h.id, {
      onSuccess: () => {
        setToast(true);
        setTimeout(() => setToast(false), 1600);
      },
    });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader kicker={sub.name} title={h.title} onBack={() => nav.goBack()} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { backgroundColor: hueColor(sub.color) }]}>
          <Stat label="Due" value={h.due} />
          <Stat label="Time" value={h.dueT.split(' ')[0]} divider />
          <Stat label="Status" value={submitted ? 'Done' : 'Open'} />
        </View>

        <Text style={[typography.eyebrow, { marginTop: 18, marginBottom: 8 }]}>
          Description
        </Text>
        <Card style={{ padding: 14 }}>
          <Text style={styles.body}>
            Complete questions 1–14 from the textbook on quadratic equations. Show your full
            working out and submit a scanned PDF or photos of the pages. Aim for clarity over
            speed — partial credit is given for correct method.
          </Text>
        </Card>

        <Text style={[typography.eyebrow, { marginTop: 18, marginBottom: 8 }]}>Resources</Text>
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <ResourceRow icon="document-text" label="Textbook Ch. 7 Practice.pdf" sub="1.4 MB · PDF" />
          <ResourceRow icon="book" label="Worked example — Q5" sub="320 KB · PDF" last />
        </Card>

        <Text style={[typography.eyebrow, { marginTop: 18, marginBottom: 8 }]}>
          Your submission
        </Text>
        {submitted ? (
          <View style={styles.submitted}>
            <View style={styles.submittedIcon}>
              <Ionicons name="checkmark" size={18} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.submittedTitle}>Submitted</Text>
              <Text style={styles.submittedMeta}>2 photos · uploaded just now</Text>
            </View>
          </View>
        ) : (
          <View style={styles.dropzone}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.inkMuted} />
            <Text style={styles.dropTitle}>Tap to attach photos or PDF</Text>
            <Text style={styles.dropMeta}>Up to 10 files · 25 MB total</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bar}>
        <Button variant="ghost" leading={<Ionicons name="chatbubble-outline" size={16} color={colors.ink} />}>
          Ask
        </Button>
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            full
            disabled={submitted}
            loading={submitMut.isPending}
            onPress={onSubmit}
          >
            {submitted ? 'Submitted ✓' : 'Submit homework'}
          </Button>
        </View>
      </View>

      <Toast show={toast} msg="Homework submitted" />
    </SafeAreaView>
  );
}

function Stat({ label, value, divider }: { label: string; value: string; divider?: boolean }) {
  return (
    <View
      style={[
        styles.stat,
        divider && { borderLeftWidth: 1, borderRightWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function ResourceRow({
  icon,
  label,
  sub,
  last,
}: {
  icon: 'document-text' | 'book';
  label: string;
  sub: string;
  last?: boolean;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.resource,
        !last && { borderBottomWidth: 1, borderBottomColor: colors.ruleSoft },
        pressed && { opacity: 0.7 },
      ]}
    >
      <View style={styles.resIcon}>
        <Ionicons name={icon} size={16} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.resLabel}>{label}</Text>
        <Text style={styles.resSub}>{sub}</Text>
      </View>
      <Ionicons name="download-outline" size={16} color={colors.inkSoft} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 120 },
  hero: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: radius.lg,
  },
  stat: { flex: 1, paddingHorizontal: 8 },
  statLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.white,
    marginTop: 4,
  },
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 13.5,
    color: colors.ink2,
    lineHeight: 21,
  },
  resource: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  resIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink },
  resSub: {
    fontFamily: fontFamily.medium,
    fontSize: 10.5,
    color: colors.inkMuted,
    marginTop: 2,
  },
  submitted: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.present,
    backgroundColor: colors.presentSoft,
  },
  submittedIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.present,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submittedTitle: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.present },
  submittedMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
  dropzone: {
    paddingVertical: 28,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inkSoft,
  },
  dropTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.ink,
    marginTop: 8,
  },
  dropMeta: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 4,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(251,251,253,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
    flexDirection: 'row',
    gap: 10,
  },
});
