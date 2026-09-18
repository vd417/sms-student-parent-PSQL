import { composerBottomPad, isChatThreadRoute, keyboardLiftPadding } from '../keyboardLift';

describe('keyboardLiftPadding', () => {
  it('does not double-lift Android after window resize', () => {
    expect(keyboardLiftPadding('android', 320)).toBe(0);
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

  it('keeps Android composer above 3-button nav while the keyboard is open and the tab bar is hidden', () => {
    expect(
      composerBottomPad({ keyboardOpen: true, safeBottom: 48, tabBarConsumesInset: false, os: 'android' }),
    ).toBe(48);
  });

  it('does not add a second iOS gap on top of keyboard lift', () => {
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
