export { colors, hueColor, hueForName, primaryGradient } from './colors';
export type { SubjectHue } from './colors';
export { fontFamily, typography } from './typography';

export const spacing = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 36,
  pill: 100,
} as const;

export const shadow = {
  card: {
    shadowColor: '#0F1B3D',
    shadowOpacity: 0.06,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  pop: {
    shadowColor: '#0F1B3D',
    shadowOpacity: 0.12,
    shadowRadius: 40,
    shadowOffset: { width: 0, height: 16 },
    elevation: 6,
  },
} as const;
