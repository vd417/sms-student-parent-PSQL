import type {
  Achievement, Announcement, ChatMessage, ChatThread, Child, ChildToday,
  Exam, Fee, Grade, Homework, LeaveRequest, Parent, Peer, PTMMeeting,
  Student, Subject, Teacher, TodayBlock, Transport,
} from '@/models';
import * as student from './fixtures/student';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export interface MockDb {
  // student
  student: Student;
  subjects: Subject[];
  today: TodayBlock[];
  homework: Homework[];
  exams: Exam[];
  grades: Grade[];
  announcements: Announcement[];
  peers: Peer[];
  teachers: Teacher[];
  achievements: Achievement[];
  studentThreads: ChatThread[];
  studentMessages: ChatMessage[];
  // parent (populated in Milestone 3)
  parent?: Parent;
  children?: Child[];
  childToday?: Record<string, ChildToday>;
  fees?: Fee[];
  ptm?: PTMMeeting[];
  parentThreads?: ChatThread[];
  parentMessages?: ChatMessage[];
  parentAnnouncements?: Announcement[];
  transport?: Transport;
  leave?: LeaveRequest[];
}

export const db: MockDb = {
  student: clone(student.studentProfile),
  subjects: clone(student.subjects),
  today: clone(student.today),
  homework: clone(student.homework),
  exams: clone(student.exams),
  grades: clone(student.grades),
  announcements: clone(student.announcements),
  peers: clone(student.peers),
  teachers: clone(student.teachers),
  achievements: clone(student.achievements),
  studentThreads: clone(student.studentThreads),
  studentMessages: clone(student.studentMessages),
};
