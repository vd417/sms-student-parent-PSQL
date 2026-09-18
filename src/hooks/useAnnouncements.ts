import { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Announcement, InboxNotice, Role } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useAnnouncements = (audience: Role) =>
  useQuery({
    queryKey: qk.announcements(audience),
    queryFn: () => services.announcements.list(audience),
    refetchOnMount: 'always',
  });

/** Latest unread notices. Clear all marks them read and drops them from the list. */
export function useNoticeList(audience: Role) {
  const annQ = useAnnouncements(audience);
  const qc = useQueryClient();
  const feedKey = qk.announcements(audience);

  useFocusEffect(
    useCallback(() => {
      void annQ.refetch();
    }, [annQ.refetch]),
  );

  const clear = useMutation({
    mutationFn: () => services.notifications.markRead(),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: feedKey });
      await qc.cancelQueries({ queryKey: qk.notifications });
      const previousFeed = qc.getQueryData<Announcement[]>(feedKey);
      const previousNotices = qc.getQueryData<InboxNotice[]>(qk.notifications);
      qc.setQueryData(feedKey, (old: Announcement[] | undefined) =>
        (old ?? []).filter((n) => n.unread !== true),
      );
      qc.setQueryData(qk.notifications, (old: InboxNotice[] | undefined) =>
        (old ?? []).map((n) => ({ ...n, unread: false })),
      );
      return { previousFeed, previousNotices };
    },
    onError: (_err, _void, ctx) => {
      if (ctx?.previousFeed) qc.setQueryData(feedKey, ctx.previousFeed);
      if (ctx?.previousNotices) qc.setQueryData(qk.notifications, ctx.previousNotices);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: qk.notifications });
      void qc.invalidateQueries({ queryKey: feedKey });
    },
  });

  const unreadCount = (annQ.data ?? []).filter((n) => n.unread).length;
  return { annQ, clear, unreadCount };
}
