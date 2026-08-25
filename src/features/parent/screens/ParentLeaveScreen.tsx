import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button, Card, ScreenHeader, Toast } from '@/components/ui';
import { useSubmitLeave } from '@/hooks/useLeave';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, radius } from '@/theme';
import type { ParentStackParamList } from '@/navigation/types';

type Nav = NativeStackNavigationProp<ParentStackParamList>;

const REASONS = ['Sick', 'Family event', 'Travel', 'Medical', 'Other'];
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseIso(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatShort(s: string): string {
  return parseIso(s).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function schoolDaysBetween(fromIso: string, toIso: string): number {
  const from = parseIso(fromIso);
  const to = parseIso(toIso);
  let count = 0;
  const cur = new Date(from);
  while (cur <= to) {
    const wd = cur.getDay();
    if (wd !== 0 && wd !== 6) count += 1;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
}

function DateRangePicker({
  from,
  to,
  activeField,
  onChange,
}: {
  from: string | null;
  to: string | null;
  activeField: 'from' | 'to';
  onChange: (from: string | null, to: string | null) => void;
}) {
  const [monthCursor, setMonthCursor] = useState(() => {
    const base = from ? parseIso(from) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const year = monthCursor.getFullYear();
  const mo = monthCursor.getMonth();
  const daysInMonth = new Date(year, mo + 1, 0).getDate();
  const leadingBlanks = new Date(year, mo, 1).getDay();
  const cells: Array<{ day: number; iso: string } | null> = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      return { day, iso: isoDate(new Date(year, mo, day)) };
    }),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const onPickDay = (iso: string) => {
    if (activeField === 'from') {
      onChange(iso, to && iso > to ? null : to);
    } else if (from && iso < from) {
      onChange(iso, from);
    } else {
      onChange(from, iso);
    }
  };

  return (
    <View>
      <View style={styles.monthNavRow}>
        <Pressable
          onPress={() => setMonthCursor(new Date(year, mo - 1, 1))}
          hitSlop={8}
          style={styles.monthNavBtn}
        >
          <Ionicons name="chevron-back" size={16} color={colors.ink} />
        </Pressable>
        <Text style={styles.monthNavLabel}>
          {monthCursor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </Text>
        <Pressable
          onPress={() => setMonthCursor(new Date(year, mo + 1, 1))}
          hitSlop={8}
          style={styles.monthNavBtn}
        >
          <Ionicons name="chevron-forward" size={16} color={colors.ink} />
        </Pressable>
      </View>
      <View style={styles.gridWeekRow}>
        {WEEKDAY_SHORT.map((w) => (
          <Text key={w} style={styles.gridWeekLabel}>
            {w[0]}
          </Text>
        ))}
      </View>
      <View style={styles.gridWrap}>
        {cells.map((cell, i) => {
          if (!cell) return <View key={i} style={styles.gridCell} />;
          const isFrom = cell.iso === from;
          const isTo = cell.iso === to;
          const inRange = !!from && !!to && cell.iso > from && cell.iso < to;
          return (
            <Pressable key={i} style={styles.gridCell} onPress={() => onPickDay(cell.iso)}>
              <View
                style={[
                  styles.gridCellInner,
                  inRange && { backgroundColor: colors.primarySoft },
                  (isFrom || isTo) && { backgroundColor: colors.primary },
                ]}
              >
                <Text style={[styles.gridCellDay, (isFrom || isTo) && { color: colors.white }]}>
                  {cell.day}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function ParentLeaveScreen() {
  const nav = useNavigation<Nav>();
  const { childId } = useSelectedChild();
  const childrenQ = useChildren();
  const submitMut = useSubmitLeave(childId);

  const [reason, setReason] = useState('Family event');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [to, setTo] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<'from' | 'to' | null>(null);

  const child = childrenQ.data?.find((c) => c.id === childId);
  const daysNote =
    from && to
      ? `${schoolDaysBetween(from, to)} school day${schoolDaysBetween(from, to) === 1 ? '' : 's'}`
      : 'Pick a start and end date';

  const onSubmit = () => {
    if (!from) return;
    submitMut.mutate(
      { childId, from, to: to ?? from, reason, note },
      {
        onSuccess: () => {
          setToast(true);
          setTimeout(() => nav.goBack(), 1100);
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScreenHeader
        kicker={child?.name}
        title="Apply for leave"
      />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Card style={{ padding: 14 }}>
            <Text style={styles.eyebrow}>Dates</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>FROM</Text>
                <Pressable
                  onPress={() => setActiveField('from')}
                  style={[styles.dateBox, activeField === 'from' && styles.dateBoxActive]}
                >
                  <Text style={styles.dateTxt}>{from ? formatShort(from) : 'Select'}</Text>
                </Pressable>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>TO</Text>
                <Pressable
                  onPress={() => setActiveField('to')}
                  style={[styles.dateBox, activeField === 'to' && styles.dateBoxActive]}
                >
                  <Text style={styles.dateTxt}>{to ? formatShort(to) : from ? formatShort(from) : 'Select'}</Text>
                </Pressable>
              </View>
            </View>
            <Text style={styles.daysNote}>{daysNote}</Text>
          </Card>
        </View>

        <Modal
          visible={activeField !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setActiveField(null)}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setActiveField(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              {activeField ? (
                <DateRangePicker
                  from={from}
                  to={to}
                  activeField={activeField}
                  onChange={(f, t) => {
                    setFrom(f);
                    setTo(t);
                    setActiveField(null);
                  }}
                />
              ) : null}
            </Pressable>
          </Pressable>
        </Modal>

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>Reason</Text>
          <View style={styles.chips}>
            {REASONS.map((r) => {
              const on = reason === r;
              return (
                <Pressable
                  key={r}
                  onPress={() => setReason(r)}
                  style={[styles.chip, on ? styles.chipOn : styles.chipOff]}
                >
                  <Text style={[styles.chipTxt, { color: on ? colors.white : colors.ink2 }]}>
                    {r}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingBottom: 14 }}>
          <Text style={[styles.eyebrow, { marginBottom: 10 }]}>Note to school</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            placeholder="Let the school know why your child will be away…"
            style={styles.textarea}
            placeholderTextColor={colors.inkMuted}
          />
          <View style={styles.tip}>
            <Text style={styles.tipTxt}>Tip · attach a doctor&apos;s note if leave is medical</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.bar}>
        <Button variant="ghost" leading={<Ionicons name="attach" size={16} color={colors.ink} />}>
          Attach
        </Button>
        <View style={{ flex: 1 }}>
          <Button
            variant="primary"
            full
            loading={submitMut.isPending}
            disabled={!from}
            onPress={onSubmit}
          >
            Submit request
          </Button>
        </View>
      </View>

      <Toast show={toast} msg="Leave request sent" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  },
  fieldLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
    marginBottom: 6,
  },
  dateBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: colors.paper2,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dateBoxActive: { borderColor: colors.primary },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15,27,61,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    padding: 16,
  },
  dateTxt: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.ink },
  daysNote: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 10,
  },
  monthNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  monthNavBtn: { padding: 6 },
  monthNavLabel: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink },
  gridWeekRow: { flexDirection: 'row', marginBottom: 4 },
  gridWeekLabel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  gridWrap: { flexDirection: 'row', flexWrap: 'wrap' },
  gridCell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    padding: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellInner: {
    width: '100%',
    height: '100%',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridCellDay: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.ink },
  chips: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.pill },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  chipTxt: { fontFamily: fontFamily.bold, fontSize: 12 },
  textarea: {
    minHeight: 90,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.md,
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.ink,
    textAlignVertical: 'top',
    lineHeight: 20,
  },
  tip: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: colors.primarySoft,
  },
  tipTxt: { fontFamily: fontFamily.semiBold, fontSize: 11.5, color: colors.primary },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 22,
    backgroundColor: 'rgba(251,251,253,0.96)',
    borderTopWidth: 1,
    borderTopColor: colors.rule,
  },
});
