import { colors, primaryGradient } from './colors';

export type BrandPalette = {
  primary: string;
  primaryDeep: string;
  primaryBright: string;
  primarySoft: string;
  primarySoft2: string;
};

/** Stable 32-bit hash for school identity → unique hue. */
export function hashSeed(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function hslToHex(h: number, s: number, l: number): string {
  const hh = ((h % 360) + 360) % 360;
  const ss = Math.min(100, Math.max(0, s)) / 100;
  const ll = Math.min(100, Math.max(0, l)) / 100;
  const c = (1 - Math.abs(2 * ll - 1)) * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = ll - c / 2;
  let r = 0;
  let g = 0;
  let b = 0;
  if (hh < 60) [r, g, b] = [c, x, 0];
  else if (hh < 120) [r, g, b] = [x, c, 0];
  else if (hh < 180) [r, g, b] = [0, c, x];
  else if (hh < 240) [r, g, b] = [0, x, c];
  else if (hh < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`.toUpperCase();
}

/**
 * Dark, school-unique brand. Avoids washed pastel / purple-default looks —
 * deep saturated primaries that stay sharp on white paper.
 */
export function deriveBrandPalette(seed: string): BrandPalette {
  const h = hashSeed((seed || 'school').trim().toLowerCase() || 'school');
  // Curated dark-friendly hues (navy, teal, forest, slate, wine, ocean…)
  const hues = [208, 198, 172, 222, 348, 18, 156, 234, 188, 262];
  const hue = hues[h % hues.length] + (h % 7) - 3;
  const sat = 58 + (h % 12);
  return {
    primaryBright: hslToHex(hue, sat + 6, 42),
    primary: hslToHex(hue, sat, 28),
    primaryDeep: hslToHex(hue, sat + 4, 16),
    primarySoft: hslToHex(hue, 42, 96),
    primarySoft2: hslToHex(hue, 48, 86),
  };
}

/** Mutate the live theme tokens used across the app. */
export function applyBrandPalette(palette: BrandPalette): void {
  colors.primary = palette.primary;
  colors.primaryDeep = palette.primaryDeep;
  colors.primaryBright = palette.primaryBright;
  colors.primarySoft = palette.primarySoft;
  colors.primarySoft2 = palette.primarySoft2;
  primaryGradient[0] = palette.primaryBright;
  primaryGradient[1] = palette.primary;
  primaryGradient[2] = palette.primaryDeep;
}

export function brandSeedFromSchool(school: {
  id?: string;
  name?: string;
  shortName?: string;
} | null | undefined): string {
  return (school?.id || school?.shortName || school?.name || 'school').trim();
}
