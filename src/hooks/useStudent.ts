import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { enabledWhenOwnOrChild, qk } from './keys';

export const useStudentProfile = (studentId?: string) =>
  useQuery({
    queryKey: qk.studentProfile(studentId),
    queryFn: () => services.student.getProfile(studentId),
    enabled: enabledWhenOwnOrChild(studentId),
  });
export const useToday = () =>
  useQuery({
    queryKey: qk.today,
    queryFn: () => services.student.getToday(),
    refetchOnMount: 'always',
  });
export const useTimetable = (studentId?: string) =>
  useQuery({
    queryKey: qk.timetable(studentId),
    queryFn: () => services.student.getTimetable(studentId),
    refetchOnMount: 'always',
    enabled: enabledWhenOwnOrChild(studentId),
  });
export const usePeers = () =>
  useQuery({ queryKey: qk.peers, queryFn: () => services.student.getPeers() });
export const useAchievements = (studentId?: string) =>
  useQuery({
    queryKey: qk.achievements(studentId),
    queryFn: () => services.student.getAchievements(studentId),
  });
