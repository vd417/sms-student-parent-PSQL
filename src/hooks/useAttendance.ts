import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { enabledWhenOwnOrChild, qk } from './keys';

export const useAttendance = (childId: string) =>
  useQuery({
    queryKey: qk.attendance(childId),
    queryFn: () => services.attendance.month(childId),
    enabled: Boolean(childId),
  });

export const useTodayAttendance = () =>
  useQuery({ queryKey: qk.todayAttendance, queryFn: () => services.attendance.today() });

export const usePeriodAttendance = (childId?: string, from?: string, to?: string) =>
  useQuery({
    queryKey: [...qk.attendance(childId || 'me'), 'periods', from ?? '', to ?? ''] as const,
    queryFn: () => services.attendance.periods(childId, from, to),
    enabled: enabledWhenOwnOrChild(childId),
    placeholderData: (prev) => prev,
  });

export const useAttendanceSummary = (childId?: string, from?: string, to?: string) =>
  useQuery({
    queryKey: [...qk.attendance(childId || 'me'), 'summary', from ?? '', to ?? ''] as const,
    queryFn: () => services.attendance.summary(childId, from, to),
    enabled: enabledWhenOwnOrChild(childId),
    placeholderData: (prev) => prev,
  });
