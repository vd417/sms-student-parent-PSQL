import { Pressable, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors, fontFamily, typography } from '@/theme';

type Props = {
  title: string;
  action?: { label: string; onPress?: () => void };
  style?: ViewStyle;
};

export function SectionHeader({ title, action, style }: Props) {
  return (
    <View style={[styles.row, style]}>
      <Text style={[typography.h2, styles.title]}>{title}</Text>
      {action ? (
        <Pressable
          onPress={action.onPress}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.action}>{action.label}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontFamily: fontFamily.extraBold },
  action: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
});
