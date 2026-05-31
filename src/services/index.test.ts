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

  test('exposes a school service in the mock registry', () => {
    const mock = buildServices('mock');
    expect(mock.school).toBeDefined();
    expect(typeof mock.school.getCurrent).toBe('function');
  });

  test('mock school.getCurrent resolves to the seeded school', async () => {
    const mock = buildServices('mock');
    const school = await mock.school.getCurrent();
    expect(school.name).toBe('Westbrook Academy');
    expect(school.id).toBe('sch-001');
  });
});
