import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeworkStatus } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useHomework = (studentId?: string) =>
  useQuery({ queryKey: qk.homework(studentId), queryFn: () => services.homework.list(studentId) });

export const useHomeworkItem = (id: string) =>
  useQuery({ queryKey: qk.homeworkItem(id), queryFn: () => services.homework.byId(id) });

export function useSubmitHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.homework.submit(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      qc.invalidateQueries({ queryKey: qk.homeworkItem(id) });
    },
  });
}

export function useSetHomeworkStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: HomeworkStatus }) =>
      services.homework.setStatus(vars.id, vars.status),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['homework'] });
      qc.invalidateQueries({ queryKey: qk.homeworkItem(vars.id) });
    },
  });
}
