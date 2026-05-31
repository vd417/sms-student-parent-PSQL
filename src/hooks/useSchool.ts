import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export function useSchool() {
  return useQuery({
    queryKey: qk.school,
    queryFn: () => services.school.getCurrent(),
  });
}
