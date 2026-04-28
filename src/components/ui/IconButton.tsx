import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  size?: number;
  iconSize?: number;
  badge?: boolean;
  dark?: boolean;
  tint?: string;
};

export function IconButton({ icon, onPress, size = 40, iconSize, badge, dark, tint }: Props) {
  const fg = tint ?? (dark ? colors.white : colors.ink);
  const bg = dark ? 'rgba(255,255,255,0.18)' : colors.white;
  const border = dark ? 'rgba(255,255,255,0.25)' : colors.rule;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          borderColor: border,
          opacity: pressed ? 0.7 : 1,
        },
      ]}
    >
      <Ionicons name={icon} size={iconSize ?? Math.round(size * 0.45)} color={fg} />
      {badge ? <View style={styles.badge} /> : null}
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
});
