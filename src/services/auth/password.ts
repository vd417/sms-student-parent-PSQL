// Shared password policy: min 8 chars, must contain letters AND digits.
// Used server-side (mock setPassword) and client-side (LoginScreen).
export const PASSWORD_RULE_TEXT = 'At least 8 characters, including letters and numbers.';

export function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
