import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useFees = (childId: string) =>
  useQuery({
    queryKey: qk.fees(childId),
    queryFn: () => services.fees.list(childId),
    enabled: Boolean(childId),
  });

export function usePayFee(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => services.fees.pay(feeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fees(childId) }),
  });
}
