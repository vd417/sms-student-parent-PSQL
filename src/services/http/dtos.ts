import type {
  HomeworkStatus, TodayBlock, Subject, AttendanceDay, AttendanceFlag, Child,
} from '@/models';

// ── Auth / school ──
// Live /auth/login returns tokens only; /auth/me supplies identity fields.
export interface SessionUserDTO {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: 'student' | 'parent';
  roles?: string[];
  student_id?: string | null;
  tenant_id?: string | null;
  /** School display fields from live GET /auth/me (no dedicated GET /school). */
  tenant_name?: string | null;
  tenant_logo_url?: string | null;
  tenant_image_url?: string | null;
}
export interface SessionTenantDTO { id: string; name?: string; }
export interface SessionDTO {
  access_token: string;
  refresh_token?: string | null;
  user?: SessionUserDTO;
  tenant?: SessionTenantDTO;
}
export interface SchoolDTO {
  id: string;
  name: string;
  short_name?: string;
  logo_url: string;
  image_url?: string | null;
}

// ── Student (canonical: admission_no, attendance_pct, class_label, overall_avg, rank_of) ──
export interface StudentDTO {
  id: string;
  admission_no?: string;
  name: string;
  initials?: string;
  gender?: string | null;
  grade?: string;
  section?: string | null;
  class_label?: string;
  roll?: number;
  house?: string;
  email?: string | null;
  school?: string;
  dob?: string | null;
  address?: string | null;
  guardian_name?: string | null;
  guardian_phone?: string | null;
  photo_url?: string | null;
  attendance_pct?: number | null;
  overall_avg?: number;
  rank?: number;
  rank_of?: number;
  fee_status?: string | null;
  fee_due?: number | null;
  avatar_hue?: number | null;
}

export interface SubjectDTO {
  id: string;
  name: string;
  short?: string | null;
  teacher?: string | null;
  teacher_name?: string | null;
  avg?: number | null;
  trend?: number | null;
  color?: string | null;
}
export interface TodayBlockDTO { t: string; d: number; label: string; subject_id?: string; kind: TodayBlock['kind']; room?: string; teacher?: string; }
export interface TimetableSlotDTO {
  id: string;
  day: string;
  period?: number;
  subject?: string | null;
  class_id?: string | null;
  class_name?: string | null;
  room?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  teacher_name?: string | null;
  teacher_id?: string | null;
}
export interface PeerDTO { id: string; name: string; initials: string; subject: string; }
export interface AchievementDTO {
  id: string;
  title: string;
  date: string;
  icon?: string;
  hue?: string;
}

export interface HomeworkDTO { id: string; assignment_id?: string; title: string; subject_id: string; due_date: string; due_time: string; status: HomeworkStatus; priority: 'low' | 'med' | 'high'; grade?: string; }
export interface ExamPaperDTO {
  id: string;
  name: string;
  subject_id: string;
  subject?: string | null;
  class_id?: string | null;
  date: string;
  start_time: string;
  duration_min: number;
  status: string;
  max_marks: number;
  score?: number;
  grade?: string;
}
/** Live GradeResponse — student report card uses marks/paper_name/subject from GET /grades. */
export interface GradeDTO {
  id: string;
  subject_id?: string | null;
  subject?: string | null;
  title?: string | null;
  paper_name?: string | null;
  /** Canonical score field on GradeResponse. */
  marks?: number | null;
  score?: number | null;
  max_marks?: number | null;
  grade?: string | null;
  date?: string | null;
  exam_published?: boolean | null;
}

export interface AnnouncementDTO { id: string; from: string; role: string; date: string; title: string; body: string; type: string; pinned?: boolean; }
export interface NotificationDTO {
  id: string;
  icon?: string | null;
  tone?: string | null;
  title: string;
  body?: string | null;
  time?: string | null;
  unread?: boolean;
}
export interface AppSettingsDTO {
  chat_alerts?: boolean;
  school_notices?: boolean;
  in_app_toasts?: boolean;
}
export interface ChatThreadDTO {
  id: string;
  name: string;
  role?: string | null;
  last_message?: string | null;
  last_at?: string | null;
  unread?: number | null;
  child_id?: string | null;
  group?: boolean;
  online?: boolean;
}
export interface ChatMessageDTO {
  id: string;
  thread_id: string;
  sender_id?: string | null;
  text?: string | null;
  sent_at?: string | null;
  is_mine?: boolean;
  image_url?: string | null;
  delivered_at?: string | null;
  read_at?: string | null;
  is_delivered?: boolean;
  is_read?: boolean;
}
export interface TeacherDTO {
  id: string;
  name: string;
  initials?: string | null;
  subject?: string | null;
  subjects?: string[] | null;
  department?: string | null;
  online?: boolean;
  role?: string | null;
  /** Non-null (usually a class label like "IV-B") when this teacher is that class's homeroom teacher. */
  class_teacher?: string | null;
  designation?: string | null;
}

// ── Parent ──
export interface ParentDTO { name: string; initials: string; relation: string; email: string; phone: string; }
export interface ChildDTO { id: string; name: string; initials: string; grade: string; school: string; avg: number; attn: number; fee: string; unread: number; hue: Child['hue']; }
export interface ChildClassDTO { t: string; label: string; done: boolean; attn: 'present' | 'late' | null; }
export interface ChildTodayDTO { classes: ChildClassDTO[]; meals: { breakfast: string; lunch: string }; pickup: string; }

// The backend's real field is `lines` — a per-Fee-Head breakdown (e.g. "Transport Fee") that's
// snapshotted at invoice-generation time — not `items`. A manually created invoice (flat amount,
// no fee structure) has no lines: an empty/absent array here is real, not a bug.
export interface FeeInvoiceLineDTO { head_id?: string | null; head_name: string; amount: number; description?: string | null; }
export interface FeeInvoiceDTO { id: string; period: string; due_date: string; amount: number; status: 'due' | 'partial' | 'paid'; paid_amount?: number; lines?: FeeInvoiceLineDTO[]; paid_on?: string; method?: string; }
export interface PTMMeetingDTO { id: string; date: string; time: string; teacher: string; subject: string; child: string; mode: string; status: 'confirmed' | 'pending'; }

export interface ChildBusPositionDTO {
  student_id: string;
  student_name: string;
  admission_no: string;
  bus_id: string;
  bus_no: string;
  route_name: string | null;
  status: 'idle' | 'delayed' | 'at_stop' | 'on_route';
  lat: number | null;
  lng: number | null;
  speed_kmh: number | null;
  next_stop_name: string | null;
  last_ping_at: string | null;
}

export interface AttendanceDayDTO { d: number; kind: AttendanceDay['kind']; }
export interface AttendanceFlagDTO { id: string; tone: AttendanceFlag['tone']; date: string; reason: string; action: string; }
export interface AttendanceMonthDTO { days: AttendanceDayDTO[]; flags: AttendanceFlagDTO[]; }
export interface AttendanceRecordDTO {
  id: string;
  date?: string;
  status?: string;
  period?: number;
  subject?: string;
  subject_id?: string | null;
  marked_by_role?: string | null;
}

export interface LeaveRequestDTO { id: string; child_id: string; type?: 'casual' | 'sick' | 'earned' | 'medical' | 'maternity' | 'emergency' | 'other'; from_date: string; to_date: string; reason: string; note: string; status: 'pending' | 'approved' | 'rejected'; }
