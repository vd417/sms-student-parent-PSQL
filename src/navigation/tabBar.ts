import { colors, fontFamily } from '@/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const tabBarScreenOptions = {
  headerShown: false,
  tabBarHideOnKeyboard: true,
  tabBarActiveTintColor: colors.primary,
  tabBarInactiveTintColor: colors.inkMuted,
  tabBarLabelStyle: { fontFamily: fontFamily.bold, fontSize: 10 },
  tabBarItemStyle: { flex: 1 },
  // Do not set height, bottom, or paddingBottom here — those must come from live system insets.
  tabBarStyle: {
    backgroundColor: colors.white,
    borderTopColor: colors.rule,
  },
} as const;

/** Live Android/iOS system-nav insets for the existing bottom tab navigator. */
export function useTabSafeAreaInsets() {
  return useSafeAreaInsets();
}
