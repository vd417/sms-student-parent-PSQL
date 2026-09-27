import { parseRequiredKeys, requiredKeys } from './requiredKeys';

describe('parseRequiredKeys', () => {
  it('returns only non-optional property names per interface', () => {
    const map = parseRequiredKeys(`
      export interface ADTO { id: string; name?: string; 'quoted_key': number; n: string | null }
      interface BDTO { x: number }
    `);
    expect(map.get('ADTO')).toEqual(['id', 'quoted_key', 'n']);
    expect(map.get('BDTO')).toEqual(['x']);
  });
});

describe('requiredKeys', () => {
  it('reads the real app dtos.ts', () => {
    expect(requiredKeys('PTMMeetingDTO')).toEqual(
      ['id', 'date', 'time', 'teacher', 'subject', 'child', 'mode', 'status'],
    );
  });
  it('throws for an unknown interface', () => {
    expect(() => requiredKeys('NopeDTO')).toThrow('unknown DTO interface: NopeDTO');
  });
});
