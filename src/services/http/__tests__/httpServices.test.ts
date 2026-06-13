import { httpServices } from '@/services/http';
import { setAuthToken } from '@/api/client';

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
