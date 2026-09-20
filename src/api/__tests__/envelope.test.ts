import { unwrapData } from '@/api/envelope';

describe('unwrapData', () => {
  it('extracts data from the backend envelope', () => {
    expect(unwrapData<{ id: string }>({ data: { id: 'h1' } })).toEqual({ id: 'h1' });
  });

  it('throws when the envelope is missing', () => {
    expect(() => unwrapData({ id: 'h1' })).toThrow(/enveloped/);
  });
});
