import type {
  AnnouncementsService, DirectoryService, GradesService, MessagingService,
  StudentService, SubjectsService,
} from '@/services/types';
import { db } from './db';
import { withLatency } from './latency';

interface Opts { ms?: number; errorRate?: number }

export function studentMock(opts: Opts = {}): StudentService {
  return {
    getProfile: () => withLatency(() => db.student, opts),
    getToday: () => withLatency(() => db.today, opts),
    getPeers: () => withLatency(() => db.peers, opts),
    getAchievements: () => withLatency(() => db.achievements, opts),
  };
}

export function subjectsMock(opts: Opts = {}): SubjectsService {
  return {
    list: () => withLatency(() => db.subjects, opts),
    byId: (id) => withLatency(() => db.subjects.find((s) => s.id === id), opts),
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
        () => (audience === 'parent' ? db.parentAnnouncements ?? db.announcements : db.announcements),
        opts,
      ),
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
        () => (audience === 'parent' ? db.parentThreads ?? [] : db.studentThreads),
        opts,
      ),
    messages: (threadId) =>
      withLatency(() => {
        const all = [...db.studentMessages, ...(db.parentMessages ?? [])];
        return all.filter((m) => m.threadId === threadId);
      }, opts),
    send: (threadId, text) =>
      withLatency(() => {
        counter += 1;
        const msg = {
          id: `m-new-${counter}`,
          threadId,
          from: 'me' as const,
          text,
          time: 'now',
        };
        const isParent = (db.parentThreads ?? []).some((t) => t.id === threadId);
        if (isParent) (db.parentMessages ??= []).push(msg);
        else db.studentMessages.push(msg);
        return msg;
      }, opts),
  };
}
