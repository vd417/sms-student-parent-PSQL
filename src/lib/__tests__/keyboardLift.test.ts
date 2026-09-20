import { composerBottomPad, isChatThreadRoute, keyboardLiftPadding } from '../keyboardLift';

describe('keyboardLiftPadding', () => {
  it('lifts Android by the keyboard height (edge-to-edge does not auto-resize)', () => {
    expect(keyboardLiftPadding('android', 320)).toBe(320);
  });

  it('lifts iOS and web by the keyboard height', () => {
    expect(keyboardLiftPadding('ios', 320)).toBe(320);
    expect(keyboardLiftPadding('web', 280)).toBe(280);
    expect(keyboardLiftPadding('ios', 0)).toBe(0);
  });
});

describe('composerBottomPad', () => {
  it('uses the live system-nav inset and never a fixed extra gap', () => {
    expect(
      composerBottomPad({ keyboardOpen: false, safeBottom: 48, tabBarConsumesInset: false, os: 'android' }),
    ).toBe(48);
    expect(
      composerBottomPad({ keyboardOpen: false, safeBottom: 0, tabBarConsumesInset: false, os: 'android' }),
    ).toBe(0);
  });

  it('does not double-apply the inset when the tab bar already owns it', () => {
    expect(
      composerBottomPad({ keyboardOpen: false, safeBottom: 48, tabBarConsumesInset: true, os: 'android' }),
    ).toBe(0);
  });

  it('does not add a second gap on top of keyboard lift on Android', () => {
    expect(
      composerBottomPad({ keyboardOpen: true, safeBottom: 48, tabBarConsumesInset: false, os: 'android' }),
    ).toBe(0);
  });

  it('does not add a second gap on top of keyboard lift on iOS', () => {
    expect(
      composerBottomPad({ keyboardOpen: true, safeBottom: 34, tabBarConsumesInset: false, os: 'ios' }),
    ).toBe(0);
  });
});

describe('isChatThreadRoute', () => {
  it('detects the live chat screen', () => {
    expect(isChatThreadRoute('ChatThread')).toBe(true);
    expect(isChatThreadRoute('InboxList')).toBe(false);
  });
});
