import type { SubjectHue } from '@/theme';

// ---------- shared ----------
export type Role = 'student' | 'parent';

// ---------- student ----------
export type HomeworkStatus = 'todo' | 'progress' | 'submitted' | 'graded';

export interface Student {
  name: string;
  initials: string;
  grade: string;
  roll: number;
  school: string;
  studentId: string;
  email: string;
  classroom: string;
  house: string;
  overallAvg: number;
  attnPct: number;
  rank: number;
  rankOf: number;
}

export interface Subject {
  id: string;
  name: string;
  short: string;
  teacher: string;
  avg: number;
  trend: number;
  color: SubjectHue;
}

export interface TodayBlock {
  t: string;
  d: number;
  label: string;
  subjId?: string;
  kind: 'class' | 'break' | 'meeting' | 'club';
  room?: string;
  teacher?: string;
}

export interface Homework {
  id: string;
  title: string;
  subjId: string;
  due: string;
  dueT: string;
  status: HomeworkStatus;
  priority: 'low' | 'med' | 'high';
  grade?: string;
}

export interface Exam {
  id: string;
  title: string;
  subjId: string;
  date: string;
  time: string;
  dur: string;
  status: 'upcoming' | 'graded';
  max: number;
  score?: number;
  grade?: string;
}

export interface Grade {
  id: string;
  subjId: string;
  title: string;
  score: number;
  max: number;
  grade: string;
  date: string;
}

export interface Announcement {
  id: string;
  from: string;
  role: string;
  when: string;
  title: string;
  body: string;
}

export interface Teacher {
  id: string;
  name: string;
  initials: string;
  subj: string;
  online: boolean;
}

export interface Peer {
  id: string;
  name: string;
  initials: string;
  subj: string;
}

export interface Achievement {
  id: string;
  title: string;
  when: string;
  icon: 'award' | 'star' | 'check' | 'flag';
  hue: SubjectHue;
}

// ---------- messaging (shared shape; student + parent inboxes) ----------
export interface ChatThread {
  id: string;
  name: string;
  role: string;
  last: string;
  when: string;
  unread: number;
  kid?: string | null;
  group?: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  from: 'me' | 'them';
  text: string;
  time: string;
}

// ---------- parent ----------
export interface Parent {
  name: string;
  initials: string;
  relation: string;
  email: string;
  phone: string;
}

export interface Child {
  id: string;
  name: string;
  initials: string;
  grade: string;
  school: string;
  avg: number;
  attn: number;
  fee: string;
  unread: number;
  hue: SubjectHue;
}

export interface ChildClass {
  t: string;
  label: string;
  done: boolean;
  attn: 'present' | 'late' | null;
}

export interface ChildToday {
  classes: ChildClass[];
  meals: { breakfast: string; lunch: string };
  pickup: string;
}

export interface FeeItem {
  l: string;
  amt: number;
}

export interface Fee {
  id: string;
  period: string;
  dueDate: string;
  amount: number;
  status: 'due' | 'paid';
  items?: FeeItem[];
  paidOn?: string;
  method?: string;
}

export interface PTMMeeting {
  id: string;
  date: string;
  time: string;
  teacher: string;
  subj: string;
  child: string;
  mode: string;
  status: 'confirmed' | 'pending';
}

export interface TransportStop {
  stop: string;
  eta: string;
  done: boolean;
  you?: boolean;
}

export interface Transport {
  busNo: string;
  driver: string;
  plate: string;
  eta: string;
  pickupStop: string;
  nextStops: TransportStop[];
}

export interface CalendarEvent {
  day: string;
  items: { t: string; label: string; kind: 'pickup' | 'exam' | 'meeting' | 'event' }[];
}

export type AttendanceKind = 'present' | 'absent' | 'late' | 'off' | 'future';

export interface AttendanceDay {
  d: number;
  kind: AttendanceKind;
}

export interface AttendanceFlag {
  id: string;
  tone: 'absent' | 'late';
  date: string;
  reason: string;
  action: string;
}

export interface LeaveRequest {
  id: string;
  childId: string;
  from: string;
  to: string;
  reason: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ---------- school ----------
export interface School {
  id: string;
  name: string;
  shortName?: string;
  logoUrl: string;
}

// ---------- auth ----------
export interface Session {
  token: string;
  role: Role;
  email: string;
}
