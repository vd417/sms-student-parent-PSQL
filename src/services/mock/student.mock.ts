import type {
  AnnouncementsService,
  DirectoryService,
  GradesService,
  MessagingService,
  NotificationsService,
  SettingsService,
  StudentService,
  SubjectsService,
} from '@/services/types';
import { db } from './db';
import { withLatency } from './latency';
import { assignDistinctSubjectHues } from '@/theme/derive';
import { assertChatMessageAllowed } from '@/lib/chatModeration';

interface Opts {
  ms?: number;
  errorRate?: number;
}

export function studentMock(opts: Opts = {}): StudentService {
  return {
    getProfile: () => withLatency(() => db.student, opts),
    getToday: () => withLatency(() => db.today, opts),
    getTimetable: () =>
      withLatency(
        () => db.today.map((b) => ({ ...b, day: 'Fri' as const })),
        opts,
      ),
    getPeers: () => withLatency(() => db.peers, opts),
    getAchievements: () => withLatency(() => db.achievements, opts),
  };
}

export function subjectsMock(opts: Opts = {}): SubjectsService {
  return {
    list: () => withLatency(() => assignDistinctSubjectHues(db.subjects), opts),
    byId: (id) =>
      withLatency(() => {
        const all = assignDistinctSubjectHues(db.subjects);
        return all.find((s) => s.id === id);
      }, opts),
  };
}

export function gradesMock(opts: Opts = {}): GradesService {
  return {
    listGrades: () => withLatency(() => db.grades, opts),
    listExams: () => withLatency(() => db.exams, opts),
  };
}

export function announcementsMock(opts: Opts = {}): AnnouncementsService {
  return {
    list: (audience) =>
      withLatency(
        () =>
          audience === 'parent' ? (db.parentAnnouncements ?? db.announcements) : db.announcements,
        opts,
      ),
  };
}

export function notificationsMock(opts: Opts = {}): NotificationsService {
  return {
    list: () => withLatency(() => [], opts),
    markRead: () => withLatency(() => undefined, opts),
  };
}

export function settingsMock(opts: Opts = {}): SettingsService {
  let prefs = { chatAlerts: true, schoolNotices: true, inAppToasts: true };
  return {
    get: () => withLatency(() => ({ ...prefs }), opts),
    update: (input) =>
      withLatency(() => {
        prefs = { ...prefs, ...input };
        return { ...prefs };
      }, opts),
  };
}

export function directoryMock(opts: Opts = {}): DirectoryService {
  return { teachers: () => withLatency(() => db.teachers, opts) };
}

export function messagingMock(opts: Opts = {}): MessagingService {
  let counter = 0;
  return {
    threads: (audience) =>
      withLatency(
        () => (audience === 'parent' ? (db.parentThreads ?? []) : db.studentThreads),
        opts,
      ),
    messages: (threadId) =>
      withLatency(() => {
        const allThreads = [...db.studentThreads, ...(db.parentThreads ?? [])];
        const thread = allThreads.find((t) => t.id === threadId);
        if (thread) thread.unread = 0;
        const all = [...db.studentMessages, ...(db.parentMessages ?? [])];
        return all.filter((m) => m.threadId === threadId);
      }, opts),
    send: (threadId, text) =>
      withLatency(() => {
        assertChatMessageAllowed(text);
        counter += 1;
        const msg = {
          id: `m-new-${counter}`,
          threadId,
          from: 'me' as const,
          text,
          time: 'now',
          status: 'delivered' as const,
        };
        const isParent = (db.parentThreads ?? []).some((t) => t.id === threadId);
        if (isParent) (db.parentMessages ??= []).push(msg);
        else db.studentMessages.push(msg);
        return msg;
      }, opts),
    create: ({ name, role, group, kid }) =>
      withLatency(() => {
        counter += 1;
        const thread = {
          id: `st-new-${counter}`,
          name,
          role: role ?? '',
          last: '',
          when: 'now',
          unread: 0,
          kid: kid ?? null,
          group: !!group,
        };
        if (kid) (db.parentThreads ??= []).push(thread);
        else db.studentThreads.push(thread);
        return thread;
      }, opts),
  };
}
