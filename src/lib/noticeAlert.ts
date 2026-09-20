export type NoticeAlert = {
  title: string;
  body: string;
  tone: string;
  unread?: boolean;
};

export function toastTextForNotice(n: NoticeAlert): string {
  const title = n.title.trim() || 'Notice';
  const body = n.body.trim();
  if (n.tone.trim().toLowerCase() === 'chat') {
    return body ? `${title}: ${body}` : `New message from ${title}`;
  }
  return body ? `${title}. ${body}` : title;
}

export function noticeRefreshesTimetable(n: NoticeAlert): boolean {
  const t = `${n.tone} ${n.title}`.toLowerCase();
  return t.includes('timetable') || t.includes('calendar');
}

export type NoticePrefs = {
  inAppToasts: boolean;
  chatAlerts: boolean;
  schoolNotices: boolean;
};

export const DEFAULT_NOTICE_PREFS: NoticePrefs = {
  inAppToasts: true,
  chatAlerts: true,
  schoolNotices: true,
};

export function shouldToastNotice(
  prefs: NoticePrefs,
  n: NoticeAlert,
  currentRoute?: string,
): boolean {
  if (!prefs.inAppToasts) return false;
  const chat = n.tone.trim().toLowerCase() === 'chat';
  // Live thread already shows the message — a toast on top of the composer looks like a second popup.
  if (chat && currentRoute === 'ChatThread') return false;
  if (chat) return prefs.chatAlerts;
  return prefs.schoolNotices;
}
