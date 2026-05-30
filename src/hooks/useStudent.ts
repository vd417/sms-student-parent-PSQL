import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useStudentProfile = () =>
  useQuery({ queryKey: qk.studentProfile, queryFn: () => services.student.getProfile() });
export const useToday = () =>
  useQuery({ queryKey: qk.today, queryFn: () => services.student.getToday() });
export const usePeers = () =>
  useQuery({ queryKey: qk.peers, queryFn: () => services.student.getPeers() });
export const useAchievements = () =>
  useQuery({ queryKey: qk.achievements, queryFn: () => services.student.getAchievements() });
