/** Android already resizes the window; extra keyboard padding becomes a second overlay. */
export function keyboardLiftPadding(os: string, keyboardHeight: number): number {
  if (keyboardHeight <= 0) return 0;
  if (os === 'android') return 0;
  return keyboardHeight;
}

type ComposerPadInput = {
  keyboardOpen: boolean;
  safeBottom: number;
  tabBarConsumesInset: boolean;
  os: string;
};

/**
 * Bottom inset for the chat composer.
 * The tab bar already owns the system-nav inset while it is visible.
 * iOS keyboard lift owns the inset while typing. Never add a fixed extra gap.
 */
export function composerBottomPad({
  keyboardOpen,
  safeBottom,
  tabBarConsumesInset,
  os,
}: ComposerPadInput): number {
  const inset = Math.max(0, safeBottom);
  if (tabBarConsumesInset) return 0;
  if (keyboardOpen && os === 'ios') return 0;
  return inset;
}

export function isChatThreadRoute(name: string | undefined): boolean {
  return name === 'ChatThread';
}
