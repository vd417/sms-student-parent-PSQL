import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { SchoolBadge } from './SchoolBadge';

type Props = {
  title?: string;
  kicker?: string;
  onBack?: () => void;
  right?: ReactNode;
  brand?: boolean;
  /** Force the back button on/off. Default: only when the screen can go back. */
  showBack?: boolean;
};

export function ScreenHeader({ title, kicker, onBack, right, brand, showBack }: Props) {
  const nav = useNavigation();
  const state = nav.getState();
  const inTab = state?.type === 'tab';
  const canGoBack = !inTab && nav.canGoBack();
  const showBackButton = showBack ?? (onBack != null || canGoBack);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (nav.canGoBack()) nav.goBack();
  };

  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {showBackButton ? (
          <Pressable
            onPress={handleBack}
            hitSlop={8}
            style={({ pressed }) => [styles.round, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
        ) : null}
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
  round: {
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
  right: {
    minWidth: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
});
