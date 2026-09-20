import {
  ABUSIVE_TERMS,
  ABUSIVE_TERMS_BY_LANGUAGE,
  CHAT_SUPPORTS_IMAGE_UPLOAD,
  ENGLISH_SEXUAL_MODERATION_TERMS,
  HINDI_SEXUAL_MODERATION_TERMS,
  MODERATION_LANGUAGES,
  TOP_ABUSIVE_TERMS,
  containsAbusiveLanguage,
  normalizeForModeration,
  normalizeIndicForModeration,
  validateChatImage,
  validateChatMessage,
} from '../chatModeration';

test('normalizeForModeration handles leetspeak and repeated letters', () => {
  expect(normalizeForModeration('stuuupid')).toBe('stuupid');
  expect(normalizeForModeration('1d10t')).toBe('idiot');
});

test('containsAbusiveLanguage catches punctuation-split profanity', () => {
  expect(containsAbusiveLanguage('f-u-c-k')).toBe(true);
});

test('containsAbusiveLanguage blocks listed terms on word boundaries', () => {
  expect(containsAbusiveLanguage('You are stupid')).toBe(true);
  expect(containsAbusiveLanguage('class assignment')).toBe(false);
  expect(containsAbusiveLanguage('Please shut up now')).toBe(true);
});

test('validateChatMessage allows normal school messages', () => {
  expect(validateChatMessage('Homework is due tomorrow.')).toEqual({ ok: true });
  expect(validateChatMessage('See you in class.')).toEqual({ ok: true });
});

test('validateChatMessage blocks abusive language', () => {
  expect(validateChatMessage('you idiot')).toEqual({ ok: false, reason: 'abusive_language' });
});

test('abusive terms list is non-empty', () => {
  expect(ABUSIVE_TERMS.length).toBeGreaterThan(0);
});

test('covers ten languages with roughly two hundred terms', () => {
  expect(MODERATION_LANGUAGES).toHaveLength(10);
  expect(ABUSIVE_TERMS.length).toBeGreaterThanOrEqual(200);
  for (const lang of MODERATION_LANGUAGES) {
    expect(ABUSIVE_TERMS_BY_LANGUAGE[lang].length).toBeGreaterThan(5);
  }
});

test('top 100 abusive terms cover English Hindi and regional languages', () => {
  expect(TOP_ABUSIVE_TERMS).toHaveLength(100);
  expect(TOP_ABUSIVE_TERMS).toEqual(expect.arrayContaining(['fuck', 'chutiya', 'चूतिया', 'punda', 'lanja']));
});

test('containsAbusiveLanguage blocks Hindi romanized profanity', () => {
  expect(containsAbusiveLanguage('tu chutiya hai')).toBe(true);
  expect(containsAbusiveLanguage('namaste teacher')).toBe(false);
});

test('containsAbusiveLanguage blocks Hindi Devanagari script', () => {
  expect(containsAbusiveLanguage('तुम चूतिया हो')).toBe(true);
  expect(normalizeIndicForModeration('  चूतिया  ')).toBe('चूतिया');
});

test('containsAbusiveLanguage blocks Bhojpuri and Tamil samples', () => {
  expect(containsAbusiveLanguage('bhosdike')).toBe(true);
  expect(containsAbusiveLanguage('புண்டை')).toBe(true);
});

test('Hindi sexual nude and kiss terms list has two hundred entries', () => {
  expect(HINDI_SEXUAL_MODERATION_TERMS.length).toBeGreaterThanOrEqual(200);
});

test('containsAbusiveLanguage blocks Hindi sex nude and kiss chat', () => {
  expect(containsAbusiveLanguage('nangi photo bhej')).toBe(true);
  expect(containsAbusiveLanguage('kiss kar mujhe')).toBe(true);
  expect(containsAbusiveLanguage('sex chat karo')).toBe(true);
  expect(containsAbusiveLanguage('नंगी फोटो भेज')).toBe(true);
  expect(containsAbusiveLanguage('किस करो')).toBe(true);
  expect(containsAbusiveLanguage('homework submit karo')).toBe(false);
});

test('English sexual nude and kiss terms list has two hundred entries', () => {
  expect(ENGLISH_SEXUAL_MODERATION_TERMS.length).toBeGreaterThanOrEqual(200);
});

test('containsAbusiveLanguage blocks English sex nude and kiss chat', () => {
  expect(containsAbusiveLanguage('send me nudes')).toBe(true);
  expect(containsAbusiveLanguage('kiss me tonight')).toBe(true);
  expect(containsAbusiveLanguage('wanna have sex')).toBe(true);
  expect(containsAbusiveLanguage('nude photo please')).toBe(true);
  expect(containsAbusiveLanguage('see you in class tomorrow')).toBe(false);
});

test('validateChatImage accepts jpeg data URIs when upload is enabled', () => {
  expect(CHAT_SUPPORTS_IMAGE_UPLOAD).toBe(true);
  expect(validateChatImage('data:image/jpeg;base64,abc')).toEqual({ ok: true });
  expect(validateChatImage('file:///photo.pdf')).toEqual({ ok: false, reason: 'inappropriate_image' });
});
