import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeworkStatus } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useHomework = () =>
  useQuery({ queryKey: qk.homework, queryFn: () => services.homework.list() });

export const useHomeworkItem = (id: string) =>
  useQuery({ queryKey: qk.homeworkItem(id), queryFn: () => services.homework.byId(id) });

export function useSubmitHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.homework.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.homework });
    },
  });
}

export function useSetHomeworkStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: HomeworkStatus }) =>
      services.homework.setStatus(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.homework });
    },
  });
}
