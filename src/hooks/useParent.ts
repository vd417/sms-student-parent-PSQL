import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { isConfirmedAuthFailure } from '@/api/errorKind';
import { queryShouldRetry } from '@/api/retry';
import { useAuth } from '@/providers/AuthProvider';
import { qk } from './keys';

export const useParentProfile = () =>
  useQuery({ queryKey: qk.parentProfile, queryFn: () => services.parent.getProfile() });
export const useChildren = () => {
  const { role } = useAuth();
  return useQuery({
    queryKey: qk.children,
    queryFn: () => services.parent.children(),
    enabled: role === 'parent',
    retry: (n, err) => queryShouldRetry(n, err) && !isConfirmedAuthFailure(err),
  });
};
export const useChildToday = (childId: string) =>
  useQuery({
    queryKey: qk.childToday(childId),
    queryFn: () => services.parent.childToday(childId),
    enabled: Boolean(childId),
  });
