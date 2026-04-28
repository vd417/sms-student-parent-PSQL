import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, fontFamily } from '@/theme';

type Props = {
  value: number; // 0..100
  size?: number;
  thickness?: number;
  color?: string;
  trackColor?: string;
  label?: string;
};

export function Donut({
  value,
  size = 96,
  thickness = 10,
  color = colors.primary,
  trackColor = colors.ruleSoft,
  label,
}: Props) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  const offset = c * (1 - pct / 100);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>
        <Text style={[styles.value, { fontSize: size * 0.28, color }]}>{Math.round(pct)}%</Text>
        {label ? <Text style={styles.label}>{label}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center' },
  value: { fontFamily: fontFamily.extraBold, letterSpacing: -0.4 },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.inkMuted,
    marginTop: 2,
  },
});
