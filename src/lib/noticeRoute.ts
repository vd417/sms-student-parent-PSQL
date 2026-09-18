import type { ChatThread, InboxNotice } from '@/models';

export type NoticeKind =
  | 'chat'
  | 'homework'
  | 'bus'
  | 'fees'
  | 'leave'
  | 'attendance'
  | 'timetable'
  | 'grades'
  | 'school';

export type NoticeAudience = 'student' | 'parent';

export type NoticeDestination =
  | { tab: 'Inbox' | 'Homework' | 'Class' | 'Fees' }
  | { stack: 'Announcements' | 'Transport' | 'Attendance' | 'Schedule' | 'Grades' | 'Leave' };

export function noticeKind(input: {
  tone?: string | null;
  title?: string | null;
  body?: string | null;
  role?: string | null;
}): NoticeKind {
  const tone = (input.tone ?? '').trim().toLowerCase();
  const role = (input.role ?? '').trim().toLowerCase();
  if (tone === 'chat' || role === 'message') return 'chat';
  if (tone === 'bus' || role === 'bus') return 'bus';
  if (tone === 'fee' || tone === 'fees' || role === 'fees') return 'fees';

  const hay = `${tone} ${role} ${input.title ?? ''} ${input.body ?? ''}`.toLowerCase();
  if (hay.includes('homework')) return 'homework';
  if (/\bbus\b/.test(hay) || hay.includes('transport')) return 'bus';
  if (hay.includes('fee') || hay.includes('invoice') || hay.includes('payment')) return 'fees';
  if (hay.includes('leave')) return 'leave';
  if (hay.includes('absent') || hay.includes('attendance')) return 'attendance';
  if (hay.includes('timetable') || hay.includes('schedule') || hay.includes('calendar')) return 'timetable';
  if (hay.includes('grade') || hay.includes('exam') || hay.includes('class test')) return 'grades';
  return 'school';
}

export function noticeDestination(kind: NoticeKind, audience: NoticeAudience): NoticeDestination {
  if (kind === 'chat') return { tab: 'Inbox' };
  if (kind === 'bus') return { stack: 'Transport' };
  if (kind === 'homework') return audience === 'parent' ? { tab: 'Class' } : { tab: 'Homework' };
  if (kind === 'fees') return audience === 'parent' ? { tab: 'Fees' } : { stack: 'Announcements' };
  if (kind === 'leave') return audience === 'parent' ? { stack: 'Leave' } : { stack: 'Announcements' };
  if (kind === 'attendance') return { stack: 'Attendance' };
  if (kind === 'timetable') return audience === 'parent' ? { tab: 'Class' } : { stack: 'Schedule' };
  if (kind === 'grades') return { stack: 'Grades' };
  return { stack: 'Announcements' };
}

export function goToNotice(
  nav: { navigate: (name: never, params?: never) => void },
  kind: NoticeKind,
  audience: NoticeAudience,
) {
  const dest = noticeDestination(kind, audience);
  if ('tab' in dest) {
    (nav.navigate as (name: string, params?: { screen: string }) => void)('Main', { screen: dest.tab });
    return;
  }
  (nav.navigate as (name: string) => void)(dest.stack);
}

export function unreadChatCount(threads: Pick<ChatThread, 'unread'>[] | undefined): number {
  return (threads ?? []).reduce((sum, t) => sum + Math.max(0, Number(t.unread) || 0), 0);
}

export function unreadNoticeCount(
  notices: Pick<InboxNotice, 'unread'>[] | undefined,
): number {
  return (notices ?? []).filter((n) => n.unread).length;
}

export function inboxTabBadge(count: number): string | number | undefined {
  if (count <= 0) return undefined;
  return count > 99 ? '99+' : count;
}

/** Home bell always opens the notices list. A row tap uses `goToNotice`. */
export function goToLatestNotice(
  nav: { navigate: (name: never, params?: never) => void },
  _notices: Array<{ unread: boolean; tone?: string | null; title?: string | null; body?: string | null; role?: string | null }> | undefined,
  _audience: NoticeAudience,
) {
  (nav.navigate as (name: string) => void)('Announcements');
}
