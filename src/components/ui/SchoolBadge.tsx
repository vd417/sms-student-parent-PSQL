import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { useSchool } from '@/hooks/useSchool';
import { monogramFromName } from './monogram';

type Props = { compact?: boolean; light?: boolean };

export function SchoolBadge({ compact = false, light = false }: Props) {
  const { data: school, isLoading } = useSchool();
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!school?.logoUrl && !imgFailed;
  const name = school ? (compact && school.shortName ? school.shortName : school.name) : '';
  const circleBg = light ? colors.white : colors.primary;
  const glyph = light ? colors.primary : colors.white;

  return (
    <View style={styles.row}>
      <View style={[styles.logo, { backgroundColor: circleBg }]}>
        {isLoading ? (
          <View style={styles.skeleton} />
        ) : showImage ? (
          <Image
            source={{ uri: school!.logoUrl }}
            style={styles.img}
            onError={() => setImgFailed(true)}
          />
        ) : school ? (
          <Text style={[styles.monogram, { color: glyph }]}>{monogramFromName(school.name)}</Text>
        ) : (
          <Ionicons name="school" size={18} color={glyph} />
        )}
      </View>
      <Text
        style={[typography.bodyStrong, styles.name, light && { color: colors.white }]}
        numberOfLines={1}
      >
        {isLoading ? 'Loading…' : name || 'School'}
      </Text>
    </View>
  );
}

const SIZE = 36;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, flexShrink: 1 },
  logo: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  skeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.rule },
  monogram: { fontFamily: fontFamily.extraBold, fontSize: 14 },
  name: { flexShrink: 1 },
});
