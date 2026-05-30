import type { HomeworkService } from '@/services/types';
import type { HomeworkStatus } from '@/models';
import { db } from './db';
import { withLatency } from './latency';

interface Opts { ms?: number; errorRate?: number }

export function homeworkMock(opts: Opts = {}): HomeworkService {
  return {
    list: () => withLatency(() => db.homework, opts),
    byId: (id) => withLatency(() => db.homework.find((h) => h.id === id), opts),
    setStatus: (id, status: HomeworkStatus) =>
      withLatency(() => {
        const hw = db.homework.find((h) => h.id === id);
        if (!hw) throw new Error(`Homework ${id} not found`);
        hw.status = status;
        return hw;
      }, opts),
    submit: (id) =>
      withLatency(() => {
        const hw = db.homework.find((h) => h.id === id);
        if (!hw) throw new Error(`Homework ${id} not found`);
        hw.status = 'submitted';
        return hw;
      }, opts),
  };
}
