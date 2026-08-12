import type {
  AttendanceService,
  FeesService,
  LeaveService,
  ParentService,
  PTMService,
  TransportService,
} from '@/services/types';
import { db } from './db';
import { withLatency } from './latency';
import { attendanceFor } from './fixtures/parent';

interface Opts {
  ms?: number;
  errorRate?: number;
}
let leaveCounter = 0;

export function parentMock(opts: Opts = {}): ParentService {
  return {
    getProfile: () => withLatency(() => db.parent!, opts),
    children: () => withLatency(() => db.children!, opts),
    childToday: (childId) => withLatency(() => db.childToday![childId], opts),
  };
}

export function feesMock(opts: Opts = {}): FeesService {
  return {
    list: (_childId) => withLatency(() => db.fees!, opts), // single-child fee set in mock
    pay: (feeId) =>
      withLatency(() => {
        const fee = db.fees!.find((f) => f.id === feeId);
        if (!fee) throw new Error(`Fee ${feeId} not found`);
        fee.status = 'paid';
        fee.paidOn = 'today';
        fee.method = 'Visa •• 4421';
        return fee;
      }, opts),
  };
}

export function ptmMock(opts: Opts = {}): PTMService {
  return {
    list: () => withLatency(() => db.ptm!, opts),
    setStatus: (id, status) =>
      withLatency(() => {
        const m = db.ptm!.find((x) => x.id === id);
        if (!m) throw new Error(`PTM ${id} not found`);
        m.status = status;
        return m;
      }, opts),
  };
}

export function transportMock(opts: Opts = {}): TransportService {
  return { forChild: (_childId) => withLatency(() => db.transport!, opts) };
}

export function attendanceMock(opts: Opts = {}): AttendanceService {
  return {
    month: (childId) => withLatency(() => attendanceFor(childId), opts),
    today: () => withLatency(() => 'present', opts),
  };
}

export function leaveMock(opts: Opts = {}): LeaveService {
  return {
    list: (childId) => withLatency(() => db.leave!.filter((l) => l.childId === childId), opts),
    submit: (req) =>
      withLatency(() => {
        leaveCounter += 1;
        const created = { ...req, id: `lv-${leaveCounter}`, status: 'pending' as const };
        db.leave!.push(created);
        return created;
      }, opts),
  };
}
