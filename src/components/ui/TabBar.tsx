import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radius, useBrandColors } from '@/theme';

type Props<T extends string> = {
  tabs: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
};

export function TabBar<T extends string>({ tabs, value, onChange }: Props<T>) {
  useBrandColors();
  return (
    <View style={styles.row}>
      {tabs.map((t) => {
        const on = t.key === value;
        return (
          <Pressable
            key={t.key}
            onPress={() => onChange(t.key)}
            style={({ pressed }) => [
              styles.tab,
              on
                ? { backgroundColor: colors.primary }
                : styles.tabOff,
              pressed && !on && { opacity: 0.7 },
            ]}
          >
            <Text
              style={[styles.label, { color: on ? colors.white : colors.ink2 }]}
              numberOfLines={1}
            >
              {t.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6 },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
  },
  tabOff: {
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    textAlign: 'center',
  },
});
