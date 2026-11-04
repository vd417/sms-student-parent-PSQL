import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Empty, ErrorState, Loading, ScreenHeader } from '@/components/ui';
import { useTimetable } from '@/hooks/useStudent';
import { useAuth } from '@/providers/AuthProvider';
import { useSelectedChild } from '@/providers/ChildProvider';
import { compareTimetableBlocks } from '@/services/http/mappers';
import { colors, fontFamily, hueColor, hueForName, radius } from '@/theme';
import type { ParentStackParamList, RootStackParamList } from '@/navigation/types';
import type { TodayBlock } from '@/models';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const PERIOD_W = 72;
const DAY_W = 118;
const GAP = 6;

type Slot = TodayBlock & { day: string };
type RouteParams = RouteProp<RootStackParamList & ParentStackParamList, 'ClassTimetable'>;

function periodKey(slot: Slot): string {
  if (slot.period != null) return `p${slot.period}`;
  return `t${slot.t}`;
}

export function ClassTimetableScreen() {
  const route = useRoute<RouteParams>();
  const { role } = useAuth();
  const { childId } = useSelectedChild();
  const studentId = route.params?.studentId ?? (role === 'parent' ? childId || undefined : undefined);
  const timetableQ = useTimetable(studentId, role !== 'parent' || Boolean(studentId));
  const slots = (timetableQ.data ?? []) as Slot[];

  if (timetableQ.isLoading && timetableQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Timetable" />
        <Loading />
      </SafeAreaView>
    );
  }
  if (timetableQ.isError && timetableQ.data === undefined) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <ScreenHeader title="Timetable" />
        <ErrorState onRetry={() => timetableQ.refetch()} />
      </SafeAreaView>
    );
  }

  const periodOrder = [...new Map(slots.map((slot) => [periodKey(slot), slot])).values()].sort(
    compareTimetableBlocks,
  );

  const at = (day: string, key: string) =>
    slots.find((slot) => slot.day === day && periodKey(slot) === key) ?? null;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader kicker="Weekly schedule" title="Timetable" />
      {periodOrder.length === 0 ? (
        <Empty message="No timetable published for this class." />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hScroll}>
          <View>
            <View style={styles.row}>
              <View style={{ width: PERIOD_W }} />
              {DAYS.map((day) => (
                <View key={day} style={[styles.dayHead, { width: DAY_W }]}>
                  <Text style={styles.dayHeadText}>{day}</Text>
                </View>
              ))}
            </View>
            {periodOrder.map((period) => {
              const key = periodKey(period);
              const sample = slots.find((slot) => periodKey(slot) === key);
              const isBreak = sample?.kind === 'break';
              return (
                <View key={key} style={styles.row}>
                  <View style={[styles.periodCell, { width: PERIOD_W }]}>
                    <Text style={styles.periodNum}>
                      {sample?.period != null ? `P${sample.period}` : sample?.t}
                    </Text>
                    <Text style={styles.periodTime}>{sample?.t || '—'}</Text>
                    <Text style={styles.periodTime}>{sample?.endT || '—'}</Text>
                  </View>
                  {isBreak ? (
                    <View style={[styles.breakBand, { width: DAY_W * DAYS.length + GAP * (DAYS.length - 1) }]}>
                      <Ionicons name="time-outline" size={14} color={colors.inkMuted} />
                      <Text style={styles.breakText}>{sample?.label || 'Break'}</Text>
                    </View>
                  ) : (
                    DAYS.map((day) => {
                      const lesson = at(day, key);
                      if (!lesson || lesson.kind === 'break') {
                        return <View key={day} style={[styles.emptyCell, { width: DAY_W }]} />;
                      }
                      const hue = hueForName(lesson.label);
                      return (
                        <View
                          key={day}
                          style={[
                            styles.cell,
                            {
                              width: DAY_W,
                              backgroundColor: hueColor(hue, 'tint'),
                              borderColor: hueColor(hue),
                            },
                          ]}
                        >
                          <Text style={[styles.cellSubject, { color: hueColor(hue) }]} numberOfLines={2}>
                            {lesson.label}
                          </Text>
                          <Text style={styles.cellTime} numberOfLines={1}>
                            {lesson.t}
                            {lesson.endT ? `–${lesson.endT}` : ''}
                          </Text>
                          {lesson.teacher ? (
                            <Text style={styles.cellMeta} numberOfLines={1}>
                              {lesson.teacher}
                            </Text>
                          ) : null}
                          {lesson.room ? (
                            <Text style={styles.cellMeta} numberOfLines={1}>
                              {lesson.room}
                            </Text>
                          ) : null}
                        </View>
                      );
                    })
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  hScroll: { paddingHorizontal: 16, paddingBottom: 24 },
  row: { flexDirection: 'row', gap: GAP, marginBottom: GAP },
  dayHead: { alignItems: 'center', paddingVertical: 8 },
  dayHeadText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.inkMuted },
  periodCell: { alignItems: 'center', justifyContent: 'center' },
  periodNum: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.ink },
  periodTime: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.inkMuted },
  cell: {
    minHeight: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: 8,
    justifyContent: 'center',
    gap: 2,
  },
  cellSubject: { fontFamily: fontFamily.bold, fontSize: 12 },
  cellTime: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.ink },
  cellMeta: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.inkMuted },
  emptyCell: {
    minHeight: 78,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.ruleSoft,
    backgroundColor: colors.white,
  },
  breakBand: {
    minHeight: 42,
    borderRadius: radius.md,
    backgroundColor: colors.paper2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  breakText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.inkMuted },
});
