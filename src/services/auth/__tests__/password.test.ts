import { isStrongPassword, PASSWORD_RULE_TEXT } from '@/services/auth/password';

describe('isStrongPassword', () => {
  it('accepts 8+ chars with letters and digits', () => {
    expect(isStrongPassword('secret12')).toBe(true);
  });
  it('rejects under 8 chars', () => {
    expect(isStrongPassword('ab1')).toBe(false);
  });
  it('rejects letters-only', () => {
    expect(isStrongPassword('abcdefgh')).toBe(false);
  });
  it('rejects digits-only', () => {
    expect(isStrongPassword('12345678')).toBe(false);
  });
  it('exposes human-readable rule text', () => {
    expect(PASSWORD_RULE_TEXT).toMatch(/8/);
  });
});
