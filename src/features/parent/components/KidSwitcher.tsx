import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useChildren } from '@/hooks/useParent';
import { useSelectedChild } from '@/providers/ChildProvider';
import { colors, fontFamily, hueColor, radius } from '@/theme';

export const ALL_CHILDREN_ID = 'all';

type Props = {
  includeAll?: boolean;
  selectedId?: string;
  onSelect?: (id: string) => void;
};

export function KidSwitcher({ includeAll, selectedId, onSelect }: Props = {}) {
  const { data: children } = useChildren();
  const { childId, setChildId } = useSelectedChild();

  if (!children?.length) return null;

  const current = selectedId ?? childId;
  const showAll = Boolean(includeAll && children.length > 1);

  const pick = (id: string) => {
    if (onSelect) onSelect(id);
    if (id !== ALL_CHILDREN_ID) setChildId(id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {showAll ? (
        <Pressable
          onPress={() => pick(ALL_CHILDREN_ID)}
          style={({ pressed }) => [
            styles.chip,
            current === ALL_CHILDREN_ID ? styles.chipOn : styles.chipOff,
            pressed && { opacity: 0.85 },
          ]}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="people" size={14} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.name, { color: current === ALL_CHILDREN_ID ? colors.white : colors.ink }]}>
              All
            </Text>
            <Text style={[styles.grade, { color: current === ALL_CHILDREN_ID ? colors.white : colors.ink }]}>
              {children.length} kids
            </Text>
          </View>
        </Pressable>
      ) : null}
      {children.map((c) => {
        const on = c.id === current;
        return (
          <Pressable
            key={c.id}
            onPress={() => pick(c.id)}
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
                {(c.grade ?? '').replace('Grade ', 'G')}
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
      {includeAll ? null : (
        <View style={styles.addChip}>
          <Ionicons name="add" size={18} color={colors.inkMuted} />
        </View>
      )}
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
