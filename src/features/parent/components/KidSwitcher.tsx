import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, hueColor, radius } from '@/theme';

export function KidSwitcher() {
  const { data: children } = useChildren();
  const { childId, setChildId } = useSelectedChild();

  if (!children) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {children.map((c) => {
        const on = c.id === childId;
        return (
          <Pressable
            key={c.id}
            onPress={() => setChildId(c.id)}
            style={({ pressed }) => [
              styles.chip,
              on ? styles.chipOn : styles.chipOff,
              pressed && { opacity: 0.85 },
            ]}
          >
            <View style={[styles.avatar, { backgroundColor: hueColor(c.hue) }]}>
              <Text style={styles.avatarTxt}>{c.initials}</Text>
            </View>
            <View>
              <Text style={[styles.name, { color: on ? colors.white : colors.ink }]}>
                {c.name.split(' ')[0]}
              </Text>
              <Text style={[styles.grade, { color: on ? colors.white : colors.ink }]}>
                {c.grade.replace('Grade ', 'G')}
              </Text>
            </View>
            {c.unread > 0 && !on ? (
              <View style={styles.badge}>
                <Text style={styles.badgeTxt}>{c.unread}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <View style={styles.addChip}>
        <Ionicons name="add" size={18} color={colors.inkMuted} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 18, paddingBottom: 14 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 12,
    borderRadius: radius.pill,
  },
  chipOn: { backgroundColor: colors.primary },
  chipOff: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.rule },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarTxt: { fontFamily: fontFamily.extraBold, fontSize: 11, color: colors.white },
  name: { fontFamily: fontFamily.extraBold, fontSize: 12, letterSpacing: -0.1 },
  grade: { fontFamily: fontFamily.semiBold, fontSize: 9, opacity: 0.75 },
  badge: {
    backgroundColor: colors.coral,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeTxt: { fontFamily: fontFamily.extraBold, fontSize: 10, color: colors.white },
  addChip: {
    width: 38,
    height: 46,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.inkSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
