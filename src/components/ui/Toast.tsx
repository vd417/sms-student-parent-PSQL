import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, radius, shadow } from '@/theme';

type Props = {
  show: boolean;
  msg: string;
};

export function Toast({ show, msg }: Props) {
  const o = useRef(new Animated.Value(0)).current;
  const y = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(o, {
        toValue: show ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(y, {
        toValue: show ? 0 : 20,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [show, o, y]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { opacity: o, transform: [{ translateY: y }] }]}
    >
      <View style={[styles.toast, shadow.pop]}>
        <Ionicons name="checkmark-circle" size={18} color={colors.present} />
        <Text style={styles.msg}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: radius.pill,
  },
  msg: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.white,
  },
});
