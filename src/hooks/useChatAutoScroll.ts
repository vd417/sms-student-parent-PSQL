import { useEffect, useRef } from 'react';
import { Keyboard, Platform, type ScrollView } from 'react-native';

/** Live chat stays pinned to the latest message as new ones arrive. */
export function useChatAutoScroll(lastMessageKey: string) {
  const scrollRef = useRef<ScrollView>(null);

  const scrollToLatest = (animated: boolean) => {
    scrollRef.current?.scrollToEnd({ animated });
  };

  useEffect(() => {
    if (!lastMessageKey) return;
    const frame = requestAnimationFrame(() => scrollToLatest(true));
    const timer = setTimeout(() => scrollToLatest(false), 80);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
    };
  }, [lastMessageKey]);

  useEffect(() => {
    const evt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const sub = Keyboard.addListener(evt, () => scrollToLatest(false));
    return () => sub.remove();
  }, []);

  return {
    scrollRef,
    onContentSizeChange: () => scrollToLatest(false),
  };
}
