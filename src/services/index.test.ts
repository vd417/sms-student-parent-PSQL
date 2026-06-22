import { buildServices } from './index';
import { httpServices } from './http';

describe('buildServices', () => {
  test('mock source wires real mock implementations', async () => {
    const s = buildServices('mock');
    const list = await s.homework.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('http source wires real service implementations', () => {
    const s = buildServices('http');
    expect(typeof s.homework.list).toBe('function');
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

  test('http source routes backed domains to live and gap domains to mock', () => {
    const s = buildServices('http');
    // backed → identical reference to the http impl
    expect(s.auth).toBe(httpServices.auth);
    expect(s.homework).toBe(httpServices.homework);
    // student.getProfile is live, but the gap methods are NOT the http ones
    expect(s.student.getProfile).toBe(httpServices.student.getProfile);
    expect(s.student.getToday).not.toBe(httpServices.student.getToday);
    // fully-gap domains are not the http impls
    expect(s.ptm).not.toBe(httpServices.ptm);
    expect(s.school).not.toBe(httpServices.school);
  });
});
