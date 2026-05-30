import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  msg: {
    fontFamily: fontFamily.semiBold,
    color: colors.inkMuted,
    fontSize: 13,
    textAlign: 'center',
  },
});
