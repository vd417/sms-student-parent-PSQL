export type IdentifierKind = 'email' | 'phone' | 'admissionId';

// Mirrors the backend's IdentifierClassifier so client-side field selection
// and server-side lookup always agree.
export function classifyIdentifier(value: string): IdentifierKind {
  const v = value.trim();
  if (v.includes('@')) return 'email';
  if (/[a-zA-Z]/.test(v) || v.includes('/')) return 'admissionId';

  const digits = v.replace(/\D/g, '');
  const hasOnlyPhonePunctuation = /^[\d\s+()-]+$/.test(v);
  if (hasOnlyPhonePunctuation && digits.length >= 7 && digits.length <= 15) return 'phone';

  return 'admissionId';
}

/** Normalize for API calls — emails lowercased so lookup matches roster/Users. */
export function normalizeLoginIdentifier(value: string): string {
  const v = value.trim();
  if (classifyIdentifier(v) === 'email') return v.toLowerCase();
  return v;
}

// Accepts an email or a 7–15 digit phone number (formatting characters allowed).
export function isEmailOrPhone(value: string): boolean {
  const v = value.trim();
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  return classifyIdentifier(v) === 'phone';
}
