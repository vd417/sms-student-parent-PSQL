import type { SchoolService } from '../types';
import { db } from './db';
import { withLatency } from './latency';

interface Opts {
  ms?: number;
  errorRate?: number;
}

export function schoolMock(opts: Opts = {}): SchoolService {
  return {
    getCurrent: () => withLatency(() => db.school, opts),
  };
}
