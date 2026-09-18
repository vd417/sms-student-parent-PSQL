import { StyleSheet, Text } from 'react-native';
import { colors, fontFamily } from '@/theme';

export function LastUpdated({ at }: { at?: number }) {
  if (!at) return null;
  const label = new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return <Text style={styles.text}>Last updated {label}</Text>;
}

const styles = StyleSheet.create({
  text: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.inkMuted,
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 2,
  },
});
