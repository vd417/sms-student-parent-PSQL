import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ErrorState, IconButton, Loading, Empty, ScreenHeader } from '@/components/ui';
import { useDirectory } from '@/hooks/useDirectory';
import { useOpenThread } from '@/hooks/useMessaging';
import { useTimetable } from '@/hooks/useStudent';
import { useSubjects } from '@/hooks/useSubjects';
import { useToast } from '@/providers/ToastProvider';
import { compareTimetableBlocks, subjectShortCode } from '@/services/http/mappers';
import { colors, fontFamily, hueColor, radius, spacing, typography } from '@/theme';
import type { RootStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<RootStackParamList>;

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function ScheduleScreen() {
  const toast = useToast();
  const nav = useNavigation<Nav>();
  const teachersQ = useDirectory();
  const openThread = useOpenThread('student');
  const weekStart = startOfWeek(new Date());
  const todayKey = DAYS.includes(
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()] as (typeof DAYS)[number],
  )
    ? (['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][new Date().getDay()] as (typeof DAYS)[number])
    : 'Mon';
  const [day, setDay] = useState<(typeof DAYS)[number]>(todayKey);

  const timetableQ = useTimetable();
  const subjectsQ = useSubjects();

  useFocusEffect(
    useCallback(() => {
      void timetableQ.refetch();
    }, [timetableQ.refetch]),
  );

  const isLoading = timetableQ.isLoading;
  const isError = timetableQ.isError;
  const onRefresh = () => {
    timetableQ.refetch();
    subjectsQ.refetch();
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Timetable" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (isError) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Timetable" />
        <ErrorState onRetry={onRefresh} />
      </SafeAreaView>
    );
  }

  const slots = timetableQ.data ?? [];
  const subjects = subjectsQ.data ?? [];
  const fallbackSubject = {
    id: '',
    name: 'Subject',
    short: '—',
    teacher: '',
    avg: 0,
    trend: 0,
    color: 'blue' as const,
  };
  const subjectById = (id: string) => subjects.find((s) => s.id === id) ?? fallbackSubject;
  const openTeacherForBlock = (name: string, teacherId?: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const directory = teachersQ.data ?? [];
    const teacher = teacherId
      ? directory.find((t) => t.id === teacherId)
      : directory.find((t) => t.name.trim().toLowerCase() === trimmed.toLowerCase());
    openThread.mutate(
      { name: teacher?.name || trimmed, role: teacher?.subj || 'Teacher' },
      { onSuccess: (th) => nav.navigate('ChatThread', { id: th.id, name: th.name, role: th.role }) },
    );
  };
  const blocks = slots
    .filter((b) => b.day === day)
    .sort(compareTimetableBlocks);
  const monthLabel = weekStart.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={monthLabel}
        title="Timetable"
        right={<IconButton icon="calendar-outline" onPress={() => toast('Coming soon')} />}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={timetableQ.isRefetching} onRefresh={onRefresh} />}
      >

        <View style={styles.daysRow}>
          {DAYS.map((d, i) => {
            const on = day === d;
            return (
              <Pressable
                key={d}
                onPress={() => setDay(d)}
                style={({ pressed }) => [
                  styles.dayCell,
                  on ? styles.dayOn : styles.dayOff,
                  pressed && !on && { opacity: 0.7 },
                ]}
              >
                <Text style={[styles.dayLabel, { color: on ? colors.white : colors.ink }]}>
                  {d}
                </Text>
                <Text style={[styles.dayDate, { color: on ? colors.white : colors.ink }]}>
                  {new Date(weekStart.getTime() + i * 86400000).getDate()}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.eyebrow, { marginBottom: 10 }]}>
          {day} · {blocks.length} {blocks.length === 1 ? 'period' : 'periods'}
        </Text>

        <View style={{ gap: 10 }}>
          {blocks.length === 0 ? (
            <Empty message="No periods on the timetable for this day." />
          ) : (
            blocks.map((block, i) => {
            const sub = block.subjId ? subjectById(block.subjId) : null;
            const isBreak = block.kind === 'break';
            const short = isBreak ? null : subjectShortCode(block.label, sub?.short);
            const when =
              block.endT && block.t ? `${block.t}–${block.endT}` : block.t;
            return (
              <View key={`${block.t}-${i}`} style={styles.blockRow}>
                <View style={styles.timeCol}>
                  <Text style={styles.time}>{block.t}</Text>
                  <Text style={styles.dur}>{block.d} min</Text>
                </View>
                <View
                  style={[
                    styles.blockCard,
                    {
                      backgroundColor: isBreak
                        ? colors.ruleSoft
                        : sub
                          ? hueColor(sub.color, 'tint')
                          : colors.primarySoft,
                      borderColor: isBreak
                        ? colors.inkSoft
                        : sub
                          ? hueColor(sub.color)
                          : colors.primary,
                      borderStyle: isBreak ? 'dashed' : 'solid',
                      opacity: isBreak ? 0.75 : 1,
                    },
                  ]}
                >
                  <View style={styles.blockTop}>
                    <Text style={styles.blockTitle} numberOfLines={1}>
                      {block.label}
                    </Text>
                    {short ? (
                      <Text style={[styles.blockShort, { color: sub ? hueColor(sub.color) : colors.primary }]}>
                        {short}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.blockMeta} numberOfLines={2}>
                    {when}
                    {block.room ? ` · Room ${block.room}` : ''}
                    {!isBreak && block.teacher ? (
                      <Text
                        style={styles.teacherLink}
                        onPress={() => openTeacherForBlock(block.teacher as string, block.teacherId)}
                      >
                        {` · ${block.teacher}`}
                      </Text>
                    ) : null}
                    {isBreak ? ' · Break' : ''}
                  </Text>
                </View>
              </View>
            );
          })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { paddingHorizontal: spacing.l, paddingBottom: 24 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  kicker: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.inkMuted },
  daysRow: { flexDirection: 'row', gap: 8, marginVertical: 14 },
  dayCell: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  dayOn: { backgroundColor: colors.primary },
  dayOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  dayLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    opacity: 0.85,
  },
  dayDate: { fontFamily: fontFamily.extraBold, fontSize: 20, marginTop: 2 },
  blockRow: { flexDirection: 'row', gap: 10 },
  timeCol: { width: 58, alignItems: 'flex-end', paddingTop: 4 },
  time: {
    fontFamily: fontFamily.extraBold,
    fontSize: 12,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
  },
  dur: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
  blockCard: {
    flex: 1,
    minWidth: 0,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  blockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  blockTitle: {
    flex: 1,
    minWidth: 0,
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  blockShort: { fontFamily: fontFamily.bold, fontSize: 11, flexShrink: 0 },
  blockMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 4,
  },
  teacherLink: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
});
