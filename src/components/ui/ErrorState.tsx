import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.msg}>{message ?? 'Something went wrong.'}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.btn}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  msg: { fontFamily: fontFamily.semiBold, color: colors.inkMuted, fontSize: 14, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  btnText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 13 },
});
