import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getNetworkSnapshot, subscribeNetwork, type Connectivity } from '@/api/network';
import { colors, fontFamily } from '@/theme';

const BACK_ONLINE_MS = 2500;

export function OfflineBanner() {
  const insets = useSafeAreaInsets();
  const [status, setStatus] = useState<Connectivity>(getNetworkSnapshot().status);
  const [flashOnline, setFlashOnline] = useState(false);
  const prev = useRef(status);

  useEffect(() => subscribeNetwork((snap) => setStatus(snap.status)), []);

  useEffect(() => {
    if (prev.current !== 'online' && status === 'online') {
      setFlashOnline(true);
      const t = setTimeout(() => setFlashOnline(false), BACK_ONLINE_MS);
      prev.current = status;
      return () => clearTimeout(t);
    }
    prev.current = status;
  }, [status]);

  let text: string | null = null;
  let tone: 'warn' | 'info' | 'ok' = 'warn';
  if (status === 'offline') {
    text = "You're offline · Showing saved information";
    tone = 'warn';
  } else if (status === 'reconnecting') {
    text = 'Reconnecting...';
    tone = 'info';
  } else if (flashOnline) {
    text = 'Back online';
    tone = 'ok';
  }

  if (!text) return null;

  return (
    <View
      pointerEvents="none"
      style={[
        styles.bar,
        tone === 'warn' && styles.warn,
        tone === 'info' && styles.info,
        tone === 'ok' && styles.ok,
        { paddingTop: insets.top > 0 ? insets.top : 6 },
      ]}
    >
      <Text style={styles.text}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 50,
    paddingHorizontal: 16,
    paddingBottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warn: { backgroundColor: colors.ink },
  info: { backgroundColor: colors.primary },
  ok: { backgroundColor: colors.teal },
  text: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.white,
    textAlign: 'center',
  },
});
