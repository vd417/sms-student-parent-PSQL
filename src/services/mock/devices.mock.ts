import type { DevicesService } from '@/services/types';

export function devicesMock(): DevicesService {
  return {
    register: async () => undefined,
  };
}
