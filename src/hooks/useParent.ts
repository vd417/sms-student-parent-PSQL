import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { ApiError } from '@/services/errors';
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
    retry: (n, err) => n < 1 && !(err instanceof ApiError && err.status === 401),
  });
};
export const useChildToday = (childId: string) =>
  useQuery({
    queryKey: qk.childToday(childId),
    queryFn: () => services.parent.childToday(childId),
    enabled: Boolean(childId),
  });
