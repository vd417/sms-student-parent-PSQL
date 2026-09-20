/** Mask an email for display: a***@school.edu */
export function maskEmail(email: string): string {
  const v = email.trim();
  const at = v.indexOf('@');
  if (at <= 0) return '***';
  const local = v.slice(0, at);
  const domain = v.slice(at + 1);
  if (local.length <= 1) return `${local}***@${domain}`;
  return `${local[0]}***@${domain}`;
}

/** Mask a phone for display: ******0142 */
export function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${'*'.repeat(Math.max(4, digits.length - 4))}${digits.slice(-4)}`;
}

export function maskDestination(value: string, channel: 'sms' | 'email'): string {
  return channel === 'sms' ? maskPhone(value) : maskEmail(value);
}
