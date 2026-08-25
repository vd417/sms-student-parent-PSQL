import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useAttendance = (childId: string) =>
  useQuery({ queryKey: qk.attendance(childId), queryFn: () => services.attendance.month(childId) });

export const useTodayAttendance = () =>
  useQuery({ queryKey: qk.todayAttendance, queryFn: () => services.attendance.today() });

export const usePeriodAttendance = (childId: string, from?: string, to?: string) =>
  useQuery({
    queryKey: [...qk.attendance(childId || 'me'), 'periods', from ?? '', to ?? ''] as const,
    queryFn: () => services.attendance.periods(childId, from, to),
  });

export const useAttendanceSummary = (childId: string, from?: string, to?: string) =>
  useQuery({
    queryKey: [...qk.attendance(childId || 'me'), 'summary', from ?? '', to ?? ''] as const,
    queryFn: () => services.attendance.summary(childId, from, to),
  });
