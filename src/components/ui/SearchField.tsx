import { StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, radius } from '@/theme';

type Props = {
  placeholder?: string;
  value?: string;
  onChangeText?: (v: string) => void;
};

export function SearchField({ placeholder = 'Search', value, onChangeText }: Props) {
  return (
    <View style={styles.root}>
      <Ionicons name="search" size={16} color={colors.inkMuted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.inkMuted}
        style={styles.input}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    flex: 1,
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.ink,
    padding: 0,
  },
});
