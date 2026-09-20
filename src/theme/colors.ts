// School Desk — Student app palette.
// Primary / neutrals = classic iceberg.
// Subject boxes use the curated 6-colour set below.

export type AppColors = {
  primary: string;
  primaryDeep: string;
  primaryBright: string;
  primarySoft: string;
  primarySoft2: string;
  primaryInk: string;
  ink: string;
  ink2: string;
  ink3: string;
  inkMuted: string;
  inkSoft: string;
  rule: string;
  ruleSoft: string;
  paper: string;
  paper2: string;
  card: string;
  /** #FF0052 hot magenta */
  coral: string;
  coralSoft: string;
  coralTint: string;
  /** dark red */
  red: string;
  redSoft: string;
  redTint: string;
  /** dark yellow / gold */
  yellow: string;
  yellowSoft: string;
  yellowTint: string;
  /** #0D47A1 royal blue */
  blue: string;
  blueSoft: string;
  blueTint: string;
  /** #077A7D teal */
  teal: string;
  tealSoft: string;
  tealTint: string;
  /** alias → coral (fixtures) */
  pink: string;
  pinkSoft: string;
  pinkTint: string;
  /** #133458 steel navy */
  indigo: string;
  indigoSoft: string;
  indigoTint: string;
  /** #92003A burgundy */
  wine: string;
  wineSoft: string;
  wineTint: string;
  /** #0B1849 midnight */
  slate: string;
  slateSoft: string;
  slateTint: string;
  /** aliases for older fixtures / UI */
  amber: string;
  amberSoft: string;
  amberTint: string;
  mint: string;
  mintSoft: string;
  mintTint: string;
  violet: string;
  violetSoft: string;
  violetTint: string;
  orange: string;
  orangeSoft: string;
  orangeTint: string;
  forest: string;
  forestSoft: string;
  forestTint: string;
  plum: string;
  plumSoft: string;
  plumTint: string;
  present: string;
  presentSoft: string;
  absent: string;
  absentSoft: string;
  late: string;
  lateSoft: string;
  white: string;
  black: string;
};

export const colors: AppColors = {
  primary: '#0C4A6E',
  primaryDeep: '#082F49',
  primaryBright: '#0891B2',
  primarySoft: '#ECFEFF',
  primarySoft2: '#A5F3FC',
  primaryInk: '#0B0E1F',

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

  // Curated subject set (user palette)
  indigo: '#133458', // dark blue
  indigoSoft: '#D5DEE8',
  indigoTint: '#E8EEF4',
  blue: '#0D47A1', // blue
  blueSoft: '#D0DFF5',
  blueTint: '#E4EDFA',
  wine: '#C62828', // legacy → clear card red
  wineSoft: '#F7CCCC',
  wineTint: '#FBDDDD',
  slate: '#0B1849', // midnight dark blue
  slateSoft: '#D2D6E4',
  slateTint: '#E6E9F2',
  coral: '#FF0052',
  coralSoft: '#FFD0DE',
  coralTint: '#FFE6EE',
  red: '#C62828', // clear red — better on subject cards than muddy #980002
  redSoft: '#F7CCCC',
  redTint: '#FBDDDD',
  yellow: '#36656B',
  yellowSoft: '#D4E4E6',
  yellowTint: '#E6F0F1',
  teal: '#077A7D',
  tealSoft: '#CDE8E9',
  tealTint: '#E0F2F3',

  // Aliases
  pink: '#36656B',
  pinkSoft: '#D4E4E6',
  pinkTint: '#E6F0F1',
  amber: '#36656B',
  amberSoft: '#D4E4E6',
  amberTint: '#E6F0F1',
  mint: '#077A7D',
  mintSoft: '#CDE8E9',
  mintTint: '#E0F2F3',
  violet: '#C62828',
  violetSoft: '#F7CCCC',
  violetTint: '#FBDDDD',
  orange: '#C62828',
  orangeSoft: '#F7CCCC',
  orangeTint: '#FBDDDD',
  forest: '#077A7D',
  forestSoft: '#CDE8E9',
  forestTint: '#E0F2F3',
  plum: '#C62828',
  plumSoft: '#F7CCCC',
  plumTint: '#FBDDDD',

  present: '#2BA864',
  presentSoft: '#D4F0DE',
  absent: '#E8453E',
  absentSoft: '#FBD7D5',
  late: '#F2A93B',
  lateSoft: '#FBE3B7',

  white: '#FFFFFF',
  black: '#000000',
};

/** Subject box keys — the 6 curated hues (+ legacy aliases). */
export type SubjectHue =
  | 'indigo'
  | 'blue'
  | 'wine'
  | 'slate'
  | 'coral'
  | 'teal'
  | 'red'
  | 'yellow'
  | 'pink'
  | 'amber'
  | 'mint'
  | 'violet'
  | 'orange'
  | 'forest'
  | 'plum';

/** Prefer blue / red / yellow; no burgundy. */
const CANONICAL: SubjectHue[] = [
  'blue', // #0D47A1
  'red', // #C62828
  'yellow', // #36656B
  'indigo', // #133458 dark blue
  'slate', // #0B1849
  'teal', // #077A7D
  'coral', // #FF0052
];

const ALIAS: Record<string, SubjectHue> = {
  pink: 'yellow',
  amber: 'yellow',
  orange: 'red',
  mint: 'teal',
  forest: 'teal',
  violet: 'red',
  plum: 'red',
  wine: 'red',
};

/** Neon/light hues that need dark ink on cards (none in current set). */
export function isLightSubjectHue(_hue: SubjectHue): boolean {
  return false;
}

function asHue(hue: unknown): SubjectHue {
  if (typeof hue !== 'string') return 'blue';
  if (ALIAS[hue]) return ALIAS[hue];
  return (CANONICAL as readonly string[]).includes(hue) ? (hue as SubjectHue) : 'blue';
}

export function hueColor(hue: SubjectHue, variant: 'base' | 'soft' | 'tint' = 'base'): string {
  const key = asHue(hue);
  if (variant === 'soft') return colors[`${key}Soft` as keyof AppColors];
  if (variant === 'tint') return colors[`${key}Tint` as keyof AppColors];
  return colors[key];
}

export const primaryGradient: [string, string, string] = [
  colors.primaryBright,
  colors.primary,
  colors.primaryDeep,
];

export function hueForName(name: string): SubjectHue {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return CANONICAL[h % CANONICAL.length];
}
