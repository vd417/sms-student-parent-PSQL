import { pingHealth, setAuthToken } from '@/api/client';
import { buildServices } from '@/services';

// Live smoke runs only when LIVE_API is set, so CI without a backend stays green.
const live = process.env.LIVE_API ? describe : describe.skip;

describe('jest runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});

live('live /v1 smoke', () => {
  beforeAll(() => {
    if (process.env.LIVE_TOKEN) setAuthToken(process.env.LIVE_TOKEN);
  });

  it('health responds', async () => {
    expect(await pingHealth()).toBe(true);
  });

  it('subjects map to valid models', async () => {
    const s = buildServices('http');
    const subjects = await s.subjects.list();
    expect(Array.isArray(subjects)).toBe(true);
    if (subjects.length) expect(typeof subjects[0].name).toBe('string');
  });

  it('homework maps to valid models', async () => {
    const s = buildServices('http');
    const hw = await s.homework.list();
    expect(Array.isArray(hw)).toBe(true);
  });
});
