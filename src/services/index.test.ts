import { buildServices } from './index';

describe('buildServices', () => {
  test('mock source wires real mock implementations', async () => {
    const s = buildServices('mock');
    const list = await s.homework.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('http source wires stubs that throw NotImplemented', () => {
    const s = buildServices('http');
    expect(() => s.homework.list()).toThrow(/Not implemented/);
  });
});
