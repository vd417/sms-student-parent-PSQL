import type { Services } from '@/services/types';
import { apiFetch } from '@/api/client';
import type {
  SessionDTO, SchoolDTO, StudentDTO, SubjectDTO, TodayBlockDTO, PeerDTO, AchievementDTO,
  HomeworkDTO, ExamPaperDTO, GradeDTO, AnnouncementDTO, ChatThreadDTO, ChatMessageDTO,
  TeacherDTO, ParentDTO, ChildDTO, ChildTodayDTO, FeeInvoiceDTO, PTMMeetingDTO,
  TransportDTO, AttendanceMonthDTO, LeaveRequestDTO,
} from './dtos';
import {
  toSession, toSchool, toStudent, toSubject, toTodayBlock, toPeer, toAchievement,
  toHomework, toExam, toGrade, toAnnouncement, toChatThread, toChatMessage, toTeacher,
  toParent, toChild, toChildToday, toFee, toPTM, toTransport, toAttendanceMonth, toLeaveRequest,
} from './mappers';

const getJson = <T>(path: string) => apiFetch<T>(path);
const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

export const httpServices: Services = {
  school: { getCurrent: () => getJson<SchoolDTO>('/school').then(toSchool) },
  auth: {
    signIn: (email, password, role) =>
      post<SessionDTO>('/auth/login', { email, password, role }).then(toSession),
    signOut: () => post<void>('/auth/logout', {}).then(() => undefined),
    requestOtp: (identifier) =>
      post<{ channel: 'sms' | 'email'; sent: boolean }>('/auth/otp/request', { identifier }),
    verifyOtp: (identifier, code) =>
      post<SessionDTO>('/auth/otp/verify', { identifier, code }).then(toSession),
  },
  student: {
    getProfile: () => getJson<StudentDTO>('/students/me').then(toStudent),
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
    listGrades: () => getJson<GradeDTO[]>('/grades').then((a) => a.map(toGrade)),
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
    children: () => getJson<ChildDTO[]>('/parents/me/children').then((a) => a.map(toChild)),
    childToday: (childId) => getJson<ChildTodayDTO>(`/children/${childId}/today`).then(toChildToday),
  },
  fees: {
    list: (childId) => getJson<FeeInvoiceDTO[]>(`/children/${childId}/fees`).then((a) => a.map(toFee)),
    pay: (feeId) => post<FeeInvoiceDTO>(`/fees/${feeId}/pay`, {}).then(toFee),
  },
  ptm: {
    list: () => getJson<PTMMeetingDTO[]>('/ptm').then((a) => a.map(toPTM)),
    setStatus: (id, status) => patch<PTMMeetingDTO>(`/ptm/${id}`, { status }).then(toPTM),
  },
  transport: { forChild: (childId) => getJson<TransportDTO>(`/children/${childId}/transport`).then(toTransport) },
  attendance: { month: (childId) => getJson<AttendanceMonthDTO>(`/children/${childId}/attendance`).then(toAttendanceMonth) },
  leave: {
    list: (childId) => getJson<LeaveRequestDTO[]>(`/children/${childId}/leave`).then((a) => a.map(toLeaveRequest)),
    submit: (req) =>
      post<LeaveRequestDTO>('/leave', {
        child_id: req.childId, from_date: req.from, to_date: req.to, reason: req.reason, note: req.note,
      }).then(toLeaveRequest),
  },
};
