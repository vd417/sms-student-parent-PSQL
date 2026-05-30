import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useThreads = (audience: Role) =>
  useQuery({ queryKey: qk.threads(audience), queryFn: () => services.messaging.threads(audience) });

export const useMessages = (threadId: string) =>
  useQuery({ queryKey: qk.messages(threadId), queryFn: () => services.messaging.messages(threadId) });

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => services.messaging.send(threadId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.messages(threadId) });
    },
  });
}
