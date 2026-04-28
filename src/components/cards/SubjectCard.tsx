import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, hueColor, radius } from '@/theme';
import type { Subject } from '@/data/sample';

type Props = {
  subject: Subject;
  onPress?: () => void;
};

export function SubjectCard({ subject, onPress }: Props) {
  const trend =
    subject.trend > 0
      ? `↑ ${subject.trend}%`
      : subject.trend < 0
        ? `↓ ${Math.abs(subject.trend)}%`
        : 'steady';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.root,
        { backgroundColor: hueColor(subject.color) },
        pressed && { opacity: 0.88 },
      ]}
    >
      <View style={styles.badge}>
        <Text style={styles.badgeTxt}>{subject.avg}%</Text>
      </View>
      <Text style={styles.name}>{subject.name}</Text>
      <Text style={styles.teacher}>{subject.teacher}</Text>
      <View style={styles.trend}>
        <Text style={styles.trendTxt}>{trend}</Text>
      </View>
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
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    color: colors.white,
    letterSpacing: 0.4,
  },
  name: {
    fontFamily: fontFamily.extraBold,
    fontSize: 17,
    color: colors.white,
    letterSpacing: -0.2,
    marginTop: 6,
  },
  teacher: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
  },
  trend: {
    marginTop: 14,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 100,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignSelf: 'flex-start',
  },
  trendTxt: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.white,
  },
});
