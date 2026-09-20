import { ReactNode } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily, radius, useBrandColors } from '@/theme';

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

export function Pill({ children, tone = 'neutral', style }: Props) {
  useBrandColors();
  const t = toneStyle(tone);
  return (
    <View style={[styles.root, { backgroundColor: t.bg }, style]}>
      <Text style={[styles.txt, { color: t.fg }]} numberOfLines={1}>
        {children}
      </Text>
    </View>
  );
}

function toneStyle(tone: PillTone): { bg: string; fg: string } {
  switch (tone) {
    case 'primary':
      return { bg: colors.primarySoft, fg: colors.primary };
    case 'primary_solid':
      return { bg: colors.primary, fg: colors.white };
    case 'present':
      return { bg: colors.presentSoft, fg: colors.present };
    case 'absent':
      return { bg: colors.absentSoft, fg: colors.absent };
    case 'late':
      return { bg: colors.lateSoft, fg: colors.late };
    case 'teal':
      return { bg: colors.tealTint, fg: colors.teal };
    default:
      return { bg: colors.ruleSoft, fg: colors.ink3 };
  }
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
