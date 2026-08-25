import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { enabledWhenOwnOrChild, qk } from './keys';

/** Shared staleTime so report card + subject detail do not refetch in a loop. */
const MARKS_STALE_MS = 60_000;

export const useGrades = (studentId?: string) =>
  useQuery({
    queryKey: qk.grades(studentId),
    queryFn: () => services.grades.listGrades(studentId),
    staleTime: MARKS_STALE_MS,
    enabled: enabledWhenOwnOrChild(studentId),
  });
export const useExams = (studentId?: string) =>
  useQuery({
    queryKey: qk.exams(studentId),
    queryFn: () => services.grades.listExams(studentId),
    staleTime: MARKS_STALE_MS,
    enabled: enabledWhenOwnOrChild(studentId),
  });
