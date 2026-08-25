import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useSubjects = (studentId?: string) =>
  useQuery({
    queryKey: qk.subjects(studentId),
    queryFn: () => services.subjects.list(studentId),
  });
export const useSubject = (id: string, studentId?: string) =>
  useQuery({
    queryKey: qk.subject(id),
    queryFn: async () =>
      (await services.subjects.byId(id)) ??
      (await services.subjects.list(studentId)).find((s) => s.id === id),
    enabled: Boolean(id),
  });
