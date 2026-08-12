import type { DailyAttendanceStatus, Role } from '@/models';
import type { Services } from '@/services/types';
import { apiFetch, setAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { classifyIdentifier, normalizeLoginIdentifier } from '@/services/auth/identifier';
import type {
  SessionDTO, SessionUserDTO, StudentDTO, SubjectDTO,
  HomeworkDTO, ExamPaperDTO, GradeDTO, AnnouncementDTO, ChatThreadDTO, ChatMessageDTO,
  TeacherDTO, ParentDTO, FeeInvoiceDTO, LeaveRequestDTO,
  TimetableSlotDTO, CalendarEventDTO, AttendanceRecordDTO, ChildBusDTO,
} from './dtos';
import {
  toStudent, toSubject,
  toHomework, toExam, toGrade, toAnnouncement, toChatThread, toChatMessage, toTeacher,
  toParent, toChild, toFee, toLeaveRequest,
  mapList, toTimetableBlock, weekdayShort, initialsFrom, toAttendanceFromRecords,
  toPTMFromCalendar, toTransportFromBus,
} from './mappers';
import { clearSisStudentCache, loadMyStudent } from './sisStudent';
import { ensurePaintableSchoolMark, pickSchoolMarkUrl } from './schoolMark';
import { assignDistinctSubjectHues } from '@/theme/derive';

const getJson = <T>(path: string) => apiFetch<T>(path);
const post = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'POST', body: JSON.stringify(body) });
const patch = <T>(path: string, body: unknown) =>
  apiFetch<T>(path, { method: 'PATCH', body: JSON.stringify(body) });

function numOrUndef(v: unknown): number | undefined {
  if (v == null || v === '') return undefined;
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
}

type MyMarksBundle = {
  papers: ExamPaperDTO[];
  grades: ReturnType<typeof toGrade>[];
  exams: ReturnType<typeof toExam>[];
};

/** One shared load for report card + subject detail (avoids N+1 per exam paper). */
let myMarksInflight: Promise<MyMarksBundle> | null = null;

async function loadMyMarksBundle(): Promise<MyMarksBundle> {
  if (myMarksInflight) return myMarksInflight;
  myMarksInflight = (async () => {
    const me = await loadMyStudent();
    const [papers, subjects, rawGrades] = await Promise.all([
      emptyOnError(() => getJson<ExamPaperDTO[]>('/exam-papers')),
      emptyOnError(() => getJson<SubjectDTO[]>('/subjects')),
      emptyOnError(() => getJson<GradeDTO[]>(`/grades?student_id=${encodeURIComponent(me.id)}`)),
    ]);
    const paperById = new Map(papers.map((p) => [String(p.id), p]));
    const subjectByName = new Map(
      subjects.map((s) => [String(s.name ?? '').trim().toLowerCase(), s] as const),
    );
    const resolveSubjectId = (g: GradeDTO, paper?: ExamPaperDTO) => {
      const direct = paper?.subject_id ?? g.subject_id;
      if (direct) return direct;
      const name = (paper?.subject || g.subject || g.paper_name || '').trim().toLowerCase();
      return name ? subjectByName.get(name)?.id : undefined;
    };
    // Subject-wise marks from Admin Marks entry (saved + notified). Prefer those rows.
    const grades = rawGrades.map((g) => {
      const paper = paperById.get(String(g.exam_paper_id ?? ''));
      const subjectName = paper?.subject || g.subject || '';
      return toGrade({
        ...g,
        subject_id: resolveSubjectId(g, paper),
        title: g.paper_name || paper?.name || subjectName || g.title,
        max_marks: g.max_marks ?? paper?.max_marks,
      });
    });
    const gradeByPaper = new Map(
      rawGrades
        .filter((g) => g.exam_paper_id)
        .map((g) => [String(g.exam_paper_id), g] as const),
    );
    const exams = papers.map((p) => {
      const mine = gradeByPaper.get(String(p.id));
      if (!mine) return toExam({ ...p, subject_id: p.subject_id ?? resolveSubjectId({}, p) });
      return toExam({
        ...p,
        subject_id: p.subject_id ?? resolveSubjectId(mine, p),
        score: numOrUndef(mine.score ?? mine.marks),
        grade: mine.grade ?? p.grade,
        status: 'graded',
        max_marks: mine.max_marks ?? p.max_marks,
      });
    });
    return { papers, grades, exams };
  })().finally(() => {
    myMarksInflight = null;
  });
  return myMarksInflight;
}

// Set the in-memory access token and persist the full session so a later launch
// can restore it. Called on every successful sign-in (password or OTP).
async function persistSession(
  dto: SessionDTO,
  extras?: { role: Role; email: string; tenantId?: string | null },
): Promise<void> {
  setAuthToken(dto.access_token);
  await tokenStore.save({
    access: dto.access_token,
    refresh: dto.refresh_token ?? null,
    role: extras?.role ?? dto.user?.role ?? 'student',
    email: extras?.email ?? dto.user?.email ?? '',
    tenantId: extras?.tenantId ?? dto.tenant?.id ?? null,
  });
}

function appRoleFromMe(me: SessionUserDTO, fallback: Role): Role {
  if (me.role === 'parent' || me.role === 'student') return me.role;
  const roles = (me.roles ?? []).map((r) => r.toLowerCase());
  if (roles.some((r) => r.includes('parent'))) return 'parent';
  if (roles.some((r) => r === 'student' || r.endsWith('.student'))) return 'student';
  return fallback;
}

async function emptyOnError<T>(fn: () => Promise<T[]>, fallback: T[] = []): Promise<T[]> {
  try {
    const rows = await fn();
    return Array.isArray(rows) ? rows : fallback;
  } catch {
    return fallback;
  }
}

async function loadClassSubjects() {
  return assignDistinctSubjectHues(mapList(await getJson<SubjectDTO[]>('/subjects'), toSubject));
}

async function loadTimetableBlocks() {
  const [slots, subjects] = await Promise.all([
    emptyOnError(() => getJson<TimetableSlotDTO[]>('/timetable')),
    emptyOnError(() => loadClassSubjects()),
  ]);
  return mapList(slots, (s) => toTimetableBlock(s, subjects));
}

function localDateLabel(date = new Date()): string {
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
  const today = localDateLabel();
  const rows = await emptyOnError(() =>
    getJson<AttendanceRecordDTO[]>(
      `/students/${encodeURIComponent(studentId)}/attendance?from=${today}&to=${today}`,
    ),
  );
  return dailyAttendanceStatus(rows[0]?.status);
}

export const httpServices: Services = {
  school: {
    getCurrent: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      const name = (me.tenant_name ?? 'School').trim() || 'School';
      const words = name.split(/\s+/).filter(Boolean);
      const shortName = words.length > 1 ? words[0] : name;
      const logoRaw = (me.tenant_logo_url ?? '').trim();
      const imageRaw = (me.tenant_image_url ?? '').trim();
      // Prefer the real school logo; shrink huge data-URIs so Image can paint them.
      const logoUrl = (await ensurePaintableSchoolMark(logoRaw)) || pickSchoolMarkUrl(logoRaw, imageRaw);
      const imageUrl =
        (await ensurePaintableSchoolMark(imageRaw)) || imageRaw || undefined;
      return {
        id: me.tenant_id ?? '',
        name,
        shortName,
        logoUrl,
        imageUrl: imageUrl || undefined,
      };
    },
  },
  auth: {
    signIn: async (identifier, password, role) => {
      clearSisStudentCache();
      const normalized = normalizeLoginIdentifier(identifier);
      const kind = classifyIdentifier(normalized);
      // Student tab: anything that isn't an email is an admission ID, even if it
      // looks numeric. Parent tab still sends phone vs leftover admission.
      const body =
        kind === 'email'
          ? { email: normalized, password, role }
          : role === 'student'
            ? { student_id: normalized, password, role }
            : kind === 'phone'
              ? { phone: normalized, password, role }
              : { student_id: normalized, password, role };
      // Live API returns { access_token, refresh_token } only — no nested user.
      const dto = await post<SessionDTO>('/auth/login', body);
      setAuthToken(dto.access_token);

      let resolvedRole = dto.user?.role ?? role;
      let email = dto.user?.email ?? (kind === 'email' ? normalized : '');
      let tenantId = dto.tenant?.id ?? null;
      try {
        const me = await getJson<SessionUserDTO>('/auth/me');
        resolvedRole = appRoleFromMe(me, role);
        email = me.email ?? email;
        tenantId = (me as SessionUserDTO & { tenant_id?: string }).tenant_id ?? tenantId;
      } catch {
        // Tokens are valid; /me is best-effort. Keep the role the user selected.
      }

      await persistSession(dto, { role: resolvedRole, email, tenantId });
      return { token: dto.access_token, role: resolvedRole, email };
    },
    signOut: async () => {
      await post<void>('/auth/logout', {}).catch(() => undefined);
      await tokenStore.clear();
      setAuthToken(null);
      clearSisStudentCache();
    },
    requestPasswordReset: async (identifier) => {
      // Backend may return snake_case or camelCase; never use the raw admission ID in UI.
      const normalized = normalizeLoginIdentifier(identifier);
      const raw = await post<{
        channel: 'sms' | 'email';
        sent: boolean;
        sent_to?: string;
        sentTo?: string;
        destination?: string;
        recipient?: 'self' | 'parent' | 'student' | 'guardian';
      }>('/auth/password/forgot', { identifier: normalized });

      const sentTo = (raw.sent_to ?? raw.sentTo ?? raw.destination ?? '').trim();
      const recipientRaw = raw.recipient ?? 'self';
      const recipient: 'self' | 'parent' =
        recipientRaw === 'parent' || recipientRaw === 'guardian' ? 'parent' : 'self';

      return {
        channel: raw.channel,
        sent: raw.sent,
        // Prefer server-provided masked destination. Never fall back to admission ID.
        sentTo: sentTo || (raw.channel === 'sms' ? 'your registered mobile' : 'your registered email'),
        recipient,
      };
    },
    resetPassword: (identifier, code, password) =>
      post<void>('/auth/password/reset', {
        identifier: normalizeLoginIdentifier(identifier),
        code,
        password,
      }),
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
    getProfile: async () => {
      const row = await loadMyStudent();
      let school = row.school;
      if (!school) {
        try {
          const me = await getJson<SessionUserDTO>('/auth/me');
          school = me.tenant_name ?? '';
        } catch {
          /* school name is optional on the roster payload */
        }
      }
      return toStudent({ ...row, school: school ?? '' });
    },
    getTimetable: () => loadTimetableBlocks(),
    getToday: async () => {
      const today = weekdayShort();
      return (await loadTimetableBlocks()).filter((b) => b.day === today);
    },
    getPeers: async () => {
      const me = await loadMyStudent();
      const q = me.grade ? `?grade=${encodeURIComponent(me.grade)}` : '';
      const rows = await emptyOnError(() => getJson<StudentDTO[]>(`/students${q}`));
      return rows
        .filter((s) => s.id !== me.id && (!me.class_label || !s.class_label || s.class_label === me.class_label))
        .map((s) => ({
          id: s.id,
          name: s.name,
          initials: s.initials || initialsFrom(s.name),
          subj: s.class_label || s.grade || '',
        }));
    },
    getAchievements: async () => [],
  },
  subjects: {
    list: () => loadClassSubjects(),
    byId: async (id) => {
      const rows = await loadClassSubjects();
      return rows.find((s) => s.id === id);
    },
  },
  homework: {
    list: async () => {
      const me = await loadMyStudent();
      const rows = await getJson<HomeworkDTO[]>(`/homework?student_id=${me.id}`);
      return mapList(rows, toHomework);
    },
    byId: (id) => getJson<HomeworkDTO | null>(`/homework/${id}`).then((d) => (d ? toHomework(d) : undefined)),
    setStatus: (id, status) => patch<HomeworkDTO>(`/homework/${id}`, { status }).then(toHomework),
    submit: (id) => post<HomeworkDTO>(`/homework/${id}/submit`, {}).then(toHomework),
  },
  grades: {
    listGrades: async () => (await loadMyMarksBundle()).grades,
    listExams: async () => (await loadMyMarksBundle()).exams,
  },
  announcements: {
    list: (audience) =>
      getJson<AnnouncementDTO[]>(`/announcements?audience=${audience}`).then((a) => mapList(a, toAnnouncement)),
  },
  messaging: {
    threads: (audience) =>
      getJson<ChatThreadDTO[]>(`/threads?audience=${audience}`).then((a) => mapList(a, toChatThread)),
    messages: (threadId) =>
      getJson<ChatMessageDTO[]>(`/threads/${threadId}/messages`).then((a) => mapList(a, toChatMessage)),
    send: (threadId, text) => post<ChatMessageDTO>(`/threads/${threadId}/messages`, { text }).then(toChatMessage),
  },
  directory: { teachers: () => getJson<TeacherDTO[]>('/teachers').then((a) => mapList(a, toTeacher)) },
  parent: {
    getProfile: async () => {
      try {
        return toParent(await getJson<ParentDTO>('/parents/me'));
      } catch {
        const me = await getJson<SessionUserDTO>('/auth/me');
        const name = me.name ?? '';
        return {
          name,
          initials: initialsFrom(name),
          relation: 'Guardian',
          email: me.email ?? '',
          phone: me.phone ?? '',
        };
      }
    },
    children: async () => {
      const rows = await emptyOnError(() => getJson<StudentDTO[]>('/students'));
      return rows.map((s) =>
        toChild({
          id: s.id,
          name: s.name,
          initials: s.initials || initialsFrom(s.name),
          grade: s.grade ?? '',
          school: s.school ?? '',
          avg: s.overall_avg ?? 0,
          attn: s.attendance_pct ?? 0,
          fee: '',
          unread: 0,
          hue: 'blue',
        }),
      );
    },
    childToday: async (childId) => {
      const [blocks, todayAttn] = await Promise.all([
        loadTimetableBlocks(),
        loadDailyAttendance(childId),
      ]);
      const today = weekdayShort();
      const classes = blocks
        .filter((b) => b.day === today && b.kind === 'class')
        .map((b) => ({ t: b.t, label: b.label, done: false }));
      return { classes, meals: { breakfast: '', lunch: '' }, pickup: '', todayAttn };
    },
  },
  fees: {
    list: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      return mapList(
        await emptyOnError(() => getJson<FeeInvoiceDTO[]>(`/fees/invoices?student_id=${id}`)),
        toFee,
      );
    },
    pay: (feeId) => post<FeeInvoiceDTO>(`/fees/invoices/${feeId}/pay`, {}).then(toFee),
  },
  ptm: {
    list: async () =>
      mapList(await emptyOnError(() => getJson<CalendarEventDTO[]>('/calendar')), toPTMFromCalendar),
    setStatus: async (id, status) => {
      const all = await httpServices.ptm.list();
      const found = all.find((p) => p.id === id);
      if (!found) throw new Error('meeting not found');
      return { ...found, status };
    },
  },
  transport: {
    forChild: async () => {
      const rows = await emptyOnError(() => getJson<ChildBusDTO[]>('/me/children/bus'));
      return rows[0] ? toTransportFromBus(rows[0]) : toTransportFromBus({});
    },
  },
  attendance: {
    today: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      return loadDailyAttendance(id);
    },
    month: async (childId) => {
      const id = childId || (await loadMyStudent()).id;
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
      const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
      const rows = await emptyOnError(() =>
        getJson<AttendanceRecordDTO[]>(`/students/${id}/attendance?from=${from}&to=${to}`),
      );
      return toAttendanceFromRecords(rows);
    },
  },
  leave: {
    list: async () => mapList(await emptyOnError(() => getJson<LeaveRequestDTO[]>('/leave')), toLeaveRequest),
    submit: (req) =>
      post<LeaveRequestDTO>('/leave', {
        type: 'other',
        child_id: req.childId,
        from_date: req.from,
        to_date: req.to,
        reason: req.reason,
      }).then(toLeaveRequest),
  },
};
