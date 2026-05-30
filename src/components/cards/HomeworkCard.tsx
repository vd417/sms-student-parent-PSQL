import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Pill, type PillTone } from '@/components/ui';
import { colors, fontFamily, hueColor, radius } from '@/theme';
import type { Homework, Subject } from '@/models';
import { useSubjects } from '@/hooks/useSubjects';

type Props = {
  homework: Homework;
  onPress?: () => void;
};

const FALLBACK_SUBJECT: Pick<Subject, 'short' | 'name' | 'color'> = {
  short: '—',
  name: 'Subject',
  color: 'blue',
};

export function HomeworkCard({ homework, onPress }: Props) {
  const { data: subjects } = useSubjects();
  const sub = subjects?.find((s) => s.id === homework.subjId) ?? FALLBACK_SUBJECT;
  const tone: PillTone =
    homework.due === 'Today' ? 'absent' : homework.due === 'Tomorrow' ? 'late' : 'neutral';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.root, pressed && { opacity: 0.85 }]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: hueColor(sub.color, 'tint') },
        ]}
      >
        <Text style={[styles.iconTxt, { color: hueColor(sub.color) }]}>{sub.short}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          {homework.title}
        </Text>
        <Text style={styles.meta}>
          {sub.name} · {homework.dueT}
        </Text>
      </View>
      <Pill tone={tone}>{homework.due}</Pill>
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
  },
  iconTxt: { fontFamily: fontFamily.extraBold, fontSize: 13 },
  body: { flex: 1 },
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
});
