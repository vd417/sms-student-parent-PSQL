import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Card, Pill } from '@/components/ui';
import { attendancePillTone, periodsForDate } from '@/lib/attendanceBySubject';
import { monthDayKey } from '@/lib/attendanceRange';
import { deriveTodayAttendance } from '@/lib/todayAttendance';
import { attendanceMonthCells } from '@/services/http/mappers';
import type { AttendanceDay, AttendanceKind, PeriodAttendanceEntry } from '@/models';
import { colors, fontFamily, radius } from '@/theme';

const TONES: Record<AttendanceKind, { bg: string; fg: string; border?: string }> = {
  present: { bg: colors.present, fg: colors.white },
  absent: { bg: colors.absent, fg: colors.white },
  late: { bg: colors.late, fg: colors.white },
  off: { bg: colors.ruleSoft, fg: colors.inkSoft },
  future: { bg: colors.white, fg: colors.inkSoft, border: colors.rule },
};

type Props = {
  now: Date;
  days: AttendanceDay[];
  periods: PeriodAttendanceEntry[];
  audience: 'parent' | 'student';
};

export function AttendanceMonthCard({ now, days, periods, audience }: Props) {
  const [selectedDay, setSelectedDay] = useState(now.getDate());
  const monthTitle = now.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const leadingDays = (new Date(now.getFullYear(), now.getMonth(), 1).getDay() + 6) % 7;
  const cells = attendanceMonthCells(now.getFullYear(), now.getMonth(), days);
  const selectedKey = monthDayKey(now.getFullYear(), now.getMonth(), selectedDay);
  const dayPeriods = periodsForDate(periods, selectedKey);
  const dayRoll = deriveTodayAttendance(dayPeriods.map((p) => p.status));
  const selectedKind = cells.find((c) => c.d === selectedDay)?.kind;
  const needsAttention = dayRoll === 'absent' || (dayRoll == null && selectedKind === 'absent');
  const allPresent = dayRoll === 'present' || (dayRoll == null && selectedKind === 'present');
  const selectedLabel = new Date(now.getFullYear(), now.getMonth(), selectedDay).toLocaleDateString(
    undefined,
    { weekday: 'short', day: 'numeric', month: 'short' },
  );

  return (
    <Card style={{ padding: 16 }}>
      <Text style={styles.monthTitle}>{monthTitle}</Text>
      <View style={styles.weekRow}>
        {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => (
          <Text key={i} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {Array.from({ length: leadingDays }, (_, i) => (
          <View key={`b${i}`} style={styles.cell} />
        ))}
        {cells.map(({ d, kind }) => {
          const tone = TONES[kind];
          const selected = d === selectedDay;
          return (
            <Pressable key={d} onPress={() => setSelectedDay(d)} style={styles.cell}>
              <View
                style={[
                  styles.dayCell,
                  {
                    backgroundColor: tone.bg,
                    borderWidth: selected ? 2 : tone.border ? 1 : 0,
                    borderColor: selected ? colors.ink : tone.border,
                  },
                ]}
              >
                <Text style={[styles.dayTxt, { color: tone.fg }]}>{d}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        {(
          [
            ['present', 'All present'],
            ['absent', 'Missed class'],
            ['late', 'Late'],
            ['off', 'Off'],
          ] as [AttendanceKind, string][]
        ).map(([kind, label]) => (
          <View key={kind} style={styles.legendItem}>
            <View
              style={[
                styles.legendDot,
                {
                  backgroundColor: TONES[kind].bg,
                  borderWidth: TONES[kind].border ? 1 : 0,
                  borderColor: TONES[kind].border,
                },
              ]}
            />
            <Text style={styles.legendTxt}>{label}</Text>
          </View>
        ))}
      </View>
      {needsAttention ? (
        <View style={styles.attention}>
          <Text style={styles.attentionTitle}>Needs attention</Text>
          <Text style={styles.attentionBody}>
            {audience === 'parent'
              ? `Missed a class on ${selectedLabel}. Please check with your child.`
              : `You missed a class on ${selectedLabel}.`}
          </Text>
        </View>
      ) : allPresent ? (
        <View style={styles.allPresentBanner}>
          <Text style={styles.allPresentTitle}>All classes present</Text>
          <Text style={styles.allPresentBody}>{selectedLabel}</Text>
        </View>
      ) : null}
      <Text style={styles.eyebrow}>
        {selectedLabel} · periods
      </Text>
      {dayPeriods.length === 0 ? (
        <Text style={styles.flagReason}>No period marks this day.</Text>
      ) : (
        dayPeriods.map((row) => {
          const tone = attendancePillTone(row.status);
          return (
            <View key={row.id} style={styles.flagRow}>
              <View
                style={[
                  styles.flagIcon,
                  {
                    backgroundColor:
                      tone === 'absent'
                        ? colors.absentSoft
                        : tone === 'present'
                          ? colors.presentSoft
                          : tone === 'late'
                            ? colors.lateSoft
                            : colors.primarySoft,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.flagIconTxt,
                    {
                      color:
                        tone === 'absent'
                          ? colors.absent
                          : tone === 'present'
                            ? colors.present
                            : tone === 'late'
                              ? colors.late
                              : colors.primary,
                    },
                  ]}
                >
                  P{row.period}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.flagDate}>{row.subject}</Text>
                <Text style={styles.flagReason}>Period {row.period}</Text>
              </View>
              <Pill tone={tone}>{row.status}</Pill>
            </View>
          );
        })
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  monthTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.ink,
    marginBottom: 14,
  },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.inkMuted,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, padding: 2 },
  dayCell: { flex: 1, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dayTxt: { fontFamily: fontFamily.bold, fontSize: 11 },
  legend: { flexDirection: 'row', gap: 12, marginTop: 14, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 3 },
  legendTxt: { fontFamily: fontFamily.semiBold, fontSize: 11, color: colors.inkMuted },
  attention: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.absentSoft,
  },
  attentionTitle: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.absent },
  attentionBody: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.absent, marginTop: 2 },
  allPresentBanner: {
    marginTop: 14,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.presentSoft,
  },
  allPresentTitle: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.present },
  allPresentBody: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.present, marginTop: 2 },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
    marginTop: 16,
    marginBottom: 8,
  },
  flagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
  },
  flagIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flagIconTxt: { fontFamily: fontFamily.extraBold, fontSize: 11, textTransform: 'uppercase' },
  flagDate: { fontFamily: fontFamily.bold, fontSize: 12.5, color: colors.ink },
  flagReason: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.inkMuted, marginTop: 2 },
});
