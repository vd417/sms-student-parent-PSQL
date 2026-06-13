import type {
  Achievement, Announcement, AttendanceDay, AttendanceFlag, ChatMessage, ChatThread,
  Child, ChildToday, Exam, Fee, Grade, Homework, LeaveRequest, Parent, Peer, PTMMeeting,
  School, Session, Student, Subject, Teacher, TodayBlock, Transport,
} from '@/models';
import type {
  AchievementDTO, AnnouncementDTO, AttendanceMonthDTO, ChatMessageDTO, ChatThreadDTO,
  ChildDTO, ChildTodayDTO, ExamPaperDTO, FeeInvoiceDTO, GradeDTO, HomeworkDTO,
  LeaveRequestDTO, ParentDTO, PeerDTO, PTMMeetingDTO, SchoolDTO, SessionDTO, StudentDTO,
  SubjectDTO, TeacherDTO, TodayBlockDTO, TransportDTO,
} from './dtos';

export const toSession = (d: SessionDTO): Session => ({ token: d.access_token, role: d.role, email: d.email });
export const toSchool = (d: SchoolDTO): School => ({ id: d.id, name: d.name, shortName: d.short_name, logoUrl: d.logo_url });

export const toStudent = (d: StudentDTO): Student => ({
  name: d.name, initials: d.initials, grade: d.grade, roll: 0, school: d.school,
  studentId: d.admission_no, email: d.email, classroom: d.class_label, house: d.house,
  overallAvg: d.overall_avg, attnPct: d.attendance_pct, rank: d.rank, rankOf: d.rank_of,
});

export const toSubject = (d: SubjectDTO): Subject => ({ id: d.id, name: d.name, short: d.short, teacher: d.teacher, avg: d.avg, trend: d.trend, color: d.color });
export const toTodayBlock = (d: TodayBlockDTO): TodayBlock => ({ t: d.t, d: d.d, label: d.label, subjId: d.subject_id, kind: d.kind, room: d.room, teacher: d.teacher });
export const toPeer = (d: PeerDTO): Peer => ({ id: d.id, name: d.name, initials: d.initials, subj: d.subject });
export const toAchievement = (d: AchievementDTO): Achievement => ({ id: d.id, title: d.title, when: d.date, icon: d.icon, hue: d.hue });
export const toTeacher = (d: TeacherDTO): Teacher => ({ id: d.id, name: d.name, initials: d.initials, subj: d.subject, online: d.online });

export const toHomework = (d: HomeworkDTO): Homework => ({ id: d.id, title: d.title, subjId: d.subject_id, due: d.due_date, dueT: d.due_time, status: d.status, priority: d.priority, grade: d.grade });
export const toExam = (d: ExamPaperDTO): Exam => ({ id: d.id, title: d.title, subjId: d.subject_id, date: d.date, time: d.start_time, dur: String(d.duration_min), status: d.status, max: d.max_marks, score: d.score, grade: d.grade });
export const toGrade = (d: GradeDTO): Grade => ({ id: d.id, subjId: d.subject_id, title: d.title, score: d.score, max: d.max_marks, grade: d.grade, date: d.date });

export const toAnnouncement = (d: AnnouncementDTO): Announcement => ({ id: d.id, from: d.from, role: d.role, when: d.date, title: d.title, body: d.body });
export const toChatThread = (d: ChatThreadDTO): ChatThread => ({ id: d.id, name: d.name, role: d.role, last: d.last_message, when: d.last_at, unread: d.unread, kid: d.child_id ?? null, group: d.group });
export const toChatMessage = (d: ChatMessageDTO): ChatMessage => ({ id: d.id, threadId: d.thread_id, from: d.is_mine ? 'me' : 'them', text: d.text, time: d.sent_at });

export const toParent = (d: ParentDTO): Parent => ({ name: d.name, initials: d.initials, relation: d.relation, email: d.email, phone: d.phone });
export const toChild = (d: ChildDTO): Child => ({ id: d.id, name: d.name, initials: d.initials, grade: d.grade, school: d.school, avg: d.avg, attn: d.attn, fee: d.fee, unread: d.unread, hue: d.hue });
export const toChildToday = (d: ChildTodayDTO): ChildToday => ({ classes: d.classes.map((c) => ({ t: c.t, label: c.label, done: c.done, attn: c.attn })), meals: d.meals, pickup: d.pickup });

export const toFee = (d: FeeInvoiceDTO): Fee => ({ id: d.id, period: d.period, dueDate: d.due_date, amount: d.amount, status: d.status, items: d.items?.map((i) => ({ l: i.label, amt: i.amount })), paidOn: d.paid_on, method: d.method });
export const toPTM = (d: PTMMeetingDTO): PTMMeeting => ({ id: d.id, date: d.date, time: d.time, teacher: d.teacher, subj: d.subject, child: d.child, mode: d.mode, status: d.status });
export const toTransport = (d: TransportDTO): Transport => ({ busNo: d.bus_no, driver: d.driver, plate: d.plate, eta: d.eta, pickupStop: d.pickup_stop, nextStops: d.next_stops.map((s) => ({ stop: s.stop, eta: s.eta, done: s.done, you: s.you })) });

export const toAttendanceMonth = (d: AttendanceMonthDTO): { days: AttendanceDay[]; flags: AttendanceFlag[] } => ({
  days: d.days.map((x) => ({ d: x.d, kind: x.kind })),
  flags: d.flags.map((f) => ({ id: f.id, tone: f.tone, date: f.date, reason: f.reason, action: f.action })),
});
export const toLeaveRequest = (d: LeaveRequestDTO): LeaveRequest => ({ id: d.id, childId: d.child_id, from: d.from_date, to: d.to_date, reason: d.reason, note: d.note, status: d.status });
