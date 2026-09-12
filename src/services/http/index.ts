import type { Role } from '@/models';
import type { DailyAttendanceStatus } from '@/models';
import type { PasswordResetSent, Services } from '@/services/types';
import { apiFetch, setAuthToken } from '@/api/client';
import { classifyIdentifier, normalizeLoginIdentifier } from '@/services/auth/identifier';
import { tokenStore } from '@/services/auth/tokenStore';
import { ApiError } from '@/services/errors';
import {
  assertChatImageAllowed,
  assertChatMessageAllowed,
} from '@/lib/chatModeration';
import { minutesFromMidnight } from '@/lib/nextPeriod';
import { deriveTodayAttendance } from '@/lib/todayAttendance';
import type {
  SessionDTO, SessionUserDTO, StudentDTO, SubjectDTO,
  HomeworkDTO, ExamPaperDTO, GradeDTO, AnnouncementDTO, NotificationDTO, ChatThreadDTO, ChatMessageDTO,
  TeacherDTO, ChildDTO, FeeInvoiceDTO, PTMMeetingDTO,
  ChildBusPositionDTO, AttendanceRecordDTO, LeaveRequestDTO, TimetableSlotDTO, AchievementDTO, AppSettingsDTO,
} from './dtos';
import {
  appRoleFromMe, rolesFromAccessToken, schoolFromMe, toStudent, toSubject,
  toHomework, toExam, toGrade, toAnnouncement, toNotice, toInboxNotice, toChatThread, toChatMessage, toTeacher,
  toParent, toChild, toFee, toPTM, toTransport, toAttendanceFromRecords, toLeaveRequest,
  toTimetableBlock, weekdayShort, compareTimetableBlocks, subjectShortCode, toAchievement, initialsFrom,
} from './mappers';
import { clearSisStudentCache, loadMyStudent } from './sisStudent';
import { ensurePaintableSchoolMark } from './schoolMark';

const getJson = <T>(path: string) => apiFetch<T>(path);
const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

function toAppSettings(d: AppSettingsDTO) {
  return {
    chatAlerts: d.chat_alerts !== false,
    schoolNotices: d.school_notices !== false,
    inAppToasts: d.in_app_toasts !== false,
  };
}

async function emptyOnError<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}

/**
 * Class timetable. GET /timetable is scoped server-side to the caller's own
 * linked student; a parent viewing a specific child passes studentId to hit
 * GET /students/{id}/timetable instead (403s if not their own child).
 */
async function loadTimetableBlocks(studentId?: string) {
  const path = studentId ? `/students/${encodeURIComponent(studentId)}/timetable` : '/timetable';
  const [slots, subjects] = await Promise.all([
    getJson<TimetableSlotDTO[]>(path),
    emptyOnError(() => loadSubjectCatalog(studentId), []),
  ]);
  const mappedSubjects = Array.isArray(subjects) ? subjects : [];
  return (Array.isArray(slots) ? slots : [])
    .map((s) => toTimetableBlock(s, mappedSubjects))
    .sort((a, b) => a.day.localeCompare(b.day) || compareTimetableBlocks(a, b));
}

async function resolveStudentId(studentId?: string): Promise<string> {
  if (studentId) return studentId;
  return String((await loadMyStudent()).id);
}

/** Backend `type` is a required enum (casual/sick/earned/medical/maternity/emergency/other); the
 * UI's reason chips are free-text labels, so map the closest match rather than sending nothing. */
function leaveTypeFromReason(reason: string): string {
  const r = reason.trim().toLowerCase();
  if (r.includes('sick')) return 'sick';
  if (r.includes('medical')) return 'medical';
  if (r.includes('emergency')) return 'emergency';
  if (r.includes('maternity')) return 'maternity';
  if (r.includes('earned')) return 'earned';
  if (r.includes('family') || r.includes('travel') || r.includes('casual')) return 'casual';
  return 'other';
}

/** Prefer /subjects; if empty, derive names from published timetable. */
async function loadSubjectCatalog(studentId?: string) {
  const q = studentId ? `?student_id=${encodeURIComponent(studentId)}` : '';
  const rows = await emptyOnError(() => getJson<SubjectDTO[]>(`/subjects${q}`), []);
  const fromApi = (Array.isArray(rows) ? rows : []).map(toSubject);
  if (fromApi.length) return fromApi;
  const slotsPath = studentId ? `/students/${encodeURIComponent(studentId)}/timetable` : '/timetable';
  const slots = await emptyOnError(() => getJson<TimetableSlotDTO[]>(slotsPath), []);
  const byName = new Map<string, ReturnType<typeof toSubject>>();
  for (const s of Array.isArray(slots) ? slots : []) {
    const name = (s.subject ?? '').trim();
    if (!name || /break|lunch|recess/i.test(name)) continue;
    const key = name.toLowerCase();
    if (byName.has(key)) continue;
    byName.set(
      key,
      toSubject({
        id: `tt:${key}`,
        name,
        short: subjectShortCode(name),
        teacher: s.teacher_name ?? '',
      }),
    );
  }
  return [...byName.values()];
}

function loginBody(identifier: string, password: string, role: Role) {
  const normalized = normalizeLoginIdentifier(identifier);
  const kind = classifyIdentifier(normalized);
  // Student tab: non-email → admission ID (even if digits-only). Parent: phone vs leftover.
  if (kind === 'email') return { email: normalized, password, role };
  if (role === 'student') return { student_id: normalized, password, role };
  if (kind === 'phone') return { phone: normalized, password, role };
  return { student_id: normalized, password, role };
}

function wrongTabError(requested: Role): ApiError {
  return new ApiError(
    requested === 'student'
      ? 'This is a parent login. Switch to the Parent tab.'
      : 'This is a student login. Switch to the Student tab.',
    403,
    undefined,
    'wrong_role',
  );
}

/** Persist tokens; hydrate role/email from /auth/me when login returns tokens only. */
async function persistAfterLogin(dto: SessionDTO, fallbackRole: Role) {
  if (!dto?.access_token) {
    throw new ApiError('Login response missing access_token', 500);
  }
  setAuthToken(dto.access_token);
  let role = dto.user ? appRoleFromMe(dto.user, fallbackRole) : fallbackRole;
  let email = dto.user?.email ?? '';
  let tenantId = dto.tenant?.id ?? null;
  try {
    const me = await getJson<SessionUserDTO>('/auth/me');
    role = appRoleFromMe(me, fallbackRole);
    email = me.email ?? email;
    tenantId = me.tenant_id ?? tenantId;
  } catch {
    const jwtRoles = rolesFromAccessToken(dto.access_token);
    if (jwtRoles.length > 0) {
      role = appRoleFromMe({ id: '', roles: jwtRoles }, fallbackRole);
    }
  }
  if (role !== fallbackRole) {
    setAuthToken(null);
    await tokenStore.clear();
    throw wrongTabError(fallbackRole);
  }
  await tokenStore.save({
    access: dto.access_token,
    refresh: dto.refresh_token ?? null,
    role,
    email,
    tenantId,
  });
  return { token: dto.access_token, role, email };
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
  // No GET /school profile — tenant mark lives on GET /auth/me.
  school: {
    getCurrent: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      const school = schoolFromMe(me);
      const [logoUrl, imageUrl] = await Promise.all([
        ensurePaintableSchoolMark(school.logoUrl),
        school.imageUrl ? ensurePaintableSchoolMark(school.imageUrl) : Promise.resolve(''),
      ]);
      return {
        ...school,
        logoUrl,
        imageUrl: imageUrl || undefined,
      };
    },
  },
  auth: {
    signIn: async (identifier, password, role) => {
      clearSisStudentCache();
      const dto = await post<SessionDTO>('/auth/login', loginBody(identifier, password, role));
      return persistAfterLogin(dto, role);
    },
    signOut: async () => {
      clearSisStudentCache();
      await post<void>('/auth/logout', {}).catch(() => undefined);
      await tokenStore.clear();
      setAuthToken(null);
    },
    requestPasswordReset: async (identifier, role) => {
      const id = normalizeLoginIdentifier(identifier);
      const dto = await post<{
        sent?: boolean;
        channel?: 'sms' | 'email';
        sent_to?: string;
        recipient?: 'self' | 'parent';
      }>('/auth/password/forgot', { identifier: id, role });
      return {
        channel: dto.channel === 'sms' ? 'sms' : 'email',
        sent: dto.sent !== false,
        sentTo: dto.sent_to ?? '',
        recipient: dto.recipient === 'parent' ? 'parent' : 'self',
      } satisfies PasswordResetSent;
    },
    resetPassword: async (identifier, code, password) => {
      await post<void>('/auth/password/reset', {
        identifier: normalizeLoginIdentifier(identifier),
        code,
        password,
      });
    },
    refresh: async (refreshToken) => {
      const dto = await post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      return { access: dto.access_token, refresh: dto.refresh_token ?? null };
    },
    getMe: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      return { role: appRoleFromMe(me, 'student'), email: me.email ?? '' };
    },
  },
  student: {
    // Users.Id ≠ Students.Id — resolve roster via /students/me (with admission fallback).
    getProfile: async (studentId?: string) => {
      if (studentId) return toStudent(await getJson<StudentDTO>(`/students/${encodeURIComponent(studentId)}`));
      return toStudent(await loadMyStudent());
    },
    // Live SoT is GET /timetable (no /students/me/today).
    getToday: async () => {
      const day = weekdayShort();
      return (await loadTimetableBlocks()).filter((b) => b.day === day);
    },
    getTimetable: (studentId) => loadTimetableBlocks(studentId),
    getPeers: async () => [],
    getAchievements: async (studentId) => {
      const id = await emptyOnError(() => resolveStudentId(studentId), '');
      const q = id ? `?student_id=${encodeURIComponent(id)}` : '';
      const rows = await emptyOnError(() => getJson<AchievementDTO[]>(`/achievements${q}`), []);
      return (Array.isArray(rows) ? rows : []).map(toAchievement);
    },
  },
  subjects: {
    list: (studentId?: string) => loadSubjectCatalog(studentId),
    byId: async (id) => {
      try {
        return toSubject(await getJson<SubjectDTO>(`/subjects/${id}`));
      } catch {
        return (await loadSubjectCatalog()).find((s) => s.id === id);
      }
    },
  },
  homework: {
    list: async (studentId?: string) => {
      const id = await emptyOnError(() => resolveStudentId(studentId), '');
      const q = id ? `?student_id=${encodeURIComponent(id)}` : '';
      const rows = await emptyOnError(() => getJson<HomeworkDTO[]>(`/homework${q}`), []);
      return (Array.isArray(rows) ? rows : []).map(toHomework);
    },
    byId: (id) => getJson<HomeworkDTO | null>(`/homework/${id}`).then((d) => (d ? toHomework(d) : undefined)),
    setStatus: (id, status) => patch<HomeworkDTO>(`/homework/${id}`, { status }).then(toHomework),
    submit: (id) => post<HomeworkDTO>(`/homework/${id}/submit`, {}).then(toHomework),
  },
  grades: {
    // One round-trip: GET /grades?student_id= (roster id from /students/me or parent child).
    listGrades: async (studentId?: string) => {
      const id = await resolveStudentId(studentId);
      const rows = await getJson<GradeDTO[]>(
        `/grades?student_id=${encodeURIComponent(id)}`,
      );
      return (Array.isArray(rows) ? rows : []).map(toGrade);
    },
    listExams: async (studentId?: string) => {
      const id = await emptyOnError(() => resolveStudentId(studentId), '');
      const q = id ? `?student_id=${encodeURIComponent(id)}` : '';
      const rows = await emptyOnError(() => getJson<ExamPaperDTO[]>(`/exam-papers${q}`), []);
      return (Array.isArray(rows) ? rows : []).map(toExam);
    },
  },
  announcements: {
    list: async (audience) => {
      const [annRes, noteRes] = await Promise.allSettled([
        getJson<AnnouncementDTO[]>(`/announcements?audience=${encodeURIComponent(audience)}`),
        getJson<NotificationDTO[]>('/notifications'),
      ]);
      const anns =
        annRes.status === 'fulfilled' && Array.isArray(annRes.value)
          ? annRes.value.map(toAnnouncement)
          : [];
      const notes =
        noteRes.status === 'fulfilled' && Array.isArray(noteRes.value)
          ? noteRes.value.map(toNotice)
          : [];
      if (annRes.status === 'rejected' && noteRes.status === 'rejected') throw annRes.reason;
      const seen = new Set(anns.map((a) => a.id));
      return [...notes.filter((n) => !seen.has(n.id)), ...anns];
    },
  },
  notifications: {
    list: async () => {
      const rows = await getJson<NotificationDTO[]>('/notifications');
      return (Array.isArray(rows) ? rows : []).map(toInboxNotice);
    },
    markRead: async () => {
      await post<unknown>('/notifications/read', {});
    },
  },
  settings: {
    get: async () => toAppSettings(await getJson<AppSettingsDTO>('/me/settings')),
    update: async (input) => {
      const body: AppSettingsDTO = {};
      if (input.chatAlerts != null) body.chat_alerts = input.chatAlerts;
      if (input.schoolNotices != null) body.school_notices = input.schoolNotices;
      if (input.inAppToasts != null) body.in_app_toasts = input.inAppToasts;
      return toAppSettings(await patch<AppSettingsDTO>('/me/settings', body));
    },
  },
  messaging: {
    threads: async () => {
      const rows = await getJson<ChatThreadDTO[]>('/threads');
      return (Array.isArray(rows) ? rows : []).map(toChatThread);
    },
    messages: async (threadId) => {
      const rows = await getJson<ChatMessageDTO[]>(`/threads/${encodeURIComponent(threadId)}/messages`);
      return (Array.isArray(rows) ? rows : []).map(toChatMessage);
    },
    send: async (threadId, text, imageUrl) => {
      assertChatMessageAllowed(text);
      if (imageUrl) assertChatImageAllowed(imageUrl);
      const body: { text: string; image_url?: string } = { text };
      if (imageUrl) body.image_url = imageUrl;
      return toChatMessage(
        await post<ChatMessageDTO>(`/threads/${encodeURIComponent(threadId)}/messages`, body),
      );
    },
    create: (input) =>
      post<ChatThreadDTO>('/threads', {
        name: input.name,
        role: input.role ?? null,
        group: !!input.group,
        child_id: input.kid ?? null,
      }).then(toChatThread),
  },
  directory: { teachers: () => getJson<TeacherDTO[]>('/teachers').then((a) => a.map(toTeacher)) },
  parent: {
    // No dedicated GET /parents/me — /auth/me already carries name/email/phone for the
    // logged-in account. "relation" (Mother/Father/Guardian) has no backend field yet.
    getProfile: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      return toParent({
        name: me.name ?? '',
        initials: initialsFrom(me.name),
        relation: 'Guardian',
        email: me.email ?? '',
        phone: me.phone ?? '',
      });
    },
    // GET /parents/me/children lists every child linked to this parent.
    // Empty array when the account has no linked children. Auth/network errors
    // propagate so the parent UI can show ErrorState / existing 401 sign-out.
    children: async () => {
      const rows = await getJson<StudentDTO[]>('/parents/me/children');
      return (Array.isArray(rows) ? rows : []).map(toChild);
    },
    // No live per-child /children/{id}/today endpoint — GET /timetable already resolves
    // the caller's own linked student (same as the student app's "today"), so derive
    // classes from that. Meals have no backend field yet; pickup falls back to '—'.
    childToday: async (childId) => {
      if (!childId) {
        return { classes: [], meals: { breakfast: '', lunch: '' }, pickup: '—', todayAttn: null };
      }
      const id = childId;
      const day = weekdayShort();
      const todayDate = localDateLabel(new Date());
      const nowMin = minutesFromMidnight(new Date());
      const [blocks, dailyAttn, periodRows] = await Promise.all([
        emptyOnError(() => loadTimetableBlocks(id), []),
        loadDailyAttendance(id).catch(() => null),
        emptyOnError(
          () =>
            getJson<AttendanceRecordDTO[]>(
              `/students/${encodeURIComponent(id)}/attendance/periods?from=${todayDate}&to=${todayDate}`,
            ),
          [],
        ),
      ]);
      const attnByPeriod = new Map<number, DailyAttendanceStatus>();
      for (const row of periodRows) {
        const period = Number(row.period);
        if (Number.isFinite(period)) attnByPeriod.set(period, dailyAttendanceStatus(row.status));
      }
      const classes = blocks
        .filter((b) => b.day === day)
        .map((b) => ({
          t: b.t,
          label: b.label,
          done: b.startMin != null && nowMin >= b.startMin + b.d,
          attn: b.period != null ? (attnByPeriod.get(b.period) ?? null) : null,
        }));
      return {
        classes,
        meals: { breakfast: '', lunch: '' },
        pickup: '—',
        todayAttn: dailyAttn ?? deriveTodayAttendance(classes.map((c) => c.attn)),
      };
    },
  },
  fees: {
    // VERIFY-LIVE: confirm the `student_id` filter param name against Swagger.
    list: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      const rows = await getJson<FeeInvoiceDTO[]>(`/fees/invoices?student_id=${encodeURIComponent(id)}`);
      return rows.map(toFee);
    },
    pay: (feeId) => post<FeeInvoiceDTO>(`/fees/invoices/${feeId}/pay`, {}).then(toFee),
    createRazorpayOrder: async (feeId) => {
      const wire = await post<{ order_id: string; amount: number; currency: string; key_id: string }>(
        `/fees/invoices/${encodeURIComponent(feeId)}/razorpay/order`,
        {},
      );
      return { orderId: wire.order_id, amount: wire.amount, currency: wire.currency, keyId: wire.key_id };
    },
    // The backend returns a payment record here (id/student/amount/method/ref/date/...),
    // not a FeeInvoiceDTO — only its status is worth surfacing; callers refetch the
    // invoice list (via query invalidation) for the real invoice state.
    verifyRazorpayPayment: (feeId, body) =>
      post<{ status: string }>(`/fees/invoices/${encodeURIComponent(feeId)}/razorpay/verify`, {
        razorpay_order_id: body.razorpayOrderId,
        razorpay_payment_id: body.razorpayPaymentId,
        razorpay_signature: body.razorpaySignature,
      }).then((data) => ({ status: data.status })),
  },
  ptm: {
    list: () => getJson<PTMMeetingDTO[]>('/ptm').then((a) => a.map(toPTM)),
    setStatus: (id, status) => patch<PTMMeetingDTO>(`/ptm/${id}`, { status }).then(toPTM),
  },
  transport: {
    // Endpoint is scoped to the caller's own account, not childId — it returns every
    // linked child's bus. Pick the row matching the selected child; fall back to the
    // first row for a single-child (student) login.
    forChild: (childId) =>
      getJson<ChildBusPositionDTO[]>('/me/children/bus')
        .then((rows) => rows.find((r) => r.student_id === childId) ?? rows[0] ?? null)
        .then((row) => (row ? toTransport(row) : null))
        .catch(() => null),
  },
  attendance: {
    today: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      return loadDailyAttendance(id);
    },
    month: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      const now = new Date();
      const from = localDateLabel(new Date(now.getFullYear(), now.getMonth(), 1));
      const to = localDateLabel(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const rows = await getJson<AttendanceRecordDTO[]>(
        `/students/${encodeURIComponent(id)}/attendance?from=${from}&to=${to}`,
      );
      return toAttendanceFromRecords(rows);
    },
    periods: async (childId, from, to) => {
      const id = childId || (await loadMyStudent()).id;
      const now = new Date();
      const lo = from || localDateLabel(new Date(now.getFullYear(), now.getMonth(), 1));
      const hi = to || localDateLabel(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      const rows = await getJson<AttendanceRecordDTO[]>(
        `/students/${encodeURIComponent(id)}/attendance/periods?from=${lo}&to=${hi}`,
      );
      return (rows ?? []).map((row) => ({
        id: row.id,
        date: typeof row.date === 'string' ? row.date.slice(0, 10) : '',
        period: Number(row.period) || 0,
        subject: row.subject ?? '',
        subjectId: row.subject_id ? String(row.subject_id) : undefined,
        status: (row.status ?? '').toLowerCase(),
        markedByRole: row.marked_by_role ?? undefined,
      }));
    },
    summary: async (childId, from, to) => {
      const id = childId || (await loadMyStudent()).id;
      const qs = new URLSearchParams();
      if (from) qs.set('from', from);
      if (to) qs.set('to', to);
      const q = qs.toString();
      const wire = await getJson<Record<string, unknown>>(
        `/students/${encodeURIComponent(id)}/attendance/summary${q ? `?${q}` : ''}`,
      );
      const pct = wire.attendance_percentage ?? wire.attendancePercentage;
      const badge = wire.present_today_badge ?? wire.presentTodayBadge;
      return {
        totalMarkedPeriods: Number(wire.total_marked_periods ?? wire.totalMarkedPeriods ?? 0),
        presentPeriods: Number(wire.present_periods ?? wire.presentPeriods ?? 0),
        latePeriods: Number(wire.late_periods ?? wire.latePeriods ?? 0),
        absentPeriods: Number(wire.absent_periods ?? wire.absentPeriods ?? 0),
        leavePeriods: Number(wire.leave_periods ?? wire.leavePeriods ?? 0),
        attendancePercentage: pct == null || pct === '' ? null : Number(pct),
        presentTodayBadge: badge == null || badge === '' ? null : Boolean(badge),
      };
    },
  },
  leave: {
    // VERIFY-LIVE: confirm the `student_id` filter param name against Swagger.
    list: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      const rows = await getJson<LeaveRequestDTO[]>(`/leave?student_id=${encodeURIComponent(id)}`);
      return rows.map(toLeaveRequest);
    },
    submit: (req) =>
      post<LeaveRequestDTO>('/leave', {
        type: leaveTypeFromReason(req.reason),
        child_id: req.childId, from_date: req.from, to_date: req.to, reason: req.reason, note: req.note,
      }).then(toLeaveRequest),
  },
};
