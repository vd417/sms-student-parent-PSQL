import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pill, type PillTone } from '@/components/ui';
import { colors, fontFamily, hueColor, radius } from '@/theme';
import type { Homework, Subject } from '@/models';
import { formatDueTime, homeworkDueChip } from '@/lib/homeworkDue';
import { useSubjects } from '@/hooks/useSubjects';
import { belongsToSubject } from '@/lib/belongsToSubject';

type Props = {
  homework: Homework;
  onPress?: () => void;
};

const FALLBACK_SUBJECT: Pick<Subject, 'short' | 'name' | 'color'> = {
  short: '—',
  name: 'Subject',
  color: 'blue',
};

function chipTone(kind: string): PillTone {
  if (kind === 'urgent') return 'absent';
  if (kind === 'soon') return 'late';
  if (kind === 'done') return 'present';
  return 'neutral';
}

export function HomeworkCard({ homework, onPress }: Props) {
  const { data: subjects } = useSubjects();
  const catalog = subjects ?? [];
  const sub =
    catalog.find((s) => belongsToSubject(homework, s, catalog)) ?? FALLBACK_SUBJECT;
  const dueTime = formatDueTime(homework.dueT);
  const chip = homeworkDueChip(homework);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.icon, { backgroundColor: hueColor(sub.color, 'tint') }]}>
        <Text style={[styles.iconTxt, { color: hueColor(sub.color) }]}>{sub.short}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {homework.title}
        </Text>
        <Text style={styles.meta} numberOfLines={1}>
          {[sub.name, dueTime].filter(Boolean).join(' · ')}
        </Text>
      </View>
      {chip ? (
        <View style={styles.chip}>
          <Pill tone={chipTone(chip.kind)}>{chip.label}</Pill>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    borderRadius: radius.lg,
  },
  icon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  iconTxt: { fontFamily: fontFamily.extraBold, fontSize: 13 },
  body: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
    letterSpacing: -0.1,
  },
  meta: {
    fontFamily: fontFamily.medium,
    fontSize: 11.5,
    color: colors.inkMuted,
    marginTop: 3,
  },
  chip: { flexShrink: 0, maxWidth: 110 },
});
