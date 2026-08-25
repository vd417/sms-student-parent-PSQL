import { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily, radius, useBrandColors } from '@/theme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'white';
type Size = 'md' | 'lg';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  full?: boolean;
  disabled?: boolean;
  loading?: boolean;
  leading?: ReactNode;
  trailing?: ReactNode;
  style?: ViewStyle;
};

export function Button({
  children,
  onPress,
  variant = 'primary',
  size = 'md',
  full,
  disabled,
  loading,
  leading,
  trailing,
  style,
}: Props) {
  useBrandColors();
  const v = variantStyle(variant);
  const s = SIZES[size];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          height: s.h,
          paddingHorizontal: s.px,
          backgroundColor: v.bg,
          borderColor: v.border,
          borderWidth: v.borderWidth,
          width: full ? '100%' : undefined,
          opacity: disabled ? 0.5 : pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {leading}
        {loading ? (
          <ActivityIndicator color={v.fg} />
        ) : (
          <Text style={[styles.label, { color: v.fg, fontSize: s.fs }]}>{children}</Text>
        )}
        {trailing}
      </View>
    </Pressable>
  );
}

function variantStyle(variant: Variant) {
  switch (variant) {
    case 'secondary':
      return { bg: colors.primarySoft, fg: colors.primary, border: 'transparent', borderWidth: 0 };
    case 'ghost':
      return { bg: 'transparent', fg: colors.ink, border: colors.rule, borderWidth: 1 };
    case 'white':
      return { bg: colors.white, fg: colors.primary, border: 'transparent', borderWidth: 0 };
    default:
      return { bg: colors.primary, fg: colors.white, border: 'transparent', borderWidth: 0 };
  }
}

const SIZES: Record<Size, { h: number; px: number; fs: number }> = {
  md: { h: 44, px: 16, fs: 14 },
  lg: { h: 52, px: 20, fs: 16 },
};

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { fontFamily: fontFamily.bold },
});
