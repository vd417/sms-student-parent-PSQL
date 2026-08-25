import { maskEmail, maskPhone, maskDestination } from '@/services/auth/mask';

describe('maskEmail', () => {
  it('masks the local part', () => {
    expect(maskEmail('maya.patel@westbrook.edu')).toBe('m***@westbrook.edu');
  });
});

describe('maskPhone', () => {
  it('keeps the last 4 digits', () => {
    expect(maskPhone('+1 (415) 555-0142')).toBe('*******0142');
    expect(maskPhone('4155550142')).toBe('******0142');
  });
});

describe('maskDestination', () => {
  it('routes by channel', () => {
    expect(maskDestination('a@b.com', 'email')).toBe('a***@b.com');
    expect(maskDestination('4155550142', 'sms')).toBe('******0142');
  });
});
