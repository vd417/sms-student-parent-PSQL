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
  /** Official period attendance %; null when no marked periods. */
  attnPct: number | null;
  rank: number;
  rankOf: number;
  gender?: string;
  section?: string;
  dob?: string;
  address?: string;
  guardianName?: string;
  guardianPhone?: string;
  photoUrl?: string;
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
  teacherId?: string;
  /** 1-based period from the published slot (preferred sort key). */
  period?: number;
  /** Minutes from midnight for chronological sort (handles 12h display strings). */
  startMin?: number;
  /** End clock label (optional); keep `t` as start-only for the narrow time column. */
  endT?: string;
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
  subjectName?: string;
  classId?: string;
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
  /** Subject display name from the grade/paper join (for matching when ids differ). */
  subjectName?: string;
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
  unread?: boolean;
}

export interface InboxNotice {
  id: string;
  title: string;
  body: string;
  unread: boolean;
  tone: string;
}

export type TeacherRole = 'principal' | 'class_teacher' | 'subject_teacher';

export interface Teacher {
  id: string;
  name: string;
  initials: string;
  subj: string;
  online: boolean;
  role: TeacherRole;
  /** Raw backend designation text (e.g. "Vice Principal"), when available. */
  designation?: string;
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
  /** Present on outgoing messages: grey ticks until the peer opens the chat. */
  status?: 'sent' | 'delivered' | 'read';
  /** Data URL or http(s) URL — same no-blob-storage convention as photo fields elsewhere. */
  imageUrl?: string;
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
  /** Admission number from the live roster (`admission_no`). */
  studentId?: string;
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
  /** Per-period attendance mark; null when not yet taken for that period. */
  attn: DailyAttendanceStatus;
}

export type DailyAttendanceStatus = 'present' | 'absent' | 'late' | 'leave' | null;

export interface ChildToday {
  classes: ChildClass[];
  meals: { breakfast: string; lunch: string };
  pickup: string;
  todayAttn: DailyAttendanceStatus;
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
  status: 'due' | 'partial' | 'paid';
  /** Amount already paid toward this invoice; only meaningful when status is 'partial'. */
  paidAmount?: number;
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

export type TransportStatus = 'idle' | 'delayed' | 'at_stop' | 'on_route';
export type TransportTrackingStatus = 'LIVE' | 'DELAYED' | 'OFFLINE';
export type TransportAssignment = 'assigned' | 'pending' | 'none' | 'opted_out';
export type TransportMotion = 'moving' | 'stopped';

export interface RouteStop {
  id: string;
  name: string;
  seq: number;
  lat: number | null;
  lng: number | null;
}

export interface Transport {
  studentId: string;
  studentName: string;
  grade: string | null;
  section: string | null;
  busId: string | null;
  busNo: string;
  routeId: string | null;
  routeName: string | null;
  status: TransportStatus;
  trackingStatus: TransportTrackingStatus;
  motion: TransportMotion | null;
  assignment: TransportAssignment;
  driver: string | null;
  driverPhone: string | null;
  boardingState: string | null;
  etaNextStopMin: number | null;
  currentStopIndex: number | null;
  currentStopName: string | null;
  passedStopCount: number | null;
  totalStops: number | null;
  lat: number | null;
  lng: number | null;
  speedKmh: number | null;
  nextStopName: string | null;
  lastPingAt: string | null;
  studentStopId: string | null;
  studentStopName: string | null;
  studentStopLat: number | null;
  studentStopLng: number | null;
  distanceToStudentStopM: number | null;
  routeStops: RouteStop[];
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

/** One subject+period mark from SaaS PeriodAttendanceRecords. */
export interface PeriodAttendanceEntry {
  id: string;
  date: string;
  period: number;
  subject: string;
  subjectId?: string;
  status: 'present' | 'absent' | 'late' | 'leave' | string;
  markedByRole?: string;
}

/** Official period attendance aggregate from GET .../attendance/summary. */
export interface PeriodAttendanceSummary {
  totalMarkedPeriods: number;
  presentPeriods: number;
  latePeriods: number;
  absentPeriods: number;
  leavePeriods: number;
  attendancePercentage: number | null;
  presentTodayBadge: boolean | null;
}

export interface LeaveRequest {
  id: string;
  childId: string;
  from: string;
  to: string;
  reason: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
  /** Doctor's note / supporting photos as data URLs or http(s) URLs. */
  attachmentUrls?: string[];
}

// ---------- school ----------
export interface School {
  id: string;
  name: string;
  shortName?: string;
  /** Primary brand mark (logo). */
  logoUrl: string;
  /** Cover / school photo — used when logo is missing or fails to paint. */
  imageUrl?: string;
}

// ---------- auth ----------
export interface Session {
  token: string;
  role: Role;
  email: string;
}
