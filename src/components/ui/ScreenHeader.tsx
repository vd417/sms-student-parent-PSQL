import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { SchoolBadge } from './SchoolBadge';

type Props = {
  title?: string;
  kicker?: string;
  onBack?: () => void;
  right?: ReactNode;
  brand?: boolean;
};

export function ScreenHeader({ title, kicker, onBack, right, brand }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.center}>
          {brand ? (
            <SchoolBadge />
          ) : (
            <>
              {kicker ? <Text style={typography.eyebrow}>{kicker}</Text> : null}
              {title ? (
                <Text style={[typography.h1, styles.title]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.s,
    paddingBottom: spacing.m,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.rule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
  title: {
    fontFamily: fontFamily.extraBold,
    marginTop: 2,
  },
  right: { minWidth: 40, alignItems: 'flex-end' },
});
