import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';
import type { RazorpayOrder } from '@/services/types';

export const useFees = (childId: string) =>
  useQuery({
    queryKey: qk.fees(childId),
    queryFn: () => services.fees.list(childId),
    enabled: Boolean(childId),
  });

export function useCreateRazorpayOrder() {
  return useMutation({ mutationFn: (feeId: string): Promise<RazorpayOrder> => services.fees.createRazorpayOrder(feeId) });
}

export function useVerifyRazorpayPayment(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ feeId, body }: {
      feeId: string;
      body: { razorpayOrderId: string; razorpayPaymentId: string; razorpaySignature: string };
    }) => services.fees.verifyRazorpayPayment(feeId, body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fees(childId) }),
  });
}
