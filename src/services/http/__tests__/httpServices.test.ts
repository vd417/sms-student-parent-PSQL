import { httpServices } from '@/services/http';
import * as client from '@/api/client';
import { setAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { clearSisStudentCache } from '@/services/http/sisStudent';

jest.mock('@/services/auth/tokenStore', () => ({
  tokenStore: { save: jest.fn(async () => undefined), load: jest.fn(), clear: jest.fn(async () => undefined) },
}));

function mockFetchOnce(body: unknown) {
  (global as any).fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => body,
  });
}

describe('httpServices', () => {
  beforeEach(() => {
    setAuthToken('test-token');
    clearSisStudentCache();
  });

  it('no service method throws NotImplementedError', () => {
    for (const domain of Object.values(httpServices)) {
      for (const fn of Object.values(domain as Record<string, unknown>)) {
        expect(typeof fn).toBe('function');
      }
    }
  });

  it('student.getProfile resolves via /students/me and maps the DTO', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      id: 'sis-1',
      admission_no: 'WBA-2024-1042',
      name: 'Maya Patel',
      initials: 'MP',
      grade: '9',
      class_label: '9-A',
      house: 'Blue',
      email: 'maya@wba.edu',
      school: 'Westbrook Academy',
      attendance_pct: 94,
      overall_avg: 88,
      rank: 3,
      rank_of: 40,
    } as any);
    const profile = await httpServices.student.getProfile();
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(profile.studentId).toBe('WBA-2024-1042');
    expect(profile.attnPct).toBe(94);
    spy.mockRestore();
  });

  it('subjects.list GETs /subjects and maps catalog rows', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
      { id: 's', name: 'Science', teacher_name: 'Ravi' },
    ] as any);
    const rows = await httpServices.subjects.list();
    expect(spy.mock.calls[0][0]).toBe('/subjects');
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Science');
    expect(rows[0].teacher).toBe('Ravi');
    spy.mockRestore();
  });

  it('homework.list uses the SIS student id from /students/me', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({
        id: 'sis-1', admission_no: 'sccrdtb/STU/26/0002', name: 'Ankit Rana',
      } as any)
      .mockResolvedValueOnce([
        { id: 'h1', title: 'Essay', status: 'pending', due_date: '2026-08-12T00:00:00', priority: 'med' },
      ] as any);
    const rows = await httpServices.homework.list();
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(spy.mock.calls[1][0]).toBe('/homework?student_id=sis-1');
    expect(rows[0].status).toBe('todo');
    expect(rows[0].due).toBe('2026-08-12');
    spy.mockRestore();
  });

  it('fees.list GETs /fees/invoices?student_id and maps invoices', async () => {
    mockFetchOnce({ data: [{ id: 'f1', period: 'Jul', due_date: '2026-07-10', amount: 12000, status: 'due' }] });
    const fees = await httpServices.fees.list('c1');
    expect(fees[0].dueDate).toBe('2026-07-10');
    expect((global as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/fees/invoices?student_id=c1'),
      expect.anything(),
    );
  });
});

describe('httpServices derived paths', () => {
  afterEach(() => jest.restoreAllMocks());
  beforeEach(() => clearSisStudentCache());

  it('listGrades uses GET /grades?student_id once (no per-paper fan-out)', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ id: 'stu-1', admission_no: 'A1', name: 'Ankit', grade: 'VI', section: 'A' } as any)
      .mockImplementation(async (path: string) => {
        if (path === '/exam-papers') {
          return [
            { id: 'p1', name: 'Math Midterm', subject_id: 'math', max_marks: 100 },
            { id: 'p2', name: 'Science', subject_id: 'sci', max_marks: 50 },
          ] as any;
        }
        if (path.startsWith('/grades?student_id=')) {
          return [
            { id: 'g1', student_id: 'stu-1', exam_paper_id: 'p1', marks: 88, max_marks: 100, grade: 'A2', date: '2026-07-01' },
          ] as any;
        }
        throw new Error(`unexpected ${path}`);
      });
    const grades = await httpServices.grades.listGrades();
    expect(grades).toHaveLength(1);
    expect(grades[0]).toMatchObject({
      id: 'g1', subjId: 'math', title: 'Math Midterm', score: 88, max: 100, grade: 'A2',
    });
    const gradeCalls = spy.mock.calls.filter((c) => String(c[0]).startsWith('/grades'));
    const paperGradeCalls = spy.mock.calls.filter((c) => String(c[0]).includes('/exam-papers/') && String(c[0]).endsWith('/grades'));
    expect(gradeCalls).toHaveLength(1);
    expect(paperGradeCalls).toHaveLength(0);
  });

  it('listExams reuses the same marks bundle without extra grade fan-out', async () => {
    jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ id: 'stu-1', admission_no: 'A1', name: 'Ankit' } as any)
      .mockImplementation(async (path: string) => {
        if (path === '/exam-papers') {
          return [{ id: 'p1', name: 'Science', subject_id: 'sci', max_marks: 50, status: 'scheduled' }] as any;
        }
        if (path.startsWith('/grades?student_id=')) {
          return [{ id: 'g1', student_id: 'stu-1', exam_paper_id: 'p1', marks: 42, max_marks: 50, grade: 'A1' }] as any;
        }
        throw new Error(`unexpected ${path}`);
      });
    const exams = await httpServices.grades.listExams();
    expect(exams[0]).toMatchObject({
      id: 'p1', status: 'graded', score: 42, max: 50, grade: 'A1',
    });
  });

  it('parent.children GETs /students (assumed guardian-scoped)', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.parent.children();
    expect(spy.mock.calls[0][0]).toBe('/students');
  });

  it('parent.childToday returns one daily mark without period attendance', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/timetable') {
        return [{ day: new Date().toLocaleDateString('en-US', { weekday: 'long' }), start_time: '09:00', end_time: '09:45', subject: 'Math' }] as any;
      }
      if (path === '/subjects') return [] as any;
      if (path.startsWith('/students/c1/attendance?')) {
        return [{ id: 'a1', student_id: 'c1', date: '2026-08-13', status: 'leave' }] as any;
      }
      throw new Error(`unexpected ${path}`);
    });

    await expect(httpServices.parent.childToday('c1')).resolves.toEqual({
      classes: [{ t: '09:00', label: 'Math', done: false }],
      meals: { breakfast: '', lunch: '' },
      pickup: '',
      todayAttn: 'leave',
    });
    expect(spy.mock.calls.map((call) => call[0])).toContainEqual(
      expect.stringMatching(/^\/students\/c1\/attendance\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/),
    );
  });

  it('attendance.today loads the signed-in student and normalizes v to leave', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ id: 'stu-1', admission_no: 'A1', name: 'Ankit' } as any)
      .mockResolvedValueOnce([{ id: 'a1', student_id: 'stu-1', date: '2026-08-13', status: 'v' }] as any);

    await expect(httpServices.attendance.today()).resolves.toBe('leave');
    expect(spy.mock.calls[1][0]).toMatch(
      /^\/students\/stu-1\/attendance\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('leave.list GETs /leave', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.leave.list('c1');
    expect(spy.mock.calls[0][0]).toBe('/leave');
  });
});

describe('httpServices.auth', () => {
  const sessionDto = {
    access_token: 'ACC',
    refresh_token: 'REF',
    user: { id: 'u1', name: 'Asha', email: 'asha@school.edu', role: 'student' as const },
    tenant: { id: 'sch1', name: 'WBA' },
  };

  afterEach(() => jest.restoreAllMocks());

  it('signIn persists tokens and returns a mapped Session', async () => {
    jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce(sessionDto as any)
      .mockResolvedValueOnce({ id: 'u1', email: 'asha@school.edu', role: 'student' } as any);
    const setToken = jest.spyOn(client, 'setAuthToken');
    const session = await httpServices.auth.signIn('asha@school.edu', 'pw', 'student');
    expect(session).toEqual({ token: 'ACC', role: 'student', email: 'asha@school.edu' });
    expect(setToken).toHaveBeenCalledWith('ACC');
    expect(tokenStore.save).toHaveBeenCalledWith({
      access: 'ACC', refresh: 'REF', role: 'student', email: 'asha@school.edu', tenantId: 'sch1',
    });
  });

  it('signIn hydrates from /auth/me when login returns tokens only', async () => {
    jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ access_token: 'ACC', refresh_token: 'REF' } as any)
      .mockResolvedValueOnce({
        id: '349ca4ec',
        email: 'ankit@yopmail.com',
        roles: ['student'],
        tenant_id: 'sch1',
      } as any);
    const session = await httpServices.auth.signIn('sccrdtb/STU/26/0002', 'ankit@123', 'student');
    expect(session).toEqual({ token: 'ACC', role: 'student', email: 'ankit@yopmail.com' });
    expect(tokenStore.save).toHaveBeenCalledWith({
      access: 'ACC', refresh: 'REF', role: 'student', email: 'ankit@yopmail.com', tenantId: 'sch1',
    });
  });

  it('signIn classifies an admission ID and sends it as student_id', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    await httpServices.auth.signIn('WBA-2024-1042', 'pw', 'student');
    expect(spy.mock.calls[0][0]).toBe('/auth/login');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      student_id: 'WBA-2024-1042', password: 'pw', role: 'student',
    });
  });

  it('signIn sends a numeric-looking student ID as student_id, not phone', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    await httpServices.auth.signIn('2600003', 'pw', 'student');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      student_id: '2600003', password: 'pw', role: 'student',
    });
  });

  it('signIn classifies a phone number and sends it as phone', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    await httpServices.auth.signIn('415 555 0142', 'pw', 'parent');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      phone: '415 555 0142', password: 'pw', role: 'parent',
    });
  });

  it('requestPasswordReset posts to /auth/password/forgot', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({
      channel: 'email',
      sent: true,
      sent_to: 'm***@wba.edu',
      recipient: 'self',
    } as any);
    const spy = jest.spyOn(client, 'apiFetch');
    const res = await httpServices.auth.requestPasswordReset('maya@wba.edu');
    expect(spy.mock.calls[0][0]).toBe('/auth/password/forgot');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({ identifier: 'maya@wba.edu' });
    expect(res).toEqual({
      channel: 'email',
      sent: true,
      sentTo: 'm***@wba.edu',
      recipient: 'self',
    });
  });

  it('requestPasswordReset maps parent fallback sent_to and never uses admission ID', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({
      channel: 'email',
      sent: true,
      sent_to: 'p***@home.com',
      recipient: 'parent',
    } as any);
    const res = await httpServices.auth.requestPasswordReset('sccrdtb/STU/26/0002');
    expect(res.sentTo).toBe('p***@home.com');
    expect(res.recipient).toBe('parent');
    expect(res.sentTo).not.toContain('sccrdtb');
  });

  it('requestPasswordReset falls back to generic label when backend omits sent_to', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({ channel: 'email', sent: true } as any);
    const res = await httpServices.auth.requestPasswordReset('sccrdtb/STU/26/0002');
    expect(res.sentTo).toBe('your registered email');
    expect(res.sentTo).not.toContain('sccrdtb');
  });

  it('resetPassword posts identifier+code+password to /auth/password/reset', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(undefined as any);
    await httpServices.auth.resetPassword('maya@wba.edu', '123456', 'NewPass123');
    expect(spy.mock.calls[0][0]).toBe('/auth/password/reset');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      identifier: 'maya@wba.edu', code: '123456', password: 'NewPass123',
    });
  });

  it('refresh maps token fields', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({ access_token: 'A2', refresh_token: 'R2' } as any);
    await expect(httpServices.auth.refresh('REF')).resolves.toEqual({ access: 'A2', refresh: 'R2' });
  });

  it('getMe maps roles[] from /auth/me when role is omitted', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({
      id: 'u1', name: 'Ankit', email: 'ankit@yopmail.com', roles: ['student'],
    } as any);
    await expect(httpServices.auth.getMe()).resolves.toEqual({ role: 'student', email: 'ankit@yopmail.com' });
  });
});
