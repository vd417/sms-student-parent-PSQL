import type {
  Achievement,
  Announcement,
  AttendanceDay,
  AttendanceFlag,
  ChatMessage,
  ChatThread,
  Child,
  ChildToday,
  Exam,
  Fee,
  Grade,
  Homework,
  HomeworkStatus,
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

export interface AuthService {
  signIn(email: string, password: string, role: Role): Promise<Session>;
  signOut(): Promise<void>;
}

export interface StudentService {
  getProfile(): Promise<Student>;
  getToday(): Promise<TodayBlock[]>;
  getPeers(): Promise<Peer[]>;
  getAchievements(): Promise<Achievement[]>;
}

export interface SubjectsService {
  list(): Promise<Subject[]>;
  byId(id: string): Promise<Subject | undefined>;
}

export interface HomeworkService {
  list(): Promise<Homework[]>;
  byId(id: string): Promise<Homework | undefined>;
  setStatus(id: string, status: HomeworkStatus): Promise<Homework>;
  submit(id: string): Promise<Homework>;
}

export interface GradesService {
  listGrades(): Promise<Grade[]>;
  listExams(): Promise<Exam[]>;
}

export interface AnnouncementsService {
  list(audience: Role): Promise<Announcement[]>;
}

export interface MessagingService {
  threads(audience: Role): Promise<ChatThread[]>;
  messages(threadId: string): Promise<ChatMessage[]>;
  send(threadId: string, text: string): Promise<ChatMessage>;
}

export interface DirectoryService {
  teachers(): Promise<Teacher[]>;
}

export interface ParentService {
  getProfile(): Promise<Parent>;
  children(): Promise<Child[]>;
  childToday(childId: string): Promise<ChildToday>;
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
  forChild(childId: string): Promise<Transport>;
}

export interface AttendanceService {
  month(childId: string): Promise<{ days: AttendanceDay[]; flags: AttendanceFlag[] }>;
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
  messaging: MessagingService;
  directory: DirectoryService;
  parent: ParentService;
  fees: FeesService;
  ptm: PTMService;
  transport: TransportService;
  attendance: AttendanceService;
  leave: LeaveService;
}
