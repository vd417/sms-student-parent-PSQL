import { classifyIdentifier, isEmailOrPhone, normalizeLoginIdentifier } from '@/services/auth/identifier';

describe('classifyIdentifier', () => {
  it('classifies emails', () => {
    expect(classifyIdentifier('maya@wba.edu')).toBe('email');
  });
  it('classifies phone numbers regardless of formatting', () => {
    expect(classifyIdentifier('415 555 0142')).toBe('phone');
    expect(classifyIdentifier('+91 98765 43210')).toBe('phone');
  });
  it('classifies everything else as admission ID', () => {
    expect(classifyIdentifier('WBA-2024-1042')).toBe('admissionId');
    expect(classifyIdentifier('STU2024001')).toBe('admissionId');
    expect(classifyIdentifier('sccrdtb/STU/26/0002')).toBe('admissionId');
    expect(classifyIdentifier('sccrdtb/STU/26/0003')).toBe('admissionId');
  });
});

describe('normalizeLoginIdentifier', () => {
  it('lowercases emails', () => {
    expect(normalizeLoginIdentifier('  Maya@WBA.EDU ')).toBe('maya@wba.edu');
  });
  it('leaves admission IDs trimmed but cased', () => {
    expect(normalizeLoginIdentifier('  WBA-2024-1042 ')).toBe('WBA-2024-1042');
  });
});

describe('isEmailOrPhone', () => {
  it('accepts a valid email', () => {
    expect(isEmailOrPhone('maya@wba.edu')).toBe(true);
  });
  it('accepts a 7-15 digit phone number', () => {
    expect(isEmailOrPhone('4155550142')).toBe(true);
  });
  it('rejects an admission ID', () => {
    expect(isEmailOrPhone('WBA-2024-1042')).toBe(false);
  });
  it('rejects a malformed email', () => {
    expect(isEmailOrPhone('not-an-email@')).toBe(false);
  });
});
