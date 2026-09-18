import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily } from '@/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  badge?: boolean | number;
  dark?: boolean;
  tint?: string;
  disabled?: boolean;
};

export function IconButton({ icon, onPress, size = 40, iconSize, badge, dark, tint, disabled }: Props) {
  const fg = tint ?? (dark ? colors.white : colors.ink);
  const bg = dark ? 'rgba(255,255,255,0.18)' : colors.white;
  const border = dark ? 'rgba(255,255,255,0.25)' : colors.rule;
  const count = typeof badge === 'number' ? badge : 0;
  const showDot = badge === true;
  const showCount = count > 0;
  const label = count > 99 ? '99+' : String(count);

  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor: border,
          opacity: disabled ? 0.45 : pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={iconSize ?? Math.round(size * 0.45)} color={fg} />
      {showCount ? (
        <View style={styles.countBadge}>
          <Text style={styles.countTxt}>{label}</Text>
        </View>
      ) : showDot ? (
        <View style={styles.badge} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  badge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.absent,
    borderWidth: 1.5,
    borderColor: colors.white,
  },
  countBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 4,
    borderRadius: 8,
    backgroundColor: colors.absent,
    borderWidth: 1.5,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countTxt: { fontFamily: fontFamily.extraBold, fontSize: 9, color: colors.white, lineHeight: 11 },
});
