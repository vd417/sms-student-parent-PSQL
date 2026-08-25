import {
  pickSchoolMarkUrl,
  schoolMarkCandidates,
  ensurePaintableSchoolMark,
} from '@/services/http/schoolMark';

describe('schoolMarkCandidates', () => {
  it('always prefers school logo over school image', () => {
    const huge = `data:image/jpeg;base64,${'a'.repeat(360_000)}`;
    expect(schoolMarkCandidates(huge, 'https://cdn/cover.png')).toEqual([
      huge,
      'https://cdn/cover.png',
    ]);
    expect(pickSchoolMarkUrl(huge, 'https://cdn/cover.png')).toBe(huge);
  });

  it('falls back to school image when logo is missing', () => {
    expect(pickSchoolMarkUrl('', 'https://cdn/cover.png')).toBe('https://cdn/cover.png');
  });

  it('returns empty when neither is set', () => {
    expect(schoolMarkCandidates('', null)).toEqual([]);
  });
});

describe('ensurePaintableSchoolMark', () => {
  it('leaves small http(s) marks unchanged', async () => {
    await expect(ensurePaintableSchoolMark('https://cdn/logo.png')).resolves.toBe(
      'https://cdn/logo.png',
    );
  });

  it('leaves small data-URIs unchanged', async () => {
    const small = 'data:image/png;base64,aaa';
    await expect(ensurePaintableSchoolMark(small)).resolves.toBe(small);
  });
});
