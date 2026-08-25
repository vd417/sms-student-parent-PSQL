import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaveRequest } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useLeave = (childId: string) =>
  useQuery({
    queryKey: qk.leave(childId),
    queryFn: () => services.leave.list(childId),
    enabled: Boolean(childId),
  });

export function useSubmitLeave(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Omit<LeaveRequest, 'id' | 'status'>) => services.leave.submit(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.leave(childId) }),
  });
}
