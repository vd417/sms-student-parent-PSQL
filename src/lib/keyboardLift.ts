/**
 * With edgeToEdgeEnabled (Android 15 / SDK 54+), the window no longer
 * auto-resizes for windowSoftInputMode="adjustResize", so Android needs the
 * same manual keyboard-height lift as iOS/web.
 */
export function keyboardLiftPadding(_os: string, keyboardHeight: number): number {
  return Math.max(0, keyboardHeight);
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
 * The keyboard-height lift owns the inset while typing (all platforms, since
 * Android no longer auto-resizes with edgeToEdgeEnabled). Never add a fixed
 * extra gap on top of that lift.
 */
export function composerBottomPad({
  keyboardOpen,
  safeBottom,
  tabBarConsumesInset,
}: ComposerPadInput): number {
  const inset = Math.max(0, safeBottom);
  if (tabBarConsumesInset) return 0;
  if (keyboardOpen) return 0;
  return inset;
}

export function isChatThreadRoute(name: string | undefined): boolean {
  return name === 'ChatThread';
}
