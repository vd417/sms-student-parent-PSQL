import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, radius } from '@/theme';

export function BookMeetingBanner({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.banner, pressed && { opacity: 0.88 }]}
      accessibilityRole="button"
      accessibilityLabel="Book a meeting"
    >
      <View style={styles.icon}>
        <Ionicons name="calendar" size={18} color={colors.white} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>Book a meeting</Text>
        <Text style={styles.meta}>PTM timetable with this class</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.primary} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 14,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.md,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: { fontFamily: fontFamily.extraBold, fontSize: 13, color: colors.primary },
  meta: { fontFamily: fontFamily.medium, fontSize: 11, color: colors.ink2, marginTop: 2 },
});
