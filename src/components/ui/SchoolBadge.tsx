import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { useSchool } from '@/hooks/useSchool';
import { schoolMarkCandidates } from '@/services/http/schoolMark';
import { monogramFromName } from './monogram';

type Props = {
  compact?: boolean;
  light?: boolean;
  /** Logo circle only — no school name text. */
  logoOnly?: boolean;
};

export function SchoolBadge({ compact = false, light = false, logoOnly = false }: Props) {
  const { data: school, isLoading } = useSchool();
  // logoUrl is already shrunk in getCurrent when needed; imageUrl is the cover fallback.
  const candidates = useMemo(
    () => schoolMarkCandidates(school?.logoUrl, school?.imageUrl),
    [school?.logoUrl, school?.imageUrl],
  );
  const [markIndex, setMarkIndex] = useState(0);

  useEffect(() => {
    setMarkIndex(0);
  }, [candidates.join('\0')]);

  const markUrl = candidates[markIndex] ?? '';
  const showImage = !!markUrl;
  const name = school
    ? compact && school.shortName
      ? school.shortName
      : school.name
    : '';
  const circleBg = light ? 'rgba(255,255,255,0.95)' : colors.primarySoft;
  const glyph = colors.primary;
  const mono = school ? monogramFromName(school.name) : '';

  return (
    <View style={[styles.row, logoOnly && styles.rowLogoOnly]}>
      <View
        style={[
          styles.logo,
          { backgroundColor: circleBg },
          light && styles.logoLightBorder,
          showImage && styles.logoOnImage,
        ]}
      >
        {isLoading ? (
          <View style={styles.skeleton} />
        ) : showImage ? (
          <Image
            key={markUrl.slice(0, 64)}
            source={{ uri: markUrl }}
            style={styles.img}
            resizeMode="contain"
            onError={() => {
              setMarkIndex((i) => (i + 1 < candidates.length ? i + 1 : candidates.length));
            }}
            accessibilityLabel={`${name || 'School'} logo`}
          />
        ) : school ? (
          <Text
            style={[
              styles.monogram,
              { color: glyph },
              mono.length > 2 && styles.monogramTight,
            ]}
          >
            {mono}
          </Text>
        ) : (
          <Ionicons name="school" size={18} color={glyph} />
        )}
      </View>
      {logoOnly ? null : (
        <Text
          style={[
            typography.bodyStrong,
            styles.name,
            light && { color: colors.white },
          ]}
          numberOfLines={1}
        >
          {isLoading ? 'Loading…' : name || 'School'}
        </Text>
      )}
    </View>
  );
}

const SIZE = 40;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, flexShrink: 1, maxWidth: '100%' },
  rowLogoOnly: { flexShrink: 0 },
  logo: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  logoOnImage: {
    backgroundColor: 'transparent',
  },
  logoLightBorder: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
  },
  // Prefer logo image fill; keep a light plate behind transparent PNGs.
  img: { width: SIZE, height: SIZE },
  skeleton: { width: SIZE * 0.45, height: SIZE * 0.45, borderRadius: 4, backgroundColor: colors.rule },
  monogram: { fontFamily: fontFamily.extraBold, fontSize: 13, letterSpacing: -0.2 },
  monogramTight: { fontSize: 10, letterSpacing: 0.2 },
  name: { flexShrink: 1 },
});
