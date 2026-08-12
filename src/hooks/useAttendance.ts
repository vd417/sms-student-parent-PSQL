import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useAttendance = (childId: string) =>
  useQuery({ queryKey: qk.attendance(childId), queryFn: () => services.attendance.month(childId) });

export const useTodayAttendance = () =>
  useQuery({ queryKey: qk.todayAttendance, queryFn: () => services.attendance.today() });
