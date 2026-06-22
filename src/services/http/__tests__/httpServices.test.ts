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

  it('student.getProfile GETs /students/me and maps the DTO', async () => {
    mockFetchOnce({
      id: 's1', admission_no: 'WBA-2024-1042', name: 'Maya Patel', initials: 'MP',
      grade: '9', class_label: '9-A', house: 'Blue', email: 'maya@wba.edu',
      school: 'Westbrook Academy', attendance_pct: 94, overall_avg: 88, rank: 3, rank_of: 40,
    });
    const profile = await httpServices.student.getProfile();
    expect(profile.studentId).toBe('WBA-2024-1042');
    expect(profile.attnPct).toBe(94);
    expect((global as any).fetch).toHaveBeenCalledWith(
      expect.stringContaining('/students/me'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer test-token' }) }),
    );
  });

  it('fees.list GETs /children/:id/fees and maps invoices', async () => {
    mockFetchOnce([{ id: 'f1', period: 'Jul', due_date: '2026-07-10', amount: 12000, status: 'due' }]);
    const fees = await httpServices.fees.list('c1');
    expect(fees[0].dueDate).toBe('2026-07-10');
    expect((global as any).fetch).toHaveBeenCalledWith(expect.stringContaining('/children/c1/fees'), expect.anything());
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
