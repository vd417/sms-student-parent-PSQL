import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily, radius } from '@/theme';

export type PillTone =
  | 'primary'
  | 'primary_solid'
  | 'present'
  | 'absent'
  | 'late'
  | 'teal'
  | 'neutral';

type Props = {
  children: ReactNode;
  tone?: PillTone;
  style?: ViewStyle;
};

const TONES: Record<PillTone, { bg: string; fg: string }> = {
  primary: { bg: colors.primarySoft, fg: colors.primary },
  primary_solid: { bg: colors.primary, fg: colors.white },
  present: { bg: colors.presentSoft, fg: colors.present },
  absent: { bg: colors.absentSoft, fg: colors.absent },
  late: { bg: colors.lateSoft, fg: colors.late },
  teal: { bg: colors.tealTint, fg: colors.teal },
  neutral: { bg: colors.ruleSoft, fg: colors.ink3 },
};

export function Pill({ children, tone = 'neutral', style }: Props) {
  const t = TONES[tone];
  return (
    <View style={[styles.root, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.txt, { color: t.fg }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 24,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignSelf: 'flex-start',
  },
  txt: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.1,
  },
});
