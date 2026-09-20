import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, colorSetForHue, fontFamily, isLightSubjectHue, radius } from '@/theme';
import type { Subject } from '@/models';

type Props = {
  subject: Subject;
  onPress?: () => void;
};

export function SubjectCard({ subject, onPress }: Props) {
  const cs = colorSetForHue(subject.color);
  const light = isLightSubjectHue(subject.color);
  const ink = light ? colors.ink : colors.white;
  const inkMuted = light ? 'rgba(15,27,61,0.75)' : 'rgba(255,255,255,0.9)';
  const chipBg = light ? 'rgba(15,27,61,0.12)' : 'rgba(255,255,255,0.22)';
  const hasAvg = subject.avg > 0;
  const trend =
    subject.trend > 0
      ? `↑ ${subject.trend}%`
      : subject.trend < 0
        ? `↓ ${Math.abs(subject.trend)}%`
        : null;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { backgroundColor: cs.color },
        pressed && { opacity: 0.88 },
      ]}
    >
      {hasAvg ? (
        <View style={[styles.badge, { backgroundColor: chipBg }]}>
          <Text style={[styles.badgeTxt, { color: ink }]}>{subject.avg}%</Text>
        </View>
      ) : null}
      <Text style={[styles.name, { color: ink, paddingRight: hasAvg ? 44 : 0 }]} numberOfLines={2}>
        {subject.name}
      </Text>
      {subject.teacher ? (
        <Text style={[styles.teacher, { color: inkMuted }]} numberOfLines={1}>
          {subject.teacher}
        </Text>
      ) : null}
      {trend ? (
        <View style={[styles.trend, { backgroundColor: chipBg }]}>
          <Text style={[styles.trendTxt, { color: ink }]}>{trend}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: 14,
    paddingHorizontal: 14,
    minHeight: 120,
    overflow: 'hidden',
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 10,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    letterSpacing: -0.2,
    marginTop: 6,
  },
  teacher: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    marginTop: 2,
  },
  trend: {
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    alignSelf: 'flex-start',
  },
  trendTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
  },
});
