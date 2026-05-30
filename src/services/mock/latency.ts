import { ApiError } from '@/services/errors';
import { MOCK_ERROR_RATE, MOCK_LATENCY_MS } from '@/api/config';

interface Options {
  ms?: number;
  errorRate?: number;
}

export function withLatency<T>(
  value: T | (() => T),
  opts: Options = {},
): Promise<T> {
  const ms = opts.ms ?? MOCK_LATENCY_MS;
  const errorRate = opts.errorRate ?? MOCK_ERROR_RATE;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (errorRate > 0 && Math.random() < errorRate) {
        reject(new ApiError('Mock network error', 500));
        return;
      }
      const resolved = typeof value === 'function' ? (value as () => T)() : value;
      resolve(resolved);
    }, ms);
  });
}
