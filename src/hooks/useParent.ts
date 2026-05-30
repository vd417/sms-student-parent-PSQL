import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useParentProfile = () =>
  useQuery({ queryKey: qk.parentProfile, queryFn: () => services.parent.getProfile() });
export const useChildren = () =>
  useQuery({ queryKey: qk.children, queryFn: () => services.parent.children() });
export const useChildToday = (childId: string) =>
  useQuery({
    queryKey: qk.childToday(childId),
    queryFn: () => services.parent.childToday(childId),
  });
