import type {
  AttendanceService, FeesService, LeaveService, ParentService,
  PTMService, TransportService,
} from '@/services/types';
import { NotImplementedError } from '@/services/errors';

const ni = (what: string): never => {
  throw new NotImplementedError(what);
};

export const parentMock = (): ParentService => ({
  getProfile: () => ni('parent.getProfile'),
  children: () => ni('parent.children'),
  childToday: () => ni('parent.childToday'),
});
export const feesMock = (): FeesService => ({ list: () => ni('fees.list'), pay: () => ni('fees.pay') });
export const ptmMock = (): PTMService => ({ list: () => ni('ptm.list'), setStatus: () => ni('ptm.setStatus') });
export const transportMock = (): TransportService => ({ forChild: () => ni('transport.forChild') });
export const attendanceMock = (): AttendanceService => ({ month: () => ni('attendance.month') });
export const leaveMock = (): LeaveService => ({ list: () => ni('leave.list'), submit: () => ni('leave.submit') });
