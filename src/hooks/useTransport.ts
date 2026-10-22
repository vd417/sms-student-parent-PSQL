import { useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { mergeTransportRows } from '@/lib/busTracking';
import { qk } from './keys';

export const useChildrenTransport = () => {
  const qc = useQueryClient();
  return useQuery({
    queryKey: qk.transportList(),
    queryFn: async () => {
      const next = await services.transport.list();
      const prev = qc.getQueryData<typeof next>(qk.transportList());
      return mergeTransportRows(prev, next);
    },
    refetchInterval: 12_000,
  });
};

export const useTransport = (childId?: string) => {
  const qc = useQueryClient();
  const key = qk.transport(childId ?? 'me');
  return useQuery({
    queryKey: key,
    queryFn: async () => {
      const next = await services.transport.forChild(childId ?? '');
      const prev = qc.getQueryData<NonNullable<typeof next>>(key);
      if (!next) return next;
      const [merged] = mergeTransportRows(prev ? [prev] : undefined, [next]);
      return merged ?? next;
    },
    enabled: childId === undefined || Boolean(childId),
    refetchInterval: 12_000,
  });
};
