import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { useSchool } from '@/hooks/useSchool';
import { monogramFromName } from './monogram';

type Props = { compact?: boolean };

export function SchoolBadge({ compact = false }: Props) {
  const { data: school, isLoading } = useSchool();
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!school?.logoUrl && !imgFailed;
  const name = school ? (compact && school.shortName ? school.shortName : school.name) : '';

  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        {isLoading ? (
          <View style={styles.skeleton} />
        ) : showImage ? (
          <Image
            source={{ uri: school!.logoUrl }}
            style={styles.img}
            onError={() => setImgFailed(true)}
          />
        ) : school ? (
          <Text style={styles.monogram}>{monogramFromName(school.name)}</Text>
        ) : (
          <Ionicons name="school" size={18} color={colors.white} />
        )}
      </View>
      <Text style={[typography.bodyStrong, styles.name]} numberOfLines={1}>
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
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  skeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.rule },
  monogram: { color: colors.white, fontFamily: fontFamily.extraBold, fontSize: 14 },
  name: { flexShrink: 1 },
});
