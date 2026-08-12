import type { Services } from '@/services/types';
import type { DailyAttendanceStatus } from '@/models';
import { apiFetch, setAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import type {
  SessionDTO, SessionUserDTO, SchoolDTO, StudentDTO, SubjectDTO, TodayBlockDTO, PeerDTO, AchievementDTO,
  HomeworkDTO, ExamPaperDTO, GradeDTO, AnnouncementDTO, ChatThreadDTO, ChatMessageDTO,
  TeacherDTO, ParentDTO, ChildDTO, ChildTodayDTO, FeeInvoiceDTO, PTMMeetingDTO,
  TransportDTO, AttendanceRecordDTO, LeaveRequestDTO,
} from './dtos';
import {
  toSession, toSchool, toStudent, toSubject, toTodayBlock, toPeer, toAchievement,
  toHomework, toExam, toGrade, toAnnouncement, toChatThread, toChatMessage, toTeacher,
  toParent, toChild, toChildToday, toFee, toPTM, toTransport, toAttendanceFromRecords, toLeaveRequest,
} from './mappers';

const getJson = <T>(path: string) => apiFetch<T>(path);
const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

// Set the in-memory access token and persist the full session so a later launch
// can restore it. Called on every successful sign-in (password or OTP).
async function persistSession(dto: SessionDTO): Promise<void> {
  setAuthToken(dto.access_token);
  await tokenStore.save({
    access: dto.access_token,
    refresh: dto.refresh_token ?? null,
    role: dto.user.role,
    email: dto.user.email,
    tenantId: dto.tenant?.id ?? null,
  });
}

function localDateLabel(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dailyAttendanceStatus(raw: unknown): DailyAttendanceStatus {
  const status = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (status === 'present' || status === 'p') return 'present';
  if (status === 'absent' || status === 'a') return 'absent';
  if (status === 'late' || status === 'l') return 'late';
  if (status === 'leave' || status === 'v') return 'leave';
  return null;
}

async function loadDailyAttendance(studentId: string): Promise<DailyAttendanceStatus> {
  const today = localDateLabel(new Date());
  const rows = await getJson<AttendanceRecordDTO[]>(
    `/students/${encodeURIComponent(studentId)}/attendance?from=${today}&to=${today}`,
  );
  return dailyAttendanceStatus(rows[0]?.status);
}

export const httpServices: Services = {
  school: { getCurrent: () => getJson<SchoolDTO>('/school').then(toSchool) },
  auth: {
    signIn: async (identifier, password, role) => {
      // VERIFY-LIVE: confirm login body field name (`identifier`) against Swagger.
      const dto = await post<SessionDTO>('/auth/login', { identifier, password, role });
      await persistSession(dto);
      return toSession(dto);
    },
    signOut: async () => {
      await post<void>('/auth/logout', {}).catch(() => undefined);
      await tokenStore.clear();
      setAuthToken(null);
    },
    requestOtp: (identifier) =>
      post<{ channel: 'sms' | 'email'; sent: boolean }>('/auth/otp/request', { identifier }),
    // VERIFY-LIVE: confirm /auth/otp/verify returns { reset_token, expires_in }.
    verifyOtp: async (identifier, code) => {
      const dto = await post<{ reset_token: string; expires_in: number }>('/auth/otp/verify', {
        identifier,
        code,
      });
      return { resetToken: dto.reset_token, expiresIn: dto.expires_in };
    },
    refresh: async (refreshToken) => {
      const dto = await post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      return { access: dto.access_token, refresh: dto.refresh_token ?? null };
    },
    setPassword: async ({ token, password }) => {
      // VERIFY-LIVE: confirm set-password body field name (reset_token) against Swagger.
      await post<void>('/auth/set-password', { reset_token: token, password });
    },
    getMe: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      return { role: me.role, email: me.email };
    },
  },
  student: {
    // Resolve the authenticated student id via /auth/me, then fetch the record.
    getProfile: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      return toStudent(await getJson<StudentDTO>(`/students/${me.id}`));
    },
    // getToday/getPeers/getAchievements have no backing endpoint — overridden to
    // mock in services/index.ts. Paths kept for the day the backend ships them.
    getToday: () => getJson<TodayBlockDTO[]>('/students/me/today').then((a) => a.map(toTodayBlock)),
    getPeers: () => getJson<PeerDTO[]>('/students/me/peers').then((a) => a.map(toPeer)),
    getAchievements: () => getJson<AchievementDTO[]>('/students/me/achievements').then((a) => a.map(toAchievement)),
  },
  subjects: {
    list: () => getJson<SubjectDTO[]>('/subjects').then((a) => a.map(toSubject)),
    byId: (id) => getJson<SubjectDTO | null>(`/subjects/${id}`).then((d) => (d ? toSubject(d) : undefined)),
  },
  homework: {
    list: () => getJson<HomeworkDTO[]>('/homework').then((a) => a.map(toHomework)),
    byId: (id) => getJson<HomeworkDTO | null>(`/homework/${id}`).then((d) => (d ? toHomework(d) : undefined)),
    setStatus: (id, status) => patch<HomeworkDTO>(`/homework/${id}`, { status }).then(toHomework),
    submit: (id) => post<HomeworkDTO>(`/homework/${id}/submit`, {}).then(toHomework),
  },
  grades: {
    // No flat /grades endpoint — aggregate per-paper grades across exam papers.
    listGrades: async () => {
      const papers = await getJson<ExamPaperDTO[]>('/exam-papers');
      const perPaper = await Promise.all(
        papers.map((p) => getJson<GradeDTO[]>(`/exam-papers/${p.id}/grades`)),
      );
      return perPaper.flat().map(toGrade);
    },
    listExams: () => getJson<ExamPaperDTO[]>('/exam-papers').then((a) => a.map(toExam)),
  },
  announcements: {
    list: (audience) => getJson<AnnouncementDTO[]>(`/announcements?audience=${audience}`).then((a) => a.map(toAnnouncement)),
  },
  messaging: {
    threads: (audience) => getJson<ChatThreadDTO[]>(`/threads?audience=${audience}`).then((a) => a.map(toChatThread)),
    messages: (threadId) => getJson<ChatMessageDTO[]>(`/threads/${threadId}/messages`).then((a) => a.map(toChatMessage)),
    send: (threadId, text) => post<ChatMessageDTO>(`/threads/${threadId}/messages`, { text }).then(toChatMessage),
  },
  directory: { teachers: () => getJson<TeacherDTO[]>('/teachers').then((a) => a.map(toTeacher)) },
  parent: {
    getProfile: () => getJson<ParentDTO>('/parents/me').then(toParent),
    // VERIFY-LIVE: assumed guardian-scoped (returns the authenticated parent's
    // children). If not, move to mock (services/index.ts) until a guardian route exists.
    children: () => getJson<ChildDTO[]>('/students').then((a) => a.map(toChild)),
    childToday: async (childId) => {
      const [today, todayAttn] = await Promise.all([
        getJson<ChildTodayDTO>(`/children/${childId}/today`).then(toChildToday),
        loadDailyAttendance(childId),
      ]);
      return { ...today, todayAttn };
    },
  },
  fees: {
    // VERIFY-LIVE: confirm the `student_id` filter param name against Swagger.
    list: (childId) =>
      getJson<FeeInvoiceDTO[]>(`/fees/invoices?student_id=${childId}`).then((a) => a.map(toFee)),
    pay: (feeId) => post<FeeInvoiceDTO>(`/fees/invoices/${feeId}/pay`, {}).then(toFee),
  },
  ptm: {
    list: () => getJson<PTMMeetingDTO[]>('/ptm').then((a) => a.map(toPTM)),
    setStatus: (id, status) => patch<PTMMeetingDTO>(`/ptm/${id}`, { status }).then(toPTM),
  },
  transport: { forChild: (childId) => getJson<TransportDTO>(`/children/${childId}/transport`).then(toTransport) },
  attendance: {
    today: async (childId) => {
      const id = childId || (await getJson<SessionUserDTO>('/auth/me')).id;
      return loadDailyAttendance(id);
    },
    month: async (childId) => {
      const now = new Date();
      const from = localDateLabel(new Date(now.getFullYear(), now.getMonth(), 1));
      const to = localDateLabel(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const rows = await getJson<AttendanceRecordDTO[]>(
        `/students/${encodeURIComponent(childId)}/attendance?from=${from}&to=${to}`,
      );
      return toAttendanceFromRecords(rows);
    },
  },
  leave: {
    // VERIFY-LIVE: confirm the `student_id` filter param name against Swagger.
    list: (childId) =>
      getJson<LeaveRequestDTO[]>(`/leave?student_id=${childId}`).then((a) => a.map(toLeaveRequest)),
    submit: (req) =>
      post<LeaveRequestDTO>('/leave', {
        child_id: req.childId, from_date: req.from, to_date: req.to, reason: req.reason, note: req.note,
      }).then(toLeaveRequest),
  },
};
