import { withLatency } from './latency';

describe('withLatency', () => {
  test('resolves to the provided value', async () => {
    await expect(withLatency('x', { ms: 0, errorRate: 0 })).resolves.toBe('x');
  });

  test('rejects when errorRate is 1', async () => {
    await expect(withLatency('x', { ms: 0, errorRate: 1 })).rejects.toThrow();
  });

  test('supports lazy value factories', async () => {
    await expect(withLatency(() => 42, { ms: 0, errorRate: 0 })).resolves.toBe(42);
  });
});
