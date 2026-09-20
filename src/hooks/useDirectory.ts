import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useDirectory = () =>
  useQuery({ queryKey: qk.directory, queryFn: () => services.directory.teachers() });
