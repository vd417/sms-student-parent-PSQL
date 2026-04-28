import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IconButton } from '@/components/ui';
import { subjectById, today } from '@/data/sample';
import { colors, fontFamily, hueColor, radius, spacing, typography } from '@/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] as const;

export function ScheduleScreen() {
  const [day, setDay] = useState<(typeof DAYS)[number]>('Fri');

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.kicker}>Week 17 · April 2026</Text>
            <Text style={[typography.h1, { marginTop: 2 }]}>Timetable</Text>
          </View>
          <IconButton icon="calendar-outline" />
        </View>

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
                  {21 + i}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text style={[typography.eyebrow, { marginBottom: 10 }]}>
          {day}, April {21 + DAYS.indexOf(day)} · {today.length} blocks
        </Text>

        <View style={{ gap: 10 }}>
          {today.map((block, i) => {
            const sub = block.subjId ? subjectById(block.subjId) : null;
            const isBreak = block.kind === 'break';
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
                    <Text style={styles.blockTitle}>{block.label}</Text>
                    {sub ? (
                      <Text style={[styles.blockShort, { color: hueColor(sub.color) }]}>
                        {sub.short}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.blockMeta}>
                    {block.room ? `Room ${block.room}` : ''}
                    {block.teacher ? ` · ${block.teacher}` : ''}
                    {isBreak ? 'Snack & rest' : ''}
                  </Text>
                </View>
              </View>
            );
          })}
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
  timeCol: { width: 50, alignItems: 'flex-end', paddingTop: 4 },
  time: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    fontVariant: ['tabular-nums'],
  },
  dur: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.inkMuted,
    marginTop: 2,
  },
  blockCard: {
    flex: 1,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1.5,
  },
  blockTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  blockTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  blockShort: { fontFamily: fontFamily.bold, fontSize: 11 },
  blockMeta: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 4,
  },
});
