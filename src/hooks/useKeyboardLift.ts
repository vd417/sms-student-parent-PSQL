import { useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { runOnJS, useAnimatedKeyboard, useAnimatedReaction } from 'react-native-reanimated';
import { composerBottomPad, keyboardLiftPadding } from '@/lib/keyboardLift';

type VisualViewportLike = {
  height: number;
  offsetTop: number;
  addEventListener: (type: string, listener: () => void) => void;
  removeEventListener: (type: string, listener: () => void) => void;
};

function webViewport(): VisualViewportLike | undefined {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  return (window as Window & { visualViewport?: VisualViewportLike }).visualViewport;
}

export function useKeyboardLift() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const keyboardClosed = useRef(false);

  const applyHeight = (height: number) => {
    if (keyboardClosed.current) {
      setKeyboardHeight(0);
      return;
    }
    setKeyboardHeight(height);
  };

  // Reanimated's keyboard tracker reads WindowInsets/keyboard-animation
  // callbacks directly. The legacy RN `Keyboard` module instead infers height
  // from the decorView resizing, which stays ~0 on Android once
  // edgeToEdgeEnabled stops the window from resizing for the keyboard.
  // Hide still has to win, so a late inset value cannot leave the form shifted.
  const keyboard = useAnimatedKeyboard();
  useAnimatedReaction(
    () => keyboard.height.value,
    (h, prev) => {
      if (h !== prev) runOnJS(applyHeight)(h);
    },
  );

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => {
      keyboardClosed.current = false;
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardClosed.current = true;
      setKeyboardHeight(0);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  useEffect(() => {
    const vv = webViewport();
    if (!vv) return;
    const sync = () => {
      const covered = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardHeight(covered);
    };
    vv.addEventListener('resize', sync);
    vv.addEventListener('scroll', sync);
    return () => {
      vv.removeEventListener('resize', sync);
      vv.removeEventListener('scroll', sync);
    };
  }, []);

  const keyboardOpen = keyboardHeight > 0;
  const tabBarConsumesInset = (tabBarHeight ?? 0) > 0 && !keyboardOpen;
  const lift = keyboardLiftPadding(Platform.OS, keyboardHeight);
  return {
    keyboardOpen,
    lift,
    composerPad: composerBottomPad({
      keyboardOpen,
      safeBottom: insets.bottom,
      tabBarConsumesInset,
      os: Platform.OS,
    }),
    headerPad: insets.top,
  };
}
