import { useCallback, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ChatThread, Role } from '@/models';
import { services } from '@/services';
import { qk } from './keys';
import { unreadChatCount } from '@/lib/noticeRoute';
import { useLive } from '@/providers/LiveProvider';
import { useToast } from '@/providers/ToastProvider';
import { useNetwork } from './useNetwork';
import {
  CHAT_MODERATION_WARNING,
  ChatModerationError,
  validateChatImage,
  validateChatMessage,
} from '@/lib/chatModeration';
import { ApiError } from '@/services/errors';

/** Inbox list only — pass `enabled` from `useIsFocused()` so Home does not poll /threads. */
export const useThreads = (audience: Role, enabled = true) =>
  useQuery({
    queryKey: qk.threads(audience),
    queryFn: () => services.messaging.threads(audience),
    enabled,
    staleTime: 30_000,
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
  });

/** Tab badge: chat unread stays on Inbox, not the notification bell. */
export function useInboxUnreadCount(audience: Role) {
  const q = useThreads(audience, true);
  return unreadChatCount(q.data);
}

/** Header lookup from Inbox cache. Never calls GET /threads. */
export function useCachedThread(audience: Role, threadId: string) {
  const { data } = useQuery({
    queryKey: qk.threads(audience),
    queryFn: () => services.messaging.threads(audience),
    enabled: false,
  });
  return data?.find((t) => t.id === threadId);
}

export const useMessages = (threadId: string) => {
  const { connected } = useLive();
  const { online } = useNetwork();
  return useQuery({
    queryKey: qk.messages(threadId),
    queryFn: () => services.messaging.messages(threadId),
    enabled: threadId.length > 0,
    refetchOnMount: 'always',
    refetchInterval: online && !connected ? 4_000 : false,
  });
};

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { text: string; imageUrl?: string }) =>
      services.messaging.send(threadId, input.text, input.imageUrl),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.messages(threadId) });
      void qc.invalidateQueries({ queryKey: qk.threads('student') });
      void qc.invalidateQueries({ queryKey: qk.threads('parent') });
    },
  });
}

export function useOpenThread(audience: Role) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; role?: string; kid?: string | null }) => {
      const name = input.name.trim();
      const cached = qc.getQueryData<ChatThread[]>(qk.threads(audience));
      const threads = cached ?? (await services.messaging.threads(audience));
      const hit = threads.find((t) => t.name.trim().toLowerCase() === name.toLowerCase());
      if (hit) return hit;
      return services.messaging.create({
        name,
        role: input.role,
        group: false,
        kid: input.kid,
      });
    },
    onSuccess: (thread) => {
      qc.setQueryData<ChatThread[]>(qk.threads(audience), (old) => {
        if (!old) return [thread];
        if (old.some((t) => t.id === thread.id)) return old;
        return [thread, ...old];
      });
    },
  });
}

function isBlockedLanguage(err: unknown): boolean {
  if (err instanceof ChatModerationError) return true;
  return err instanceof ApiError && err.code === 'abusive_language';
}

/** Same send + school-language gate as the teacher app chat composer. */
export function useChatComposer(threadId: string) {
  const sendMut = useSendMessage(threadId);
  const toast = useToast();
  const [moderationError, setModerationError] = useState(false);

  const clearModerationError = useCallback(() => setModerationError(false), []);

  const showBlocked = useCallback(() => {
    setModerationError(true);
  }, []);

  const sendMessage = useCallback(
    (text: string, onSuccess?: () => void) => {
      const trimmed = text.trim();
      if (!trimmed || sendMut.isPending) return;
      setModerationError(false);
      if (!validateChatMessage(trimmed).ok) {
        showBlocked();
        return;
      }
      sendMut.mutate(
        { text: trimmed },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => {
            if (isBlockedLanguage(err)) {
              showBlocked();
              return;
            }
            toast('Could not send. Try again.');
          },
        },
      );
    },
    [sendMut, showBlocked, toast],
  );

  /** `caption` is optional text sent alongside the image (e.g. whatever was in the draft). */
  const sendImage = useCallback(
    (imageUrl: string, caption: string, onSuccess?: () => void) => {
      if (sendMut.isPending) return;
      setModerationError(false);
      const trimmedCaption = caption.trim();
      if (trimmedCaption && !validateChatMessage(trimmedCaption).ok) {
        showBlocked();
        return;
      }
      if (!validateChatImage(imageUrl).ok) {
        showBlocked();
        return;
      }
      sendMut.mutate(
        { text: trimmedCaption, imageUrl },
        {
          onSuccess: () => onSuccess?.(),
          onError: (err) => {
            if (isBlockedLanguage(err)) {
              showBlocked();
              return;
            }
            toast('Could not send image. Try again.');
          },
        },
      );
    },
    [sendMut, showBlocked, toast],
  );

  return {
    sendMessage,
    sendImage,
    sendPending: sendMut.isPending,
    moderationError,
    moderationWarning: CHAT_MODERATION_WARNING,
    clearModerationError,
  };
}
