import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, hueColor, type SubjectHue } from '@/theme';

type Props = {
  initials: string;
  size?: number;
  hue?: SubjectHue;
};

export function Avatar({ initials, size = 40, hue = 'teal' }: Props) {
  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: size / 2.7,
          backgroundColor: hueColor(hue, 'tint'),
          borderColor: hueColor(hue, 'soft'),
        },
      ]}
    >
      <Text
        style={[styles.txt, { color: hueColor(hue, 'base'), fontSize: Math.round(size * 0.36) }]}
      >
        {initials}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  txt: {
    fontFamily: fontFamily.extraBold,
    letterSpacing: -0.2,
    color: colors.ink,
  },
});
