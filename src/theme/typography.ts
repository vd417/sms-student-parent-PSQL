import { TextStyle } from 'react-native';
import { colors } from './colors';

export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semiBold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extraBold: 'PlusJakartaSans_800ExtraBold',
} as const;

export const typography = {
  display: {
    fontFamily: fontFamily.extraBold,
    letterSpacing: -0.4,
    color: colors.ink,
  } satisfies TextStyle,
  displayLg: {
    fontFamily: fontFamily.extraBold,
    fontSize: 36,
    letterSpacing: -0.7,
    color: colors.ink,
  } satisfies TextStyle,
  h1: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    letterSpacing: -0.4,
    color: colors.ink,
  } satisfies TextStyle,
  h2: {
    fontFamily: fontFamily.bold,
    fontSize: 18,
    letterSpacing: -0.2,
    color: colors.ink,
  } satisfies TextStyle,
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 14,
    color: colors.ink2,
  } satisfies TextStyle,
  bodyStrong: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.ink,
  } satisfies TextStyle,
  small: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.inkMuted,
  } satisfies TextStyle,
  eyebrow: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: colors.inkMuted,
  } satisfies TextStyle,
  numDisplay: {
    fontFamily: fontFamily.extraBold,
    letterSpacing: -0.4,
    fontVariant: ['tabular-nums'],
    color: colors.ink,
  } satisfies TextStyle,
};
