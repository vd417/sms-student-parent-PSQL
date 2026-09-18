import { useContext, useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
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
