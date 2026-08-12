import { httpServices } from '@/services/http';
import * as client from '@/api/client';
import { setAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';

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
  beforeEach(() => setAuthToken('test-token'));

  it('no service method throws NotImplementedError', () => {
    for (const domain of Object.values(httpServices)) {
      for (const fn of Object.values(domain as Record<string, unknown>)) {
        expect(typeof fn).toBe('function');
      }
    }
  });

  it('student.getProfile resolves via /auth/me then /students/{id} and maps the DTO', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ id: 's1', name: 'Maya', email: 'maya@wba.edu', role: 'student' } as any)
      .mockResolvedValueOnce({
        id: 's1', admission_no: 'WBA-2024-1042', name: 'Maya Patel', initials: 'MP',
        grade: '9', class_label: '9-A', house: 'Blue', email: 'maya@wba.edu',
        school: 'Westbrook Academy', attendance_pct: 94, overall_avg: 88, rank: 3, rank_of: 40,
      } as any);
    const profile = await httpServices.student.getProfile();
    expect(spy.mock.calls[0][0]).toBe('/auth/me');
    expect(spy.mock.calls[1][0]).toBe('/students/s1');
    expect(profile.studentId).toBe('WBA-2024-1042');
    expect(profile.attnPct).toBe(94);
    spy.mockRestore();
  });

  it('fees.list GETs /fees/invoices?student_id and maps invoices', async () => {
    mockFetchOnce([{ id: 'f1', period: 'Jul', due_date: '2026-07-10', amount: 12000, status: 'due' }]);
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

  it('listGrades aggregates grades across exam papers', async () => {
    jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }] as any)
      .mockResolvedValueOnce([{ id: 'g1', subject_id: 'm', title: 'T', score: 90, max_marks: 100, grade: 'A', date: 'd' }] as any)
      .mockResolvedValueOnce([{ id: 'g2', subject_id: 's', title: 'T', score: 80, max_marks: 100, grade: 'B', date: 'd' }] as any);
    const grades = await httpServices.grades.listGrades();
    expect(grades).toHaveLength(2);
  });

  it('parent.children GETs /students (assumed guardian-scoped)', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.parent.children();
    expect(spy.mock.calls[0][0]).toBe('/students');
  });

  it('childToday returns one daily status and strips period attendance', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({
        classes: [{ t: '09:00', label: 'Math', done: false, attn: 'present' }],
        meals: { breakfast: '', lunch: '' },
        pickup: '',
      } as any)
      .mockResolvedValueOnce([
        { id: 'a1', date: '2026-08-13', status: 'leave' },
      ] as any);

    await expect(httpServices.parent.childToday('c1')).resolves.toEqual({
      classes: [{ t: '09:00', label: 'Math', done: false }],
      meals: { breakfast: '', lunch: '' },
      pickup: '',
      todayAttn: 'leave',
    });
    expect(spy.mock.calls[1][0]).toMatch(
      /^\/students\/c1\/attendance\?from=\d{4}-\d{2}-\d{2}&to=\d{4}-\d{2}-\d{2}$/,
    );
  });

  it('attendance.month uses local calendar date bounds', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.attendance.month('c1');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
    expect(spy.mock.calls[0][0]).toBe(
      `/students/c1/attendance?from=${year}-${month}-01&to=${year}-${month}-${lastDay}`,
    );
  });

  it('leave.list GETs /leave?student_id', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.leave.list('c1');
    expect(spy.mock.calls[0][0]).toBe('/leave?student_id=c1');
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
    jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    const setToken = jest.spyOn(client, 'setAuthToken');
    const session = await httpServices.auth.signIn('asha@school.edu', 'pw', 'student');
    expect(session).toEqual({ token: 'ACC', role: 'student', email: 'asha@school.edu' });
    expect(setToken).toHaveBeenCalledWith('ACC');
    expect(tokenStore.save).toHaveBeenCalledWith({
      access: 'ACC', refresh: 'REF', role: 'student', email: 'asha@school.edu', tenantId: 'sch1',
    });
  });

  it('refresh maps token fields', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({ access_token: 'A2', refresh_token: 'R2' } as any);
    await expect(httpServices.auth.refresh('REF')).resolves.toEqual({ access: 'A2', refresh: 'R2' });
  });

  it('getMe returns role + email', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({ id: 'u1', name: 'Asha', email: 'asha@school.edu', role: 'student' } as any);
    await expect(httpServices.auth.getMe()).resolves.toEqual({ role: 'student', email: 'asha@school.edu' });
  });
});
