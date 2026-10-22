import { Image, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, hueColor, type SubjectHue } from '@/theme';

type Props = {
  initials: string;
  size?: number;
  hue?: SubjectHue;
  photoUri?: string;
};

export function Avatar({ initials, size = 40, hue = 'teal', photoUri }: Props) {
  const radius = size / 2.7;
  return (
    <View
      style={[
        styles.root,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: hueColor(hue, 'tint'),
          borderColor: hueColor(hue, 'soft'),
        },
      ]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: radius }} />
      ) : (
        <Text
          style={[styles.txt, { color: hueColor(hue, 'base'), fontSize: Math.round(size * 0.36) }]}
        >
          {initials}
        </Text>
      )}
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
