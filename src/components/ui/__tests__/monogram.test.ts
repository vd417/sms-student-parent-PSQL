import { monogramFromName } from '../monogram';

describe('monogramFromName', () => {
  it('uses the first letter of the first two words', () => {
    expect(monogramFromName('Westbrook Academy')).toBe('WA');
  });
  it('uppercases a single-word name to its first letter', () => {
    expect(monogramFromName('westbrook')).toBe('W');
  });
  it('shows short school codes in full', () => {
    expect(monogramFromName('scc')).toBe('SCC');
  });
  it('returns "?" for an empty/whitespace name', () => {
    expect(monogramFromName('   ')).toBe('?');
  });
  it('ignores extra whitespace between words', () => {
    expect(monogramFromName('a   b   c')).toBe('AB');
  });
});
