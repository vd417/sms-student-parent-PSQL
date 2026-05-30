// School Desk — Student app palette (iceberg theme).
// Derived from the design source `tokens.css`, with the student-specific
// "iceberg" preset applied (deep teal/aqua primary).

export const colors = {
  // Primary — iceberg
  primary: '#0C4A6E',
  primaryDeep: '#082F49',
  primaryBright: '#0891B2',
  primarySoft: '#ECFEFF',
  primarySoft2: '#A5F3FC',
  primaryInk: '#0B0E1F',

  // Neutrals
  ink: '#0F1B3D',
  ink2: '#1F2D54',
  ink3: '#3F4A70',
  inkMuted: '#7C849C',
  inkSoft: '#B6BCCD',
  rule: '#E6E9F1',
  ruleSoft: '#F2F4F9',
  paper: '#FBFBFD',
  paper2: '#F2F4F9',
  card: '#FFFFFF',

  // Subject accents (vivid set, with tint/soft variants)
  coral: '#FF5470',
  coralSoft: '#FBD9CF',
  coralTint: '#FFE4EA',
  blue: '#3D5AFE',
  blueSoft: '#C8DAFA',
  blueTint: '#DCE2FB',
  teal: '#00D4A8',
  tealSoft: '#BFEAE5',
  tealTint: '#D6F4EC',
  pink: '#FFB800',
  pinkSoft: '#F8E6C9',
  pinkTint: '#FBF0DC',
  amber: '#F2A93B',
  amberSoft: '#FBE3B7',
  amberTint: '#FDF1D9',
  mint: '#6FCB7A',
  mintSoft: '#CFEBC9',
  mintTint: '#E2F3DE',

  // Status
  present: '#2BA864',
  presentSoft: '#D4F0DE',
  absent: '#E8453E',
  absentSoft: '#FBD7D5',
  late: '#F2A93B',
  lateSoft: '#FBE3B7',

  white: '#FFFFFF',
  black: '#000000',
} as const;

// Subject color keys used throughout the app (matches `data.subjects[].color`).
export type SubjectHue = 'coral' | 'blue' | 'teal' | 'pink' | 'amber' | 'mint';

export function hueColor(hue: SubjectHue, variant: 'base' | 'soft' | 'tint' = 'base'): string {
  if (variant === 'soft') return colors[`${hue}Soft` as keyof typeof colors] as string;
  if (variant === 'tint') return colors[`${hue}Tint` as keyof typeof colors] as string;
  return colors[hue];
}

// Linear gradient stops for the primary brand gradient.
export const primaryGradient = [colors.primaryBright, colors.primary, colors.primaryDeep];

// Deterministic subject-hue picker for names (avatars, etc.).
const HUES: SubjectHue[] = ['coral', 'blue', 'teal', 'pink', 'amber', 'mint'];

export function hueForName(name: string): SubjectHue {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}
