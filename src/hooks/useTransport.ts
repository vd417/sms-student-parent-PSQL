import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useTransport = (childId: string) =>
  useQuery({
    queryKey: qk.transport(childId),
    queryFn: () => services.transport.forChild(childId),
  });
