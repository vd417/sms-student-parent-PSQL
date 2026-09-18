import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useChildrenTransport = () =>
  useQuery({
    queryKey: qk.transportList(),
    queryFn: () => services.transport.list(),
    refetchInterval: 12_000,
  });

export const useTransport = (childId?: string) =>
  useQuery({
    queryKey: qk.transport(childId ?? 'me'),
    queryFn: () => services.transport.forChild(childId ?? ''),
    enabled: childId === undefined || Boolean(childId),
    refetchInterval: 12_000,
  });
