import {
  ABUSIVE_TERMS,
  ABUSIVE_TERMS_BY_LANGUAGE,
  ENGLISH_SEXUAL_MODERATION_TERMS,
  HINDI_SEXUAL_MODERATION_TERMS,
  MODERATION_LANGUAGES,
  TOP_ABUSIVE_TERMS,
} from './chatAbusiveTerms';

export {
  ABUSIVE_TERMS,
  ABUSIVE_TERMS_BY_LANGUAGE,
  ENGLISH_SEXUAL_MODERATION_TERMS,
  HINDI_SEXUAL_MODERATION_TERMS,
  MODERATION_LANGUAGES,
  TOP_ABUSIVE_TERMS,
};

/** Shown when text or image content is blocked. */
export const CHAT_MODERATION_WARNING =
  'Inappropriate language or images are not allowed in school chat. Violations may result in a notice from your school.';

/** Chat supports image attachments (data URI or https URL). */
export const CHAT_SUPPORTS_IMAGE_UPLOAD = true;

export type ChatModerationReason = 'abusive_language' | 'inappropriate_image' | 'unsupported_image';

export type ChatModerationResult =
  | { ok: true }
  | { ok: false; reason: ChatModerationReason };

export class ChatModerationError extends Error {
  readonly reason: ChatModerationReason;

  constructor(reason: ChatModerationReason) {
    super(reason);
    this.name = 'ChatModerationError';
    this.reason = reason;
  }
}

const LEET_MAP: Record<string, string> = {
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '@': 'a',
  $: 's',
};

const INDIC_SCRIPT =
  /[\u0900-\u097F\u0980-\u09FF\u0A00-\u0A7F\u0A80-\u0AFF\u0B00-\u0B7F\u0B80-\u0BFF\u0C00-\u0C7F\u0600-\u06FF]/;

function isIndicTerm(term: string): boolean {
  return INDIC_SCRIPT.test(term);
}

/** Collapse spacing/punctuation tricks used to bypass filters (Latin / romanized chat). */
export function normalizeForModeration(text: string): string {
  let s = text.toLowerCase();
  for (const [from, to] of Object.entries(LEET_MAP)) {
    s = s.split(from).join(to);
  }
  return s
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/(.)\1{2,}/g, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalize Indic-script text while preserving letters (Hindi, Bhojpuri, Urdu, etc.). */
export function normalizeIndicForModeration(text: string): string {
  return text
    .normalize('NFKC')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[^\p{L}\p{M}\s]/gu, ' ')
    .replace(/(.)\1{2,}/gu, '$1$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function compactForModeration(text: string): string {
  return normalizeForModeration(text).replace(/\s+/g, '');
}

function matchLatinTerm(term: string, spaced: string, compact: string): boolean {
  const normalizedTerm = normalizeForModeration(term);
  if (!normalizedTerm) return false;
  if (normalizedTerm.includes(' ')) {
    return new RegExp(`\\b${escapeRegex(normalizedTerm)}\\b`, 'i').test(spaced);
  }
  return compact.includes(normalizedTerm.replace(/\s+/g, ''));
}

function matchIndicTerm(term: string, indic: string): boolean {
  const normalizedTerm = normalizeIndicForModeration(term).replace(/\s+/g, '');
  const compactIndic = indic.replace(/\s+/g, '');
  if (!normalizedTerm || !compactIndic) return false;
  return compactIndic.includes(normalizedTerm);
}

export function containsAbusiveLanguage(text: string): boolean {
  const spaced = normalizeForModeration(text);
  const compact = compactForModeration(text);
  const indic = normalizeIndicForModeration(text);
  if (!spaced && !compact && !indic) return false;
  return ABUSIVE_TERMS.some((term) =>
    isIndicTerm(term) ? matchIndicTerm(term, indic) : matchLatinTerm(term, spaced, compact)
  );
}

export function validateChatMessage(text: string): ChatModerationResult {
  if (containsAbusiveLanguage(text)) {
    return { ok: false, reason: 'abusive_language' };
  }
  return { ok: true };
}

const ALLOWED_IMAGE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function mimeFromDataUri(uri: string): string | null {
  const match = /^data:([^;]+);/i.exec(uri);
  return match?.[1]?.toLowerCase() ?? null;
}

function extensionFromUri(uri: string): string | null {
  const path = uri.split('?')[0] ?? uri;
  const dot = path.lastIndexOf('.');
  if (dot < 0) return null;
  return path.slice(dot + 1).toLowerCase();
}

const EXT_TO_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

/**
 * Client-side image gate for future chat attachments.
 * Reliable NSFW detection requires a server-side moderation API (not available today).
 */
export function validateChatImage(uri: string): ChatModerationResult {
  if (!CHAT_SUPPORTS_IMAGE_UPLOAD) {
    return { ok: false, reason: 'unsupported_image' };
  }

  const mime = mimeFromDataUri(uri) ?? EXT_TO_MIME[extensionFromUri(uri) ?? ''] ?? null;
  if (!mime || !ALLOWED_IMAGE_MIME.has(mime)) {
    return { ok: false, reason: 'inappropriate_image' };
  }

  // Placeholder until backend image moderation exists.
  return { ok: true };
}

export function assertChatMessageAllowed(text: string): void {
  const result = validateChatMessage(text);
  if (!result.ok) {
    throw new ChatModerationError(result.reason);
  }
}

export function assertChatImageAllowed(uri: string): void {
  const result = validateChatImage(uri);
  if (!result.ok) {
    throw new ChatModerationError(result.reason);
  }
}
