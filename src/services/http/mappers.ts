import type {
  Achievement, Announcement, AttendanceDay, AttendanceFlag, ChatMessage, ChatThread,
  Child, ChildToday, Exam, Fee, Grade, Homework, HomeworkStatus, LeaveRequest, Parent, Peer, PTMMeeting,
  Role, School, Session, Student, Subject, Teacher, TodayBlock, Transport,
} from '@/models';
import { hueForName } from '@/theme';
import type {
  AchievementDTO, AnnouncementDTO, AttendanceMonthDTO, AttendanceRecordDTO, CalendarEventDTO,
  ChatMessageDTO, ChatThreadDTO, ChildBusDTO, ChildDTO, ChildTodayDTO, ExamPaperDTO, FeeInvoiceDTO,
  GradeDTO, HomeworkDTO, LeaveRequestDTO, ParentDTO, PeerDTO, PTMMeetingDTO, SchoolDTO, SessionDTO,
  StudentDTO, SubjectDTO, TeacherDTO, TimetableSlotDTO, TodayBlockDTO, TransportDTO,
} from './dtos';

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback;
}

function num(v: unknown, fallback = 0): number {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return fallback;
}

export function initialsFrom(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function asDateLabel(value: unknown): string {
  if (typeof value !== 'string' || !value) return '';
  const day = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(day) ? day : value;
}

function asHomeworkStatus(raw: unknown): HomeworkStatus {
  const v = str(raw).toLowerCase();
  if (v === 'progress' || v === 'in_progress' || v === 'in-progress') return 'progress';
  if (v === 'submitted' || v === 'complete' || v === 'completed') return 'submitted';
  if (v === 'graded' || v === 'done') return 'graded';
  return 'todo';
}

function asPriority(raw: unknown): Homework['priority'] {
  const v = str(raw, 'med').toLowerCase();
  if (v === 'high' || v === 'urgent') return 'high';
  if (v === 'low') return 'low';
  return 'med';
}

export function mapList<TIn, TOut>(rows: TIn[] | null | undefined, map: (d: TIn) => TOut): TOut[] {
  return Array.isArray(rows) ? rows.map(map) : [];
}

export const toSession = (d: SessionDTO, fallbackRole: Role = 'student'): Session => ({
  token: d.access_token,
  role: d.user?.role ?? fallbackRole,
  email: d.user?.email ?? '',
});
export const toSchool = (d: SchoolDTO): School => ({ id: d.id, name: d.name, shortName: d.short_name, logoUrl: d.logo_url });

/** Class shown in the app: class_label, else Grade-Section (matches admin class names). */
export function classDisplay(d: Pick<StudentDTO, 'grade' | 'section' | 'class_label'>): string {
  const label = str(d.class_label).trim();
  if (label) return label;
  const grade = str(d.grade).trim();
  const section = str(d.section).trim();
  if (grade && section) return `${grade}-${section}`;
  return grade;
}

export const toStudent = (d: StudentDTO): Student => {
  const name = str(d.name);
  return {
    name,
    initials: str(d.initials) || initialsFrom(name),
    grade: str(d.grade),
    roll: num(d.roll),
    school: str(d.school),
    studentId: str(d.admission_no),
    email: str(d.email),
    classroom: classDisplay(d),
    house: str(d.house),
    overallAvg: num(d.overall_avg),
    attnPct: num(d.attendance_pct),
    rank: num(d.rank),
    rankOf: num(d.rank_of),
  };
};

export const toSubject = (d: SubjectDTO): Subject => {
  const name = str(d.name, 'Subject');
  return {
    id: str(d.id),
    name,
    short: str(d.short) || name.slice(0, 2).toUpperCase() || '—',
    teacher: str(d.teacher) || str(d.teacher_name),
    avg: num(d.avg),
    trend: num(d.trend),
    // Always hash subject name like teacher-app deriveColorSet(subject)
    color: hueForName(name),
  };
};
export const toTodayBlock = (d: TodayBlockDTO): TodayBlock => ({ t: d.t, d: d.d, label: d.label, subjId: d.subject_id, kind: d.kind, room: d.room, teacher: d.teacher });
export const toPeer = (d: PeerDTO): Peer => ({ id: d.id, name: d.name, initials: d.initials, subj: d.subject });
export const toAchievement = (d: AchievementDTO): Achievement => ({ id: d.id, title: d.title, when: d.date, icon: d.icon, hue: d.hue });
export const toTeacher = (d: TeacherDTO): Teacher => {
  const name = str(d.name);
  const fromList = Array.isArray(d.subjects) ? str(d.subjects[0]) : '';
  return {
    id: str(d.id),
    name,
    initials: str(d.initials) || initialsFrom(name),
    subj: str(d.subject) || fromList || str(d.department),
    online: Boolean(d.online),
  };
};

export const toHomework = (d: HomeworkDTO): Homework => ({
  id: str(d.id),
  title: str(d.title, 'Homework'),
  subjId: str(d.subject_id),
  due: asDateLabel(d.due_date),
  dueT: str(d.due_time),
  status: asHomeworkStatus(d.status),
  priority: asPriority(d.priority),
  grade: d.grade,
});
export const toExam = (d: ExamPaperDTO): Exam => {
  const hasScore = d.score != null && Number.isFinite(Number(d.score));
  const statusRaw = str(d.status).toLowerCase();
  return {
    id: str(d.id),
    title: str(d.name, 'Exam'),
    subjId: str(d.subject_id),
    date: asDateLabel(d.date),
    time: str(d.start_time),
    dur: d.duration_min == null ? '' : String(d.duration_min),
    status: hasScore || statusRaw === 'graded' ? 'graded' : 'upcoming',
    max: num(d.max_marks),
    score: hasScore ? num(d.score) : undefined,
    grade: d.grade,
  };
};
export const toGrade = (d: GradeDTO): Grade => ({
  id: str(d.id),
  subjId: str(d.subject_id),
  title: str(d.title || d.paper_name || d.subject, 'Assessment'),
  score: num(d.score ?? d.marks),
  max: num(d.max_marks, 100),
  grade: str(d.grade),
  date: asDateLabel(d.date),
});

export const toAnnouncement = (d: AnnouncementDTO): Announcement => ({
  id: str(d.id),
  from: str(d.from, 'School'),
  role: str(d.role, 'school'),
  when: asDateLabel(d.date),
  title: str(d.title),
  body: str(d.body),
});
export const toChatThread = (d: ChatThreadDTO): ChatThread => ({ id: d.id, name: d.name, role: d.role, last: d.last_message, when: d.last_at, unread: d.unread, kid: d.child_id ?? null, group: d.group });
export const toChatMessage = (d: ChatMessageDTO): ChatMessage => ({ id: d.id, threadId: d.thread_id, from: d.is_mine ? 'me' : 'them', text: d.text, time: d.sent_at });

export const toParent = (d: ParentDTO): Parent => ({ name: d.name, initials: d.initials, relation: d.relation, email: d.email, phone: d.phone });
export const toChild = (d: ChildDTO): Child => ({ id: d.id, name: d.name, initials: d.initials, grade: d.grade, school: d.school, avg: d.avg, attn: d.attn, fee: d.fee, unread: d.unread, hue: d.hue });
export const toChildToday = (d: ChildTodayDTO): ChildToday => ({
  classes: d.classes.map((c) => ({ t: c.t, label: c.label, done: c.done })),
  meals: d.meals,
  pickup: d.pickup,
  todayAttn: d.today_attn ?? null,
});

export const toFee = (d: FeeInvoiceDTO): Fee => ({ id: d.id, period: d.period, dueDate: d.due_date, amount: d.amount, status: d.status, items: d.items?.map((i) => ({ l: i.label, amt: i.amount })), paidOn: d.paid_on, method: d.method });
export const toPTM = (d: PTMMeetingDTO): PTMMeeting => ({ id: d.id, date: d.date, time: d.time, teacher: d.teacher, subj: d.subject, child: d.child, mode: d.mode, status: d.status });
export const toTransport = (d: TransportDTO): Transport => ({ busNo: d.bus_no, driver: d.driver, plate: d.plate, eta: d.eta, pickupStop: d.pickup_stop, nextStops: d.next_stops.map((s) => ({ stop: s.stop, eta: s.eta, done: s.done, you: s.you })) });

export const toAttendanceMonth = (d: AttendanceMonthDTO): { days: AttendanceDay[]; flags: AttendanceFlag[] } => ({
  days: d.days.map((x) => ({ d: x.d, kind: x.kind })),
  flags: d.flags.map((f) => ({ id: f.id, tone: f.tone, date: f.date, reason: f.reason, action: f.action })),
});
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({
  id: str(d.id),
  childId: str(d.child_id),
  from: asDateLabel(d.from_date),
  to: asDateLabel(d.to_date),
  reason: str(d.reason),
  note: str(d.note),
  status: (str(d.status, 'pending').toLowerCase() as LeaveRequest['status']) || 'pending',
});

const DAY_SHORT: Record<string, string> = {
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

export function normalizeWeekday(raw: unknown): string {
  const v = str(raw).trim();
  if (!v) return '';
  return DAY_SHORT[v.toLowerCase()] ?? (v.length >= 3 ? `${v[0].toUpperCase()}${v.slice(1, 3).toLowerCase()}` : v);
}

function parseMinutes(hhmm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(hhmm.trim());
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

function durationMin(start?: string, end?: string): number {
  const a = start ? parseMinutes(start) : null;
  const b = end ? parseMinutes(end) : null;
  if (a == null || b == null || b <= a) return 45;
  return b - a;
}

export function toTimetableBlock(
  d: TimetableSlotDTO,
  subjects: Subject[] = [],
): TodayBlock & { day: string } {
  const name = str(d.subject, 'Class');
  const sub = subjects.find((s) => s.name.toLowerCase() === name.toLowerCase());
  const kind: TodayBlock['kind'] = /break|lunch|recess/i.test(name) ? 'break' : 'class';
  return {
    day: normalizeWeekday(d.day),
    t: str(d.start_time) || (d.period != null ? `P${d.period}` : ''),
    d: durationMin(d.start_time, d.end_time),
    label: name,
    subjId: sub?.id,
    kind,
    room: d.room,
    teacher: d.teacher_name,
  };
}

export function minutesUntil(hhmm: string, now = new Date()): number | null {
  const target = parseMinutes(hhmm);
  if (target == null) return null;
  const diff = target - (now.getHours() * 60 + now.getMinutes());
  return diff;
}

export function toAttendanceFromRecords(rows: AttendanceRecordDTO[] | null | undefined): {
  days: AttendanceDay[];
  flags: AttendanceFlag[];
} {
  const days: AttendanceDay[] = [];
  const flags: AttendanceFlag[] = [];
  const lastByDate = new Map<string, AttendanceRecordDTO>();
  for (const row of mapList(rows, (x) => x)) {
    lastByDate.set(asDateLabel(row.date), row);
  }
  for (const r of lastByDate.values()) {
    const date = asDateLabel(r.date);
    const d = Number(date.slice(8, 10));
    const status = str(r.status).toLowerCase();
    const kind: AttendanceDay['kind'] =
      status === 'late'
        ? 'late'
        : status === 'absent'
          ? 'absent'
          : status === 'off' || status === 'leave' || status === 'v'
            ? 'off'
            : 'present';
    if (Number.isFinite(d) && d > 0) days.push({ d, kind });
    if (kind === 'absent' || kind === 'late') {
      flags.push({
        id: str(r.id),
        tone: kind,
        date,
        reason: kind === 'late' ? 'Late' : 'Absent',
        action: '',
      });
    }
  }
  return { days, flags };
}

export function toPTMFromCalendar(d: CalendarEventDTO): PTMMeeting {
  return {
    id: str(d.id),
    date: asDateLabel(d.date),
    time: str(d.time),
    teacher: '',
    subj: str(d.type, 'event'),
    child: '',
    mode: 'in-person',
    status: 'pending',
  };
}

export function toTransportFromBus(d: ChildBusDTO): Transport {
  const stop = str(d.next_stop_name);
  return {
    busNo: str(d.bus_no, '—'),
    driver: '',
    plate: '',
    eta: str(d.status),
    pickupStop: stop,
    nextStops: stop ? [{ stop, eta: '', done: false, you: true }] : [],
  };
}
