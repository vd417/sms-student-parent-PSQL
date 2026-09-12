import type {
  AttendanceService,
  FeesService,
  LeaveService,
  ParentService,
  PTMService,
  TransportService,
} from '@/services/types';
import type { PeriodAttendanceEntry } from '@/models';
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
    createRazorpayOrder: (feeId) =>
      withLatency(() => {
        const fee = db.fees!.find((f) => f.id === feeId);
        if (!fee) throw new Error(`Fee ${feeId} not found`);
        return { orderId: `order_mock_${feeId}`, amount: fee.amount, currency: 'INR', keyId: 'rzp_test_mock' };
      }, opts),
    verifyRazorpayPayment: (feeId, _body) =>
      withLatency(() => {
        const fee = db.fees!.find((f) => f.id === feeId);
        if (!fee) throw new Error(`Fee ${feeId} not found`);
        fee.status = 'paid';
        fee.paidOn = 'today';
        fee.method = 'Razorpay';
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

const MOCK_PERIOD_SUBJECTS = ['Music', 'Maths'];
const MOCK_STATUS_CYCLE: PeriodAttendanceEntry['status'][] = ['present', 'present', 'late', 'absent', 'present'];

function mockDateLabel(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Deterministic ~6 weeks of weekday period marks, ending today, so Day/Week/Month/Overall each show distinct data. */
function generateMockPeriods(now: Date): PeriodAttendanceEntry[] {
  const rows: PeriodAttendanceEntry[] = [];
  for (let offset = 0; offset < 42; offset++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - offset);
    const weekday = d.getDay();
    if (weekday === 0 || weekday === 6) continue;
    const date = mockDateLabel(d);
    MOCK_PERIOD_SUBJECTS.forEach((subject, si) => {
      rows.push({
        id: `p-${date}-${si}`,
        date,
        period: si + 1,
        subject,
        status: MOCK_STATUS_CYCLE[(offset + si) % MOCK_STATUS_CYCLE.length],
        markedByRole: 'teacher',
      });
    });
  }
  return rows;
}

export function attendanceMock(opts: Opts = {}): AttendanceService {
  return {
    month: (childId) => withLatency(() => attendanceFor(childId), opts),
    today: () => withLatency(() => 'present', opts),
    periods: (_childId, from, to) =>
      withLatency(() => {
        const rows = generateMockPeriods(new Date()).filter(
          (r) => (!from || r.date >= from) && (!to || r.date <= to),
        );
        return rows.sort((a, b) => b.date.localeCompare(a.date) || a.period - b.period);
      }, opts),
    summary: (_childId, from, to) =>
      withLatency(() => {
        const rows = generateMockPeriods(new Date()).filter(
          (r) => (!from || r.date >= from) && (!to || r.date <= to),
        );
        const presentPeriods = rows.filter((r) => r.status === 'present').length;
        const latePeriods = rows.filter((r) => r.status === 'late').length;
        const absentPeriods = rows.filter((r) => r.status === 'absent').length;
        const leavePeriods = rows.filter((r) => r.status === 'leave').length;
        const totalMarkedPeriods = rows.length;
        const attendancePercentage =
          totalMarkedPeriods > 0
            ? +(((presentPeriods + latePeriods) / totalMarkedPeriods) * 100).toFixed(1)
            : null;
        const todayLabel = mockDateLabel(new Date());
        const presentTodayBadge = rows.some(
          (r) => r.date === todayLabel && (r.status === 'present' || r.status === 'late'),
        );
        return {
          totalMarkedPeriods,
          presentPeriods,
          latePeriods,
          absentPeriods,
          leavePeriods,
          attendancePercentage,
          presentTodayBadge,
        };
      }, opts),
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
