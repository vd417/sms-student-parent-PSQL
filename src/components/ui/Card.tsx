import { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, shadow } from '@/theme';

type Props = {
  children: ReactNode;
  style?: ViewStyle | ViewStyle[];
  bordered?: boolean;
  elevated?: boolean;
};

export function Card({ children, style, bordered = true, elevated }: Props) {
  return (
    <View style={[styles.root, bordered && styles.bordered, elevated && shadow.card, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
  },
  bordered: {
    borderWidth: 1,
    borderColor: colors.rule,
  },
});
