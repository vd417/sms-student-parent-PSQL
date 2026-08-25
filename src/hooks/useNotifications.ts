import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';
import { useToast } from '@/providers/ToastProvider';
import {
  DEFAULT_NOTICE_PREFS,
  noticeRefreshesTimetable,
  shouldToastNotice,
  toastTextForNotice,
} from '@/lib/noticeAlert';
import type { InboxNotice } from '@/models';

export const useNotifications = () =>
  useQuery({
    queryKey: qk.notifications,
    queryFn: () => services.notifications.list(),
    refetchOnMount: 'always',
  });

export const useSettings = () =>
  useQuery({
    queryKey: qk.settings,
    queryFn: () => services.settings.get(),
    staleTime: 30_000,
  });

function alertFor(n: InboxNotice) {
  return { title: n.title, body: n.body, tone: n.tone, unread: n.unread };
}

/** Toasts new school + chat notices while the app is open. */
export function NoticeWatcher() {
  const toast = useToast();
  const qc = useQueryClient();
  const noticesQ = useNotifications();
  const settingsQ = useSettings();
  const seen = useRef<Set<string> | null>(null);
  const prefs = settingsQ.data ?? DEFAULT_NOTICE_PREFS;

  useEffect(() => {
    const rows = noticesQ.data;
    if (!rows) return;

    const announce = (n: InboxNotice) => {
      const alert = alertFor(n);
      if (!shouldToastNotice(prefs, alert)) return;
      toast(toastTextForNotice(alert), 4000);
      void qc.invalidateQueries({ queryKey: qk.announcements('student') });
      void qc.invalidateQueries({ queryKey: qk.announcements('parent') });
      if (noticeRefreshesTimetable(alert)) {
        void qc.invalidateQueries({ queryKey: qk.today });
        void qc.invalidateQueries({ queryKey: ['student', 'timetable'] });
      }
    };

    if (seen.current === null) {
      seen.current = new Set(rows.map((n) => n.id));
      const latestUnread = rows.find((n) => n.unread);
      if (latestUnread) announce(latestUnread);
      return;
    }

    for (const n of rows) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      announce(n);
    }
  }, [noticesQ.data, prefs, qc, toast]);

  return null;
}
