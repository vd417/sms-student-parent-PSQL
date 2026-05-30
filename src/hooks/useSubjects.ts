import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useSubjects = () =>
  useQuery({ queryKey: qk.subjects, queryFn: () => services.subjects.list() });
export const useSubject = (id: string) =>
  useQuery({ queryKey: qk.subject(id), queryFn: () => services.subjects.byId(id) });
