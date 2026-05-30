import { useQuery } from '@tanstack/react-query';
import type { Role } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useAnnouncements = (audience: Role) =>
  useQuery({ queryKey: qk.announcements(audience), queryFn: () => services.announcements.list(audience) });
