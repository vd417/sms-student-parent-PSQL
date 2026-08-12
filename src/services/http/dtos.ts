import type {
  TodayBlock, Subject, Achievement, AttendanceDay, AttendanceFlag, Child,
} from '@/models';

// ── Auth / school ──
export interface SessionUserDTO {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'student' | 'parent';
  roles?: string[];
  student_id?: string;
  tenant_name?: string;
  tenant_id?: string;
  tenant_logo_url?: string;
  tenant_image_url?: string;
}
export interface SessionTenantDTO { id: string; name?: string; }
export interface SessionDTO {
  access_token: string;
  refresh_token?: string | null;
  user?: SessionUserDTO;
  tenant?: SessionTenantDTO;
}
export interface SchoolDTO { id: string; name: string; short_name?: string; logo_url: string; }

// ── Student (canonical: admission_no, attendance_pct, class_label, overall_avg, rank_of) ──
export interface StudentDTO {
  id: string;
  admission_no: string;
  name: string;
  initials?: string;
  grade?: string;
  section?: string;
  class_label?: string;
  house?: string;
  email?: string;
  school?: string;
  attendance_pct?: number;
  overall_avg?: number;
  rank?: number;
  rank_of?: number;
  roll?: number;
}

export interface SubjectDTO {
  id: string;
  name: string;
  short?: string;
  teacher?: string;
  teacher_name?: string;
  avg?: number;
  trend?: number;
  color?: Subject['color'] | string;
}
export interface TodayBlockDTO { t: string; d: number; label: string; subject_id?: string; kind: TodayBlock['kind']; room?: string; teacher?: string; }
export interface PeerDTO { id: string; name: string; initials: string; subject: string; }
export interface AchievementDTO { id: string; title: string; date: string; icon: Achievement['icon']; hue: Achievement['hue']; }

export interface HomeworkDTO {
  id: string;
  assignment_id?: string;
  title: string;
  subject_id?: string;
  due_date?: string;
  due_time?: string;
  status?: string;
  priority?: string;
  grade?: string;
}
export interface ExamPaperDTO {
  id: string;
  name?: string;
  subject?: string;
  subject_id?: string;
  class_id?: string;
  date?: string;
  start_time?: string;
  duration_min?: number;
  status?: string;
  max_marks?: number;
  /** Filled client-side for the logged-in student. */
  score?: number;
  grade?: string;
}
/** Wire shape from GET /grades?student_id= (dbo.Grades + paper join). */
export interface GradeDTO {
  id: string;
  student_id?: string;
  exam_paper_id?: string;
  marks?: number;
  score?: number;
  max_marks?: number;
  grade?: string;
  date?: string;
  subject_id?: string;
  subject?: string;
  paper_name?: string;
  exam_published?: boolean;
  title?: string;
}

export interface AnnouncementDTO {
  id: string;
  from?: string;
  role?: string;
  date?: string;
  title?: string;
  body?: string;
  type?: string;
  pinned?: boolean;
}
export interface ChatThreadDTO { id: string; name: string; role: string; last_message: string; last_at: string; unread: number; child_id?: string | null; group?: boolean; }
export interface ChatMessageDTO { id: string; thread_id: string; sender_id: string; text: string; sent_at: string; is_mine: boolean; }
export interface TeacherDTO {
  id: string;
  name: string;
  initials?: string;
  subject?: string;
  subjects?: string[];
  department?: string;
  online?: boolean;
}

// ── Parent ──
export interface ParentDTO { name: string; initials: string; relation: string; email: string; phone: string; }
export interface ChildDTO { id: string; name: string; initials: string; grade: string; school: string; avg: number; attn: number; fee: string; unread: number; hue: Child['hue']; }
export interface ChildClassDTO { t: string; label: string; done: boolean; }
export interface ChildTodayDTO {
  classes: ChildClassDTO[];
  meals: { breakfast: string; lunch: string };
  pickup: string;
  today_attn?: 'present' | 'absent' | 'late' | 'leave' | null;
}

export interface FeeItemDTO { label: string; amount: number; }
export interface FeeInvoiceDTO { id: string; period: string; due_date: string; amount: number; status: 'due' | 'paid'; items?: FeeItemDTO[]; paid_on?: string; method?: string; }
export interface PTMMeetingDTO { id: string; date: string; time: string; teacher: string; subject: string; child: string; mode: string; status: 'confirmed' | 'pending'; }

export interface TransportStopDTO { stop: string; eta: string; done: boolean; you?: boolean; }
export interface TransportDTO { bus_no: string; driver: string; plate: string; eta: string; pickup_stop: string; next_stops: TransportStopDTO[]; }

export interface AttendanceDayDTO { d: number; kind: AttendanceDay['kind']; }
export interface AttendanceFlagDTO { id: string; tone: AttendanceFlag['tone']; date: string; reason: string; action: string; }
export interface AttendanceMonthDTO { days: AttendanceDayDTO[]; flags: AttendanceFlagDTO[]; }

export interface LeaveRequestDTO { id: string; child_id?: string; type?: string; from_date?: string; to_date?: string; reason?: string; note?: string; status?: string; }

export interface TimetableSlotDTO {
  id: string;
  day: string;
  period?: number;
  subject?: string;
  class_id?: string;
  class_name?: string;
  room?: string;
  start_time?: string;
  end_time?: string;
  teacher_name?: string;
}

export interface CalendarEventDTO {
  id: string;
  title: string;
  date?: string;
  time?: string;
  type?: string;
  description?: string;
}

export interface AttendanceRecordDTO {
  id: string;
  date?: string;
  status?: string;
}

export interface ChildBusDTO {
  student_id?: string;
  student_name?: string;
  bus_id?: string;
  bus_no?: string;
  route_name?: string;
  status?: string;
  next_stop_name?: string;
}
