import { hueForName, type SubjectHue } from '@/theme';
import { SUBJECT_HUES } from '@/theme/derive';
import { monogramFromName } from '@/components/ui/monogram';
import { receiptStatusFromDto } from '@/lib/chatReceipt';
import type {
  Achievement, Announcement, AttendanceDay, AttendanceFlag, ChatMessage, ChatThread,
  Child, Exam, Fee, Grade, Homework, InboxNotice, LeaveRequest, Parent, Peer, PTMMeeting,
  Role, School, Session, Student, Subject, Teacher, TodayBlock, Transport,
} from '@/models';
import type {
  AchievementDTO, AnnouncementDTO, AttendanceMonthDTO, AttendanceRecordDTO, ChatMessageDTO, ChatThreadDTO,
  ChildDTO, ExamPaperDTO, FeeInvoiceDTO, GradeDTO, HomeworkDTO,
  LeaveRequestDTO, NotificationDTO, ParentDTO, PeerDTO, PTMMeetingDTO, SchoolDTO, SessionDTO, SessionUserDTO, StudentDTO,
  SubjectDTO, TeacherDTO, TimetableSlotDTO, TodayBlockDTO, TransportDTO,
} from './dtos';

function isParentRoleName(value: string): boolean {
  return /parent|guardian/i.test(value);
}

function isStudentRoleName(value: string): boolean {
  return /^student$/i.test(value) || /\.student$/i.test(value);
}

/** Roles claim from a JWT payload (unsigned decode — display/guard only). */
export function rolesFromAccessToken(token: string): string[] {
  try {
    const part = token.split('.')[1];
    if (!part) return [];
    const b64 = part.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
    const json = typeof globalThis.atob === 'function'
      ? globalThis.atob(padded)
      : Buffer.from(padded, 'base64').toString('utf8');
    const payload = JSON.parse(json) as { role?: unknown };
    const role = payload.role;
    if (Array.isArray(role)) return role.filter((r): r is string => typeof r === 'string');
    if (typeof role === 'string') return [role];
    return [];
  } catch {
    return [];
  }
}

/** Map /auth/me (role or roles[]) to the app's student|parent role. */
export function appRoleFromMe(me: SessionUserDTO, fallback: Role = 'student'): Role {
  const roles = me.roles ?? [];
  if (roles.some(isParentRoleName) || me.role === 'parent') return 'parent';
  if (roles.some(isStudentRoleName) || me.role === 'student') return 'student';
  return fallback;
}

export const toSession = (d: SessionDTO, fallbackRole: Role = 'student'): Session => ({
  token: d.access_token,
  role: d.user ? appRoleFromMe(d.user, fallbackRole) : fallbackRole,
  email: d.user?.email ?? '',
});
export const toSchool = (d: SchoolDTO): School => ({
  id: d.id,
  name: d.name,
  shortName: d.short_name,
  logoUrl: d.logo_url ?? '',
  imageUrl: (d.image_url ?? '').trim() || undefined,
});

/** Build School from GET /auth/me tenant_* fields. */
export function schoolFromMe(me: SessionUserDTO): School {
  const name = (me.tenant_name ?? '').trim() || 'School';
  const parts = name.split(/\s+/).filter(Boolean);
  const shortName =
    parts.length >= 2
      ? parts.map((p) => p[0]).join('').slice(0, 4).toUpperCase()
      : name.slice(0, 12);
  return {
    id: me.tenant_id ?? '',
    name,
    shortName,
    logoUrl: (me.tenant_logo_url ?? '').trim(),
    imageUrl: (me.tenant_image_url ?? '').trim() || undefined,
  };
}

export function initialsFrom(name?: string | null): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export const toStudent = (d: StudentDTO): Student => ({
  name: d.name,
  initials: d.initials || initialsFrom(d.name),
  grade: d.grade ?? '',
  roll: Number(d.roll) || 0,
  school: d.school ?? '',
  studentId: d.admission_no ?? '',
  email: (d.email ?? '').trim(),
  classroom: d.class_label ?? '',
  house: d.house ?? '',
  overallAvg: d.overall_avg ?? 0,
  attnPct: d.attendance_pct == null ? null : Number(d.attendance_pct),
  rank: d.rank ?? 0,
  rankOf: d.rank_of ?? 0,
  gender: (d.gender ?? '').trim(),
  section: (d.section ?? '').trim(),
  dob: (d.dob ?? '').trim().slice(0, 10),
  address: (d.address ?? '').trim(),
  guardianName: (d.guardian_name ?? '').trim(),
  guardianPhone: (d.guardian_phone ?? '').trim(),
  photoUrl: (d.photo_url ?? '').trim() || undefined,
});

export const toSubject = (d: SubjectDTO): Subject => {
  const name = d.name ?? 'Subject';
  const color = (d.color as SubjectHue | undefined);
  return {
    id: String(d.id),
    name,
    short: subjectShortCode(name, d.short),
    teacher: d.teacher_name ?? d.teacher ?? '',
    avg: d.avg ?? 0,
    trend: d.trend ?? 0,
    color: color && typeof color === 'string' ? (color as SubjectHue) : hueForName(name),
  };
};
export const toTodayBlock = (d: TodayBlockDTO): TodayBlock => ({ t: d.t, d: d.d, label: d.label, subjId: d.subject_id, kind: d.kind, room: d.room, teacher: d.teacher });
export const toPeer = (d: PeerDTO): Peer => ({ id: d.id, name: d.name, initials: d.initials, subj: d.subject });

const ACH_ICONS: Achievement['icon'][] = ['award', 'star', 'check', 'flag'];

export function formatAchievementWhen(date: string): string {
  const raw = (date ?? '').trim();
  if (!raw) return '';
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return raw;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return d.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
}

export const toAchievement = (d: AchievementDTO): Achievement => ({
  id: String(d.id),
  title: (d.title ?? '').trim() || 'Achievement',
  when: formatAchievementWhen(d.date ?? ''),
  icon: ACH_ICONS.includes(d.icon as Achievement['icon']) ? (d.icon as Achievement['icon']) : 'award',
  hue: (d.hue as Achievement['hue']) ?? 'blue',
});
const TEACHER_ROLES: Teacher['role'][] = ['principal', 'class_teacher', 'subject_teacher'];

/**
 * The backend's /teachers response has no `role` enum (see TeacherResponse in
 * Sms.Modules.Staffing) — only `designation` (free text) and `classTeacher`
 * (non-null when this teacher is that class's homeroom teacher). Infer our
 * grouping role from those, honoring an explicit `role` if a future backend adds one.
 */
const PRINCIPAL_DESIGNATIONS = [
  'principal',
  'vice principal',
  'headmaster',
  'headmistress',
  'head teacher',
  'school head',
  'head of school',
  'admin',
  'administrator',
];

function inferTeacherRole(d: TeacherDTO): Teacher['role'] {
  if (TEACHER_ROLES.includes(d.role as Teacher['role'])) return d.role as Teacher['role'];
  // Normalize punctuation so "Vice-Principal" / "vice_principal" / "vice  principal"
  // all match the same way as "vice principal".
  const designation = (d.designation ?? '')
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ');
  if (PRINCIPAL_DESIGNATIONS.some((title) => designation.includes(title))) return 'principal';
  if ((d.class_teacher ?? '').trim()) return 'class_teacher';
  return 'subject_teacher';
}

export const toTeacher = (d: TeacherDTO): Teacher => {
  const name = (d.name ?? '').trim();
  const subj = (d.subject ?? d.subjects?.find(Boolean) ?? d.department ?? '').trim();
  return {
    id: String(d.id),
    name,
    initials: (d.initials ?? '').trim() || monogramFromName(name),
    subj,
    online: !!d.online,
    role: inferTeacherRole(d),
    designation: (d.designation ?? '').trim() || undefined,
  };
};

const DAY_ALIASES: Record<string, string> = {
  monday: 'Mon', mon: 'Mon',
  tuesday: 'Tue', tue: 'Tue', tues: 'Tue',
  wednesday: 'Wed', wed: 'Wed',
  thursday: 'Thu', thu: 'Thu', thur: 'Thu', thurs: 'Thu',
  friday: 'Fri', fri: 'Fri',
  saturday: 'Sat', sat: 'Sat',
  sunday: 'Sun', sun: 'Sun',
};

export function weekdayShort(date = new Date()): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()];
}

export function normalizeWeekday(raw: string | null | undefined): string {
  const v = (raw ?? '').trim();
  if (!v) return '';
  if (/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)$/i.test(v)) {
    return v[0].toUpperCase() + v.slice(1, 3).toLowerCase();
  }
  return DAY_ALIASES[v.toLowerCase()] ?? v.slice(0, 3);
}

/** Parse 24h `HH:MM` or 12h `h:mm AM/PM` into minutes from midnight. */
export function parseHm(value: string | null | undefined): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  // Prefer the start of a range like "9:00 AM–9:45 AM".
  const rangeStart = trimmed.split(/[–—-]/)[0]?.trim() ?? trimmed;
  const ampm = rangeStart.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (ampm) {
    let h = Number(ampm[1]) % 12;
    if (/pm/i.test(ampm[3])) h += 12;
    return h * 60 + Number(ampm[2]);
  }
  const m = rangeStart.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function formatHm(minutes: number | null, fallback: string): string {
  if (minutes == null || !Number.isFinite(minutes)) return fallback;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = ((h + 11) % 12) + 1;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

const KNOWN_SUBJECT_SHORTS: Record<string, string> = {
  mathematics: 'MA',
  maths: 'MA',
  math: 'MA',
  english: 'EN',
  hindi: 'HI',
  science: 'SC',
  'social studies': 'SS',
  computer: 'CS',
  'computer science': 'CS',
  physics: 'PH',
  chemistry: 'CH',
  biology: 'BI',
  sanskrit: 'SA',
  'physical education': 'PE',
  pe: 'PE',
  arts: 'AR',
  art: 'AR',
  music: 'MU',
  evs: 'EV',
};

/**
 * Badge code for a subject. Prefers known academic codes, then a clean 2–4 letter
 * API short, then initials / first letters — never a lone garbage letter like "C".
 */
export function subjectShortCode(name: string, apiShort?: string | null): string {
  const n = (name ?? '').trim();
  if (!n) return '—';
  const known = KNOWN_SUBJECT_SHORTS[n.toLowerCase()];
  if (known) return known;
  const raw = (apiShort ?? '').trim().toUpperCase();
  if (/^[A-Z]{2,4}$/.test(raw)) return raw;
  const parts = n.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .map((p) => p[0] ?? '')
      .join('')
      .slice(0, 3)
      .toUpperCase();
  }
  return n.slice(0, 2).toUpperCase();
}

/** Chronological order: startMin → period → display time. Never localeCompare 12h strings. */
export function compareTimetableBlocks(
  a: Pick<TodayBlock, 't' | 'period' | 'startMin'>,
  b: Pick<TodayBlock, 't' | 'period' | 'startMin'>,
): number {
  const aMin = a.startMin ?? parseHm(a.t);
  const bMin = b.startMin ?? parseHm(b.t);
  if (aMin != null && bMin != null && aMin !== bMin) return aMin - bMin;
  if (a.period != null && b.period != null && a.period !== b.period) return a.period - b.period;
  if (aMin != null && bMin == null) return -1;
  if (aMin == null && bMin != null) return 1;
  return (a.period ?? 0) - (b.period ?? 0);
}

export function toTimetableBlock(
  slot: TimetableSlotDTO,
  subjects: Subject[] = [],
): TodayBlock & { day: string } {
  const name = (slot.subject ?? '').trim();
  const isBreak = /break|lunch|recess/i.test(name);
  const match = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const startMin = parseHm(slot.start_time);
  const endMin = parseHm(slot.end_time);
  const duration =
    startMin != null && endMin != null && endMin > startMin ? endMin - startMin : 40;
  const period = slot.period != null && Number.isFinite(slot.period) ? Number(slot.period) : undefined;
  // Keep `t` start-only — the schedule time column is ~50px and ranges overflow into badges.
  const startLabel = formatHm(startMin, period != null ? `P${period}` : '—');
  const endLabel = formatHm(endMin, '');
  return {
    t: startLabel,
    endT: endLabel || undefined,
    d: duration,
    label: name || (isBreak ? 'Break' : 'Period'),
    subjId: match?.id,
    kind: isBreak ? 'break' : 'class',
    room: slot.room ?? undefined,
    teacher: slot.teacher_name ?? match?.teacher,
    teacherId: slot.teacher_id ?? undefined,
    period,
    startMin: startMin ?? undefined,
    day: normalizeWeekday(slot.day),
  };
}

export const toHomework = (d: HomeworkDTO): Homework => ({
  id: String(d.id),
  title: d.title ?? 'Homework',
  subjId: d.subject_id ? String(d.subject_id) : '',
  due: d.due_date ?? '',
  dueT: d.due_time ?? '',
  status: d.status,
  priority: d.priority ?? 'med',
  grade: d.grade,
});
export const toExam = (d: ExamPaperDTO): Exam => {
  const statusRaw = (d.status ?? '').trim().toLowerCase();
  const status: Exam['status'] =
    statusRaw === 'graded' || statusRaw === 'completed' || statusRaw === 'published'
      ? 'graded'
      : 'upcoming';
  const mins = Number(d.duration_min ?? 0);
  const dateRaw = d.date ?? '';
  return {
    id: String(d.id),
    title: (d.name ?? d.subject ?? 'Exam').trim() || 'Exam',
    subjId: d.subject_id ? String(d.subject_id) : '',
    subjectName: (d.subject ?? '').trim() || undefined,
    classId: d.class_id ? String(d.class_id) : undefined,
    date: typeof dateRaw === 'string' ? dateRaw.slice(0, 10) : '',
    time: d.start_time ?? '',
    dur: mins > 0 ? `${mins} min` : '',
    status,
    max: Number(d.max_marks ?? 0) || 0,
    score: d.score,
    grade: d.grade,
  };
};
export const toGrade = (d: GradeDTO): Grade => {
  const score = Number(d.marks ?? d.score ?? 0);
  const max = Number(d.max_marks ?? 0);
  const dateRaw = d.date;
  const date =
    typeof dateRaw === 'string'
      ? dateRaw.slice(0, 10)
      : dateRaw
        ? String(dateRaw).slice(0, 10)
        : '';
  return {
    id: String(d.id),
    subjId: d.subject_id ? String(d.subject_id) : '',
    subjectName: (d.subject ?? '').trim() || undefined,
    title: (d.paper_name ?? d.title ?? d.subject ?? 'Exam').trim() || 'Exam',
    score: Number.isFinite(score) ? score : 0,
    max: Number.isFinite(max) && max > 0 ? max : 100,
    grade: (d.grade ?? '').trim(),
    date,
  };
};

export const toAnnouncement = (d: AnnouncementDTO): Announcement => ({ id: d.id, from: d.from, role: d.role, when: d.date, title: d.title, body: d.body });
export const toNotice = (d: NotificationDTO): Announcement => {
  const chat = (d.tone ?? '').trim().toLowerCase() === 'chat';
  return {
    id: String(d.id),
    from: chat ? (d.title ?? 'Chat') : 'School',
    role: chat ? 'message' : 'notice',
    when: (d.time ?? '').toString(),
    title: chat ? `Message from ${d.title ?? 'teacher'}` : (d.title ?? 'Notice'),
    body: (d.body ?? '').trim(),
  };
};

export const toInboxNotice = (d: NotificationDTO): InboxNotice => ({
  id: String(d.id),
  title: (d.title ?? 'Notice').trim(),
  body: (d.body ?? '').trim(),
  unread: d.unread !== false,
  tone: (d.tone ?? '').trim(),
});
export const toChatThread = (d: ChatThreadDTO): ChatThread => ({
  id: String(d.id),
  name: (d.name ?? '').trim() || 'Conversation',
  role: (d.role ?? '').trim(),
  last: (d.last_message ?? '').trim(),
  when: formatChatWhen(d.last_at),
  unread: Number(d.unread) || 0,
  kid: d.child_id ?? null,
  group: !!d.group,
});
export const toChatMessage = (d: ChatMessageDTO): ChatMessage => ({
  id: String(d.id),
  threadId: String(d.thread_id),
  from: d.is_mine ? 'me' : 'them',
  text: (d.text ?? '').trim(),
  time: formatChatWhen(d.sent_at),
  status: receiptStatusFromDto(d),
  imageUrl: d.image_url?.trim() || undefined,
});

/** Clock time stays as-is; ISO timestamps become a short local label. */
export function formatChatWhen(raw: string | null | undefined): string {
  if (!raw) return '';
  const s = String(raw).trim();
  if (!s) return '';
  if (/^\d{1,2}:\d{2}(\s*[AP]M)?$/i.test(s) || /^now$/i.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s;
  const sameDay = d.toDateString() === new Date().toDateString();
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  if (sameDay) return time;
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
}

function feeLabelFromStudent(d: StudentDTO): string {
  const status = (d.fee_status ?? '').trim();
  if (status) {
    const lower = status.toLowerCase();
    if (lower === 'paid') return 'Paid';
    if (lower === 'due' || lower === 'partial' || lower === 'overdue') return 'Due';
    return status;
  }
  if (d.fee_due != null && Number(d.fee_due) > 0) return 'Due';
  return '—';
}

function hueFromAvatar(n?: number | null): SubjectHue | undefined {
  if (n == null || !Number.isFinite(Number(n))) return undefined;
  return SUBJECT_HUES[Math.abs(Number(n)) % SUBJECT_HUES.length];
}

export const toParent = (d: ParentDTO): Parent => ({ name: d.name, initials: d.initials, relation: d.relation, email: d.email, phone: d.phone });
export const toChild = (d: ChildDTO | StudentDTO): Child => {
  const student = d as StudentDTO;
  const child = d as ChildDTO;
  const name = d.name ?? '';
  const classLabel = (student.class_label ?? '').trim();
  const gradeFromParts = [student.grade, student.section].filter(Boolean).join('-');
  return {
    id: String(d.id),
    name,
    initials: child.initials || student.initials || initialsFrom(name),
    grade: classLabel || gradeFromParts || child.grade || '',
    school: child.school || student.school || '',
    studentId: (student.admission_no ?? '').trim() || undefined,
    avg: Number(child.avg ?? student.overall_avg ?? 0) || 0,
    attn: Number(child.attn ?? student.attendance_pct ?? 0) || 0,
    fee: child.fee || feeLabelFromStudent(student),
    unread: child.unread ?? 0,
    hue: child.hue || hueFromAvatar(student.avatar_hue) || hueForName(name),
  };
};

export const toFee = (d: FeeInvoiceDTO): Fee => ({ id: d.id, period: d.period, dueDate: d.due_date, amount: d.amount, status: d.status, paidAmount: d.paid_amount, items: d.items?.map((i) => ({ l: i.label, amt: i.amount })), paidOn: d.paid_on, method: d.method });
export const toPTM = (d: PTMMeetingDTO): PTMMeeting => ({ id: d.id, date: d.date, time: d.time, teacher: d.teacher, subj: d.subject, child: d.child, mode: d.mode, status: d.status });
export const toTransport = (d: TransportDTO): Transport => ({ busNo: d.bus_no, driver: d.driver, plate: d.plate, eta: d.eta, pickupStop: d.pickup_stop, nextStops: d.next_stops.map((s) => ({ stop: s.stop, eta: s.eta, done: s.done, you: s.you })) });

export const toAttendanceMonth = (d: AttendanceMonthDTO): { days: AttendanceDay[]; flags: AttendanceFlag[] } => ({
  days: d.days.map((x) => ({ d: x.d, kind: x.kind })),
  flags: d.flags.map((f) => ({ id: f.id, tone: f.tone, date: f.date, reason: f.reason, action: f.action })),
});

export function toAttendanceFromRecords(rows: AttendanceRecordDTO[] | null | undefined): {
  days: AttendanceDay[];
  flags: AttendanceFlag[];
} {
  const lastByDate = new Map<string, AttendanceRecordDTO>();
  for (const row of rows ?? []) {
    const date = typeof row.date === 'string' ? row.date.slice(0, 10) : '';
    if (date) lastByDate.set(date, row);
  }

  const days: AttendanceDay[] = [];
  const flags: AttendanceFlag[] = [];
  for (const [date, row] of lastByDate) {
    const day = Number(date.slice(8, 10));
    const status = (row.status ?? '').toLowerCase();
    const kind: AttendanceDay['kind'] =
      status === 'late'
        ? 'late'
        : status === 'absent'
          ? 'absent'
          : status === 'leave' || status === 'v' || status === 'off'
            ? 'off'
            : 'present';
    if (!Number.isFinite(day) || day < 1) continue;
    days.push({ d: day, kind });
    if (kind === 'absent' || kind === 'late') {
      flags.push({
        id: row.id,
        tone: kind,
        date,
        reason: kind === 'late' ? 'Late' : 'Absent',
        action: '',
      });
    }
  }
  return { days, flags };
}
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({ id: d.id, childId: d.child_id, from: d.from_date, to: d.to_date, reason: d.reason, note: d.note, status: d.status });
