import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Empty, ErrorState, Loading, Pill, ScreenHeader } from '@/components/ui';
import { KidSwitcher } from '@/features/parent/components/KidSwitcher';
import { useExams } from '@/hooks/useGrades';
import { useHomework } from '@/hooks/useHomework';
import { useChildren } from '@/hooks/useParent';
import { useSubjects } from '@/hooks/useSubjects';
import { useStudentProfile } from '@/hooks/useStudent';
import { examsForClassCatalog } from '@/lib/belongsToSubject';
import { useAuth } from '@/providers/AuthProvider';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, radius, spacing } from '@/theme';
import type { ParentStackParamList, RootStackParamList } from '@/navigation/types';

type HubNav = NativeStackNavigationProp<RootStackParamList & ParentStackParamList>;
type Step = 'class' | 'menu' | 'tests' | 'homework';

const ACTIONS = [
  { key: 'attendance', label: 'Attendance', icon: 'checkmark-circle' as const, color: colors.present },
  { key: 'grades', label: 'Grades', icon: 'ribbon' as const, color: colors.blue },
  { key: 'tests', label: 'Tests', icon: 'document-text' as const, color: colors.coral },
  { key: 'homework', label: 'Homework', icon: 'book' as const, color: colors.yellow },
  { key: 'timetable', label: 'Timetable', icon: 'calendar' as const, color: colors.teal },
] as const;

export function ClassHubScreen({ audience }: { audience: 'student' | 'parent' }) {
  const nav = useNavigation<HubNav>();
  const { role } = useAuth();
  const isParent = audience === 'parent' || role === 'parent';
  const { childId } = useSelectedChild();
  const [step, setStep] = useState<Step>('class');
  const childrenQ = useChildren();
  const profileQ = useStudentProfile(isParent ? childId : undefined, isParent ? Boolean(childId) : true);
  const studentId = isParent ? childId || undefined : undefined;
  const subjectsQ = useSubjects(studentId);
  const examsQ = useExams(studentId);
  const homeworkQ = useHomework(studentId);

  const child = (childrenQ.data ?? []).find((row) => row.id === childId);
  const className = isParent
    ? profileQ.data?.classroom || child?.grade || 'Class'
    : profileQ.data?.classroom ||
      [profileQ.data?.grade, profileQ.data?.section].filter(Boolean).join(' · ') ||
      'My class';

  const waiting =
    (isParent && childrenQ.isLoading && childrenQ.data === undefined) ||
    (!isParent && profileQ.isLoading && profileQ.data === undefined);
  if (waiting) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Loading />
      </SafeAreaView>
    );
  }
  if (isParent && childrenQ.isError && childrenQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ErrorState onRetry={() => childrenQ.refetch()} />
      </SafeAreaView>
    );
  }
  if (isParent && (childrenQ.data ?? []).length === 0) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Class" showBack={false} />
        <Empty message="No children are linked to this account yet." />
      </SafeAreaView>
    );
  }

  const openAction = (key: (typeof ACTIONS)[number]['key']) => {
    if (key === 'attendance') {
      nav.navigate('Attendance');
      return;
    }
    if (key === 'grades') {
      nav.navigate('Grades', studentId ? { studentId } : undefined);
      return;
    }
    if (key === 'tests') {
      setStep('tests');
      return;
    }
    if (key === 'homework') {
      setStep('homework');
      return;
    }
    nav.navigate('ClassTimetable', studentId ? { studentId } : undefined);
  };

  const subjects = subjectsQ.data ?? [];
  const tests = examsForClassCatalog(examsQ.data ?? [], subjects);
  const homework = homeworkQ.data ?? [];
  const subjectName = (id: string) => subjects.find((subject) => subject.id === id)?.name || 'Subject';

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={step === 'class' ? undefined : className}
        title={step === 'tests' ? 'Tests' : step === 'homework' ? 'Homework' : step === 'menu' ? className : 'Class'}
        showBack={step !== 'class'}
        onBack={
          step === 'class'
            ? undefined
            : () => setStep(step === 'menu' ? 'class' : 'menu')
        }
      />
      {isParent && step === 'class' ? <KidSwitcher /> : null}
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={subjectsQ.isRefetching || examsQ.isRefetching || homeworkQ.isRefetching}
            onRefresh={() => {
              subjectsQ.refetch();
              examsQ.refetch();
              homeworkQ.refetch();
              if (isParent) childrenQ.refetch();
              else profileQ.refetch();
            }}
          />
        }
      >
        {step === 'class' ? (
          <Pressable
            onPress={() => setStep('menu')}
            style={({ pressed }) => [styles.classCard, pressed && { opacity: 0.9 }]}
          >
            <View style={styles.classIcon}>
              <Ionicons name="school" size={26} color={colors.white} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.classKicker}>{isParent ? child?.name || 'Child' : 'My class'}</Text>
              <Text style={styles.className}>{className}</Text>
              <Text style={styles.classMeta}>Attendance, grades, tests, homework, timetable</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.inkMuted} />
          </Pressable>
        ) : null}

        {step === 'menu' ? (
          <View style={styles.grid}>
            {ACTIONS.map((action) => (
              <Pressable
                key={action.key}
                onPress={() => openAction(action.key)}
                style={({ pressed }) => [styles.action, pressed && { opacity: 0.88 }]}
              >
                <Ionicons name={action.icon} size={26} color={action.color} />
                <Text style={styles.actionLabel}>{action.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        {step === 'tests' ? (
          tests.length === 0 ? (
            <Empty message="No tests for this class yet." />
          ) : (
            <View style={{ gap: 8 }}>
              {tests.map((exam) => (
                <View key={exam.id} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Pill tone={exam.status === 'upcoming' ? 'primary' : 'present'}>{exam.status}</Pill>
                    <Text style={styles.meta}>
                      {exam.date} · {exam.time}
                    </Text>
                  </View>
                  <Text style={styles.rowTitle}>{exam.title}</Text>
                  <Text style={styles.meta}>
                    {exam.subjectName || subjectName(exam.subjId)} · {exam.dur} · {exam.max} marks
                  </Text>
                </View>
              ))}
            </View>
          )
        ) : null}

        {step === 'homework' ? (
          homework.length === 0 ? (
            <Empty message="No homework for this class yet." />
          ) : (
            <View style={{ gap: 8 }}>
              {homework.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => nav.navigate('HomeworkDetail', { id: item.id, studentId })}
                  style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.88 }]}
                >
                  <View style={styles.rowTop}>
                    <Pill tone={item.status === 'graded' || item.status === 'submitted' ? 'present' : 'primary'}>
                      {item.status}
                    </Pill>
                    <Text style={styles.meta}>
                      {item.due}
                      {item.dueT ? ` · ${item.dueT}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.rowTitle}>{item.title}</Text>
                  <Text style={styles.meta}>{subjectName(item.subjId)}</Text>
                </Pressable>
              ))}
            </View>
          )
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: 18, paddingBottom: 28 },
  classCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.lg,
  },
  classIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classKicker: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.inkMuted },
  className: { fontFamily: fontFamily.extraBold, fontSize: 20, color: colors.ink, marginTop: 2 },
  classMeta: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.inkMuted, marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  action: {
    width: '31%',
    flexGrow: 1,
    minHeight: 96,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  actionLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink, textAlign: 'center' },
  rowCard: {
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
    gap: spacing.s,
  },
  rowTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  meta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted },
});
