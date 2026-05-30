import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useGrades = () =>
  useQuery({ queryKey: qk.grades, queryFn: () => services.grades.listGrades() });
export const useExams = () =>
  useQuery({ queryKey: qk.exams, queryFn: () => services.grades.listExams() });
