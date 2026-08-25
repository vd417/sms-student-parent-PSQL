import type {
  Achievement,
  Announcement,
  AttendanceDay,
  AttendanceFlag,
  PeriodAttendanceEntry,
  PeriodAttendanceSummary,
  ChatMessage,
  ChatThread,
  Child,
  ChildToday,
  DailyAttendanceStatus,
  Exam,
  Fee,
  Grade,
  Homework,
  HomeworkStatus,
  InboxNotice,
  LeaveRequest,
  Parent,
  Peer,
  PTMMeeting,
  Role,
  School,
  Session,
  Student,
  Subject,
  Teacher,
  TodayBlock,
  Transport,
} from '@/models';

export interface PasswordResetSent {
  channel: 'sms' | 'email';
  sent: boolean;
  sentTo: string;
  recipient: 'self' | 'parent';
}

export interface AuthService {
  signIn(identifier: string, password: string, role: Role): Promise<Session>;
  signOut(): Promise<void>;
  requestPasswordReset(identifier: string, role?: Role): Promise<PasswordResetSent>;
  resetPassword(identifier: string, code: string, password: string): Promise<void>;
  refresh(refreshToken: string): Promise<{ access: string; refresh: string | null }>;
  getMe(): Promise<{ role: Role; email: string }>;
}

export interface StudentService {
  getProfile(studentId?: string): Promise<Student>;
  getToday(): Promise<TodayBlock[]>;
  /** Full-week timetable blocks (TodayBlock + weekday). */
  getTimetable(studentId?: string): Promise<Array<TodayBlock & { day: string }>>;
  getPeers(): Promise<Peer[]>;
  getAchievements(studentId?: string): Promise<Achievement[]>;
}

export interface SubjectsService {
  list(studentId?: string): Promise<Subject[]>;
  byId(id: string): Promise<Subject | undefined>;
}

export interface HomeworkService {
  list(studentId?: string): Promise<Homework[]>;
  byId(id: string): Promise<Homework | undefined>;
  setStatus(id: string, status: HomeworkStatus): Promise<Homework>;
  submit(id: string): Promise<Homework>;
}

export interface GradesService {
  listGrades(studentId?: string): Promise<Grade[]>;
  listExams(studentId?: string): Promise<Exam[]>;
}

export interface AnnouncementsService {
  list(audience: Role): Promise<Announcement[]>;
}

export interface NotificationsService {
  list(): Promise<InboxNotice[]>;
  markRead(): Promise<void>;
}

export interface AppSettings {
  chatAlerts: boolean;
  schoolNotices: boolean;
  inAppToasts: boolean;
}

export interface SettingsService {
  get(): Promise<AppSettings>;
  update(patch: Partial<AppSettings>): Promise<AppSettings>;
}

export interface MessagingService {
  threads(audience: Role): Promise<ChatThread[]>;
  messages(threadId: string): Promise<ChatMessage[]>;
  send(threadId: string, text: string): Promise<ChatMessage>;
  create(input: { name: string; role?: string; group?: boolean; kid?: string | null }): Promise<ChatThread>;
}

export interface DirectoryService {
  teachers(): Promise<Teacher[]>;
}

export interface ParentService {
  getProfile(): Promise<Parent>;
  children(): Promise<Child[]>;
  /** Null when the backend has no "today" data for this child yet (no live endpoint). */
  childToday(childId: string): Promise<ChildToday | null>;
}

export interface FeesService {
  list(childId: string): Promise<Fee[]>;
  pay(feeId: string): Promise<Fee>;
}

export interface PTMService {
  list(): Promise<PTMMeeting[]>;
  setStatus(id: string, status: PTMMeeting['status']): Promise<PTMMeeting>;
}

export interface TransportService {
  /** Null when the backend has no transport detail for this child yet (no live endpoint). */
  forChild(childId: string): Promise<Transport | null>;
}

export interface AttendanceService {
  month(childId: string): Promise<{ days: AttendanceDay[]; flags: AttendanceFlag[] }>;
  today(childId?: string): Promise<DailyAttendanceStatus>;
  periods(childId: string, from?: string, to?: string): Promise<PeriodAttendanceEntry[]>;
  /** Official period-based aggregate from SaaS (same for CRM / Teacher / Student / Parent). */
  summary(childId: string, from?: string, to?: string): Promise<PeriodAttendanceSummary>;
}

export interface LeaveService {
  list(childId: string): Promise<LeaveRequest[]>;
  submit(req: Omit<LeaveRequest, 'id' | 'status'>): Promise<LeaveRequest>;
}

export interface SchoolService {
  getCurrent(): Promise<School>;
}

export interface Services {
  auth: AuthService;
  school: SchoolService;
  student: StudentService;
  subjects: SubjectsService;
  homework: HomeworkService;
  grades: GradesService;
  announcements: AnnouncementsService;
  notifications: NotificationsService;
  settings: SettingsService;
  messaging: MessagingService;
  directory: DirectoryService;
  parent: ParentService;
  fees: FeesService;
  ptm: PTMService;
  transport: TransportService;
  attendance: AttendanceService;
  leave: LeaveService;
}
