import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export function useSchool(enabled = true) {
  return useQuery({
    queryKey: qk.school,
    queryFn: () => services.school.getCurrent(),
    staleTime: 60_000,
    refetchOnMount: 'always',
    enabled,
  });
}
