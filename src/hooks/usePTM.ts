import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PTMMeeting } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const usePTM = () =>
  useQuery({ queryKey: qk.ptm, queryFn: () => services.ptm.list() });

export function useSetPTMStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: PTMMeeting['status'] }) =>
      services.ptm.setStatus(vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ptm }),
  });
}
