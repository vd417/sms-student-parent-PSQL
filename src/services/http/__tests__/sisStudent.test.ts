import * as client from '@/api/client';
import { clearSisStudentCache, loadMyStudent } from '@/services/http/sisStudent';

describe('loadMyStudent', () => {
  afterEach(() => {
    clearSisStudentCache();
    jest.restoreAllMocks();
  });

  it('uses GET /students/me', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      id: 'sis',
      admission_no: 'A-1',
      name: 'Ankit',
    } as any);
    await expect(loadMyStudent()).resolves.toMatchObject({ id: 'sis' });
    expect(spy.mock.calls[0][0]).toBe('/students/me');
  });

  it('falls back to admission search when /students/me fails', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ id: 'u1', student_id: 'sccrdtb/STU/26/0002' } as any)
      .mockResolvedValueOnce([
        { id: 'sis', admission_no: 'sccrdtb/STU/26/0002', name: 'Ankit Rana' },
      ] as any);
    const row = await loadMyStudent();
    expect(row.id).toBe('sis');
    expect(spy.mock.calls[1][0]).toBe('/auth/me');
    expect(spy.mock.calls[2][0]).toContain('/students?q=');
  });

  it('falls back to name search when /students/me fails and student_id is absent', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockRejectedValueOnce(new Error('not found'))
      .mockResolvedValueOnce({ id: 'u1', name: 'Ankit Rana' } as any)
      .mockResolvedValueOnce([
        { id: 'sis', admission_no: 'sccrdtb/STU/26/0002', name: 'Ankit Rana' },
      ] as any);
    const row = await loadMyStudent();
    expect(row.id).toBe('sis');
    expect(spy.mock.calls[2][0]).toContain(encodeURIComponent('Ankit Rana'));
  });
});
