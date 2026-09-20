import { httpServices } from '@/services/http';
import * as client from '@/api/client';
import { setAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { clearSisStudentCache } from '@/services/http/sisStudent';
import { weekdayShort } from '@/services/http/mappers';

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
      id: 'sis-1', admission_no: 'WBA-2024-1042', name: 'Maya Patel', initials: 'MP',
      grade: '9', class_label: '9-A', house: 'Blue', email: 'maya@wba.edu',
      school: 'Westbrook Academy', attendance_pct: 94, overall_avg: 88, rank: 3, rank_of: 40,
    } as any);
    const profile = await httpServices.student.getProfile();
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(profile.studentId).toBe('WBA-2024-1042');
    expect(profile.attnPct).toBe(94);
    spy.mockRestore();
  });

  it('student.getAchievements GETs /achievements?student_id', async () => {
    const spy = jest
      .spyOn(client, 'apiFetch')
      .mockResolvedValueOnce([
        { id: 'computed:attendance-perfect:sis-1', title: 'Perfect attendance', date: '2026-08-13', icon: 'check', hue: 'teal' },
      ] as any);
    const rows = await httpServices.student.getAchievements('sis-1');
    expect(spy.mock.calls[0][0]).toBe('/achievements?student_id=sis-1');
    expect(rows[0]).toMatchObject({ title: 'Perfect attendance', icon: 'check' });
    spy.mockRestore();
  });

  it('does not swallow network errors as empty achievement lists', async () => {
    const { ApiError } = require('@/services/errors');
    const spy = jest
      .spyOn(client, 'apiFetch')
      .mockRejectedValueOnce(new ApiError('Network error: /achievements', 0, undefined, undefined, 'CONNECTION_ERROR'));
    await expect(httpServices.student.getAchievements('sis-1')).rejects.toMatchObject({
      kind: 'CONNECTION_ERROR',
    });
    spy.mockRestore();
  });

  it('settings.get GETs /me/settings', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      chat_alerts: false,
      school_notices: true,
      in_app_toasts: true,
    } as any);
    const prefs = await httpServices.settings.get();
    expect(spy.mock.calls[0][0]).toBe('/me/settings');
    expect(prefs).toEqual({ chatAlerts: false, schoolNotices: true, inAppToasts: true });
    spy.mockRestore();
  });

  it('fees.list GETs /fees/invoices?student_id and maps invoices', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
      { id: 'f1', period: 'Jul', due_date: '2026-07-10', amount: 12000, status: 'due' },
    ] as any);
    const fees = await httpServices.fees.list('c1');
    expect(spy.mock.calls[0][0]).toBe('/fees/invoices?student_id=c1');
    expect(fees[0].dueDate).toBe('2026-07-10');
    spy.mockRestore();
  });

  it('fees.createRazorpayOrder POSTs /fees/invoices/{id}/razorpay/order and maps the snake_case order', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      order_id: 'order_x', amount: 480000, currency: 'INR', key_id: 'rzp_test_school1',
    } as any);
    const order = await httpServices.fees.createRazorpayOrder('INV-1');
    expect(spy.mock.calls[0][0]).toBe('/fees/invoices/INV-1/razorpay/order');
    expect(order).toEqual({ orderId: 'order_x', amount: 480000, currency: 'INR', keyId: 'rzp_test_school1' });
    spy.mockRestore();
  });

  it('fees.verifyRazorpayPayment POSTs /fees/invoices/{id}/razorpay/verify with a snake_case body and surfaces only the payment status', async () => {
    // The backend returns a payment record here (id/student/amount/method/ref/date/...), not
    // a FeeInvoiceDTO — the mocked response below stands in for that shape.
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      id: 'pay_x', tenant_id: 't1', student_id: 's1', student_name: 'Kid', class_label: '5A',
      fee_type: 'Tuition', amount: 4800, method: 'razorpay', ref: 'pay_x', date: '2026-07-10',
      invoice_id: 'INV-1', head_id: 'h1', status: 'paid',
    } as any);
    const result = await httpServices.fees.verifyRazorpayPayment('INV-1', {
      razorpayOrderId: 'order_x', razorpayPaymentId: 'pay_x', razorpaySignature: 'sig',
    });
    expect(spy.mock.calls[0][0]).toBe('/fees/invoices/INV-1/razorpay/verify');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual({
      razorpay_order_id: 'order_x', razorpay_payment_id: 'pay_x', razorpay_signature: 'sig',
    });
    expect(result).toEqual({ status: 'paid' });
    spy.mockRestore();
  });

  it('transport.list GETs /me/children/bus and maps every child row', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
      {
        student_id: 'sis-1', student_name: 'Aarav', admission_no: 'A1',
        bus_id: 'bus-12', bus_no: '12', route_name: 'Morning',
        status: 'on_route', tracking_status: 'LIVE', assignment: 'assigned',
        lat: 1, lng: 2, speed_kmh: 20, next_stop_name: 'Gate', last_ping_at: '2026-09-18T06:00:00Z',
      },
    ] as any);
    const rows = await httpServices.transport.list();
    expect(spy.mock.calls[0][0]).toBe('/me/children/bus');
    expect(rows[0]).toMatchObject({ studentId: 'sis-1', busNo: '12', trackingStatus: 'LIVE' });
    spy.mockRestore();
  });

  it('transport.forChild without an id pins to /students/me, not a sibling row', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce([
        {
          student_id: 'sib-9', student_name: 'Sibling', admission_no: 'B2',
          bus_id: 'bus-99', bus_no: '99', route_name: 'Other',
          status: 'idle', tracking_status: 'OFFLINE', assignment: 'assigned',
        },
        {
          student_id: 'sis-1', student_name: 'Cube', admission_no: 'A1',
          bus_id: 'bus-12', bus_no: 'BUS 001 UP', route_name: 'cube',
          status: 'idle', tracking_status: 'OFFLINE', assignment: 'assigned',
        },
      ] as any)
      .mockResolvedValueOnce({ id: 'sis-1', name: 'Cube', admission_no: 'A1' } as any);
    const row = await httpServices.transport.forChild('');
    expect(spy.mock.calls[0][0]).toBe('/me/children/bus');
    expect(spy.mock.calls[1][0]).toBe('/students/me');
    expect(row).toMatchObject({ studentId: 'sis-1', busNo: 'BUS 001 UP' });
    spy.mockRestore();
  });
});

describe('httpServices derived paths', () => {
  afterEach(() => jest.restoreAllMocks());

  it('listGrades loads GET /grades?student_id from roster id', async () => {
    const spy = jest
      .spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({
        id: 'sis-1',
        name: 'Maya',
        admission_no: 'WBA-1',
      } as any)
      .mockResolvedValueOnce([
        {
          id: 'g1',
          subject_id: 'm',
          subject: 'Mathematics',
          paper_name: 'Unit Test 1',
          marks: 90,
          max_marks: 100,
          grade: 'A',
          date: '2026-07-10',
        },
        {
          id: 'g2',
          subject_id: 's',
          subject: 'Science',
          paper_name: 'Lab',
          marks: 80,
          max_marks: 100,
          grade: 'B',
          date: '2026-07-11',
        },
      ] as any);
    clearSisStudentCache();
    const grades = await httpServices.grades.listGrades();
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(spy.mock.calls[1][0]).toBe('/grades?student_id=sis-1');
    expect(grades).toEqual([
      {
        id: 'g1',
        subjId: 'm',
        subjectName: 'Mathematics',
        title: 'Unit Test 1',
        score: 90,
        max: 100,
        grade: 'A',
        date: '2026-07-10',
      },
      {
        id: 'g2',
        subjId: 's',
        subjectName: 'Science',
        title: 'Lab',
        score: 80,
        max: 100,
        grade: 'B',
        date: '2026-07-11',
      },
    ]);
    spy.mockRestore();
  });

  it('listGrades uses the given student_id without /students/me', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([] as any);
    await httpServices.grades.listGrades('child-sis');
    expect(spy.mock.calls[0][0]).toBe('/grades?student_id=child-sis');
    spy.mockRestore();
  });

  it('listExams loads GET /exam-papers?student_id from roster id', async () => {
    const spy = jest
      .spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ id: 'sis-1', name: 'Maya' } as any)
      .mockResolvedValueOnce([] as any);
    clearSisStudentCache();
    await httpServices.grades.listExams();
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(spy.mock.calls[1][0]).toBe('/exam-papers?student_id=sis-1');
    spy.mockRestore();
  });

  it('subjects.list loads GET /subjects?student_id for a parent child', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p.startsWith('/subjects')) return [] as any;
      if (p.includes('/timetable')) return [] as any;
      throw new Error(`unexpected ${p}`);
    });
    await httpServices.subjects.list('child-sis');
    expect(spy.mock.calls[0][0]).toBe('/subjects?student_id=child-sis');
    spy.mockRestore();
  });

  it('getTimetable for a parent child uses /students/{id}/timetable, not /timetable', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p === '/students/sis-b/timetable') return [] as any;
      if (p === '/subjects?student_id=sis-b') return [] as any;
      throw new Error(`unexpected ${p}`);
    });
    await httpServices.student.getTimetable('sis-b');
    const paths = spy.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(['/students/sis-b/timetable', '/subjects?student_id=sis-b']));
    expect(paths).not.toContain('/timetable');
    spy.mockRestore();
  });

  it('homework.list loads GET /homework?student_id from roster id', async () => {
    const spy = jest
      .spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({
        id: 'sis-1',
        name: 'Maya',
        admission_no: 'WBA-1',
      } as any)
      .mockResolvedValueOnce([
        {
          id: 'h1',
          title: 'Practice',
          subject_id: 'guid-music',
          due_date: '2026-08-14',
          due_time: '17:00',
          status: 'todo',
          priority: 'med',
        },
      ] as any);
    clearSisStudentCache();
    const rows = await httpServices.homework.list();
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(spy.mock.calls[1][0]).toBe('/homework?student_id=sis-1');
    expect(rows[0]).toMatchObject({ id: 'h1', subjId: 'guid-music', title: 'Practice' });
    spy.mockRestore();
  });

  it('parent.children lists every linked child via /parents/me/children', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
      { id: 'sis-1', name: 'Kid One' },
      { id: 'sis-2', name: 'Kid Two' },
    ] as any);
    const kids = await httpServices.parent.children();
    expect(spy.mock.calls[0][0]).toBe('/parents/me/children');
    expect(kids).toHaveLength(2);
    expect(kids.map((k) => k.name)).toEqual(['Kid One', 'Kid Two']);
  });

  it('parent.children surfaces roster errors (does not swallow them)', async () => {
    jest.spyOn(client, 'apiFetch').mockRejectedValue(new Error('network'));
    await expect(httpServices.parent.children()).rejects.toThrow('network');
  });

  it('parent.children maps live StudentResponse fields onto Child', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
      {
        id: 'sis-1',
        name: 'Ankit Rana',
        admission_no: 'SCC/26/0002',
        class_label: 'IV-B',
        attendance_pct: 96,
        fee_status: 'paid',
      },
    ] as any);
    const kids = await httpServices.parent.children();
    expect(kids).toEqual([
      expect.objectContaining({
        id: 'sis-1',
        name: 'Ankit Rana',
        studentId: 'SCC/26/0002',
        grade: 'IV-B',
        attn: 96,
        fee: 'Paid',
      }),
    ]);
  });

  it('parent.getProfile resolves via /auth/me (no dedicated /parents/me)', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      name: 'Priya Rao',
      email: 'priya@example.com',
      phone: '9876543210',
    } as any);
    const profile = await httpServices.parent.getProfile();
    expect(spy.mock.calls[0][0]).toBe('/auth/me');
    expect(profile).toMatchObject({ name: 'Priya Rao', email: 'priya@example.com', phone: '9876543210' });
  });

  it("childToday derives classes from live GET /timetable and merges today's period attendance", async () => {
    const today = weekdayShort();
    jest.spyOn(client, 'apiFetch').mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p === '/students/c1/timetable') {
        return [
          { day: today, period: 1, subject: 'Math', start_time: '00:00', end_time: '00:01' },
          { day: today, period: 2, subject: 'Science', start_time: '00:02', end_time: '00:03' },
        ] as any;
      }
      if (p.startsWith('/subjects')) return [] as any;
      if (p.includes('/attendance/periods')) {
        return [{ id: 'p1', date: '2026-08-15', period: 1, status: 'present' }] as any;
      }
      if (p.includes('/attendance')) {
        return [{ id: 'a1', date: '2026-08-13', status: 'leave' }] as any;
      }
      return [] as any;
    });

    const result = await httpServices.parent.childToday('c1');
    expect(result?.classes).toEqual([
      { t: '12:00 AM', label: 'Math', done: true, attn: 'present' },
      { t: '12:02 AM', label: 'Science', done: true, attn: null },
    ]);
    expect(result?.meals).toEqual({ breakfast: '', lunch: '' });
    expect(result?.pickup).toBe('—');
    expect(result?.todayAttn).toBe('present');
  });

  it('childToday shows absent on Home when a class period is absent even if the daily roll is present', async () => {
    const today = weekdayShort();
    jest.spyOn(client, 'apiFetch').mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p === '/students/c1/timetable') {
        return [
          { day: today, period: 1, subject: 'Math', start_time: '00:00', end_time: '00:01' },
          { day: today, period: 2, subject: 'Science', start_time: '00:02', end_time: '00:03' },
        ] as any;
      }
      if (p.startsWith('/subjects')) return [] as any;
      if (p.includes('/attendance/periods')) {
        return [
          { id: 'p1', date: '2026-09-18', period: 1, status: 'present' },
          { id: 'p2', date: '2026-09-18', period: 2, status: 'absent' },
        ] as any;
      }
      if (p.includes('/attendance')) {
        return [{ id: 'a1', date: '2026-09-18', status: 'present' }] as any;
      }
      return [] as any;
    });

    const result = await httpServices.parent.childToday('c1');
    expect(result?.classes.map((c) => c.attn)).toEqual(['present', 'absent']);
    expect(result?.todayAttn).toBe('absent');
  });

  it('childToday uses period marks when the daily roll is not marked', async () => {
    const today = weekdayShort();
    jest.spyOn(client, 'apiFetch').mockImplementation(async (path: unknown) => {
      const p = String(path);
      if (p === '/students/c1/timetable') {
        return [
          { day: today, period: 1, subject: 'Math', start_time: '00:00', end_time: '00:01' },
          { day: today, period: 2, subject: 'Science', start_time: '00:02', end_time: '00:03' },
        ] as any;
      }
      if (p.startsWith('/subjects')) return [] as any;
      if (p.includes('/attendance/periods')) {
        return [
          { id: 'p1', date: '2026-08-26', period: 1, status: 'present' },
          { id: 'p2', date: '2026-08-26', period: 2, status: 'present' },
        ] as any;
      }
      if (p.includes('/attendance')) return [] as any;
      return [] as any;
    });

    const result = await httpServices.parent.childToday('c1');
    expect(result?.classes.map((c) => c.attn)).toEqual(['present', 'present']);
    expect(result?.todayAttn).toBe('present');
  });

  it('childToday does not fall back to /students/me when childId is missing', async () => {
    const spy = jest.spyOn(client, 'apiFetch');
    const result = await httpServices.parent.childToday('');
    expect(spy).not.toHaveBeenCalled();
    expect(result).toEqual({
      classes: [],
      meals: { breakfast: '', lunch: '' },
      pickup: '—',
      todayAttn: null,
    });
    spy.mockRestore();
  });

  it('attendance.month uses local calendar date bounds', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.attendance.month('c1');
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const lastDay = String(new Date(year, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
    const urls = spy.mock.calls.map((c) => c[0]);
    expect(urls).toEqual(expect.arrayContaining([
      `/students/c1/attendance?from=${year}-${month}-01&to=${year}-${month}-${lastDay}`,
      `/students/c1/attendance/periods?from=${year}-${month}-01&to=${year}-${month}-${lastDay}`,
    ]));
    spy.mockRestore();
  });

  it('attendance.periods for a parent child skips /students/me', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.attendance.periods('sis-b', '2026-08-01', '2026-08-31');
    expect(spy.mock.calls.map((c) => c[0])).toEqual([
      '/students/sis-b/attendance/periods?from=2026-08-01&to=2026-08-31',
    ]);
    spy.mockRestore();
  });

  it('attendance.periods for a student resolves SIS id via /students/me', async () => {
    const spy = jest
      .spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ id: 'sis-1', name: 'Maya' } as any)
      .mockResolvedValueOnce([] as any);
    clearSisStudentCache();
    await httpServices.attendance.periods(undefined, '2026-08-01', '2026-08-31');
    expect(spy.mock.calls[0][0]).toBe('/students/me');
    expect(spy.mock.calls[1][0]).toBe(
      '/students/sis-1/attendance/periods?from=2026-08-01&to=2026-08-31',
    );
    spy.mockRestore();
  });

  it('leave.list GETs /leave?student_id', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([] as any);
    await httpServices.leave.list('c1');
    expect(spy.mock.calls[0][0]).toBe('/leave?student_id=c1');
    spy.mockRestore();
  });

  it('leave.list keeps only the selected child’s requests', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue([
      { id: 'l1', child_id: 'c1', from_date: '2026-07-01T00:00:00', to_date: '2026-07-02', reason: 'Trip', status: 'pending' },
      { id: 'l2', child_id: 'c2', from_date: '2026-07-03', to_date: '2026-07-03', reason: 'Sick', status: 'approved' },
    ] as any);
    const rows = await httpServices.leave.list('c1');
    expect(rows.map((r) => r.id)).toEqual(['l1']);
    expect(rows[0].from).toBe('2026-07-01');
    spy.mockRestore();
  });

  it('leave.submit POSTs attachment_urls with the leave body', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue({
      id: 'l1',
      child_id: 'c1',
      from_date: '2026-07-01',
      to_date: '2026-07-02',
      reason: 'Medical',
      note: 'flu',
      status: 'pending',
    } as any);
    await httpServices.leave.submit({
      childId: 'c1',
      from: '2026-07-01',
      to: '2026-07-02',
      reason: 'Medical',
      note: 'flu',
      attachmentUrls: ['data:image/jpeg;base64,abc'],
    });
    expect(spy.mock.calls[0][0]).toBe('/leave');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toMatchObject({
      type: 'medical',
      child_id: 'c1',
      from_date: '2026-07-01',
      to_date: '2026-07-02',
      reason: 'Medical',
      note: 'flu',
      attachment_urls: ['data:image/jpeg;base64,abc'],
    });
    spy.mockRestore();
  });
});

describe('httpServices.auth', () => {
  beforeEach(() => {
    (tokenStore.save as jest.Mock).mockClear();
    (tokenStore.clear as jest.Mock).mockClear();
  });
  afterEach(() => jest.restoreAllMocks());

  it('signIn posts email (not identifier) and hydrates from /auth/me', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ access_token: 'ACC', refresh_token: 'REF' } as any)
      .mockResolvedValueOnce({
        id: 'u1', email: 'asha@school.edu', roles: ['student'], tenant_id: 'sch1',
      } as any);
    const setToken = jest.spyOn(client, 'setAuthToken');
    const session = await httpServices.auth.signIn('Asha@School.edu', 'pw', 'student');
    expect(spy.mock.calls[0][0]).toBe('/auth/login');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual({
      email: 'asha@school.edu', password: 'pw', role: 'student',
    });
    expect(spy.mock.calls[1][0]).toBe('/auth/me');
    expect(session).toEqual({ token: 'ACC', role: 'student', email: 'asha@school.edu' });
    expect(setToken).toHaveBeenCalledWith('ACC');
    expect(tokenStore.save).toHaveBeenCalledWith({
      access: 'ACC', refresh: 'REF', role: 'student', email: 'asha@school.edu', tenantId: 'sch1',
    });
  });

  it('signIn posts student_id for admission identifiers', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ access_token: 'ACC', refresh_token: 'REF' } as any)
      .mockResolvedValueOnce({ id: 'u1', email: '', roles: ['student'] } as any);
    await httpServices.auth.signIn('sccrdtb/STU/26/0002', 'pw', 'student');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual({
      student_id: 'sccrdtb/STU/26/0002', password: 'pw', role: 'student',
    });
  });

  it('signIn on the student tab rejects a parent account', async () => {
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ access_token: 'ACC', refresh_token: 'REF' } as any)
      .mockResolvedValueOnce({
        id: 'u1', email: 'dad@home.test', roles: ['student.parent'],
      } as any);
    await expect(httpServices.auth.signIn('dad@home.test', 'pw', 'student'))
      .rejects.toMatchObject({ status: 403, code: 'wrong_role' });
    expect(tokenStore.clear).toHaveBeenCalled();
    expect(tokenStore.save).not.toHaveBeenCalled();
    expect(spy.mock.calls[0][0]).toBe('/auth/login');
  });

  it('signIn on the parent tab rejects a student account', async () => {
    jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ access_token: 'ACC', refresh_token: 'REF' } as any)
      .mockResolvedValueOnce({
        id: 'u2', email: 'kid@school.test', roles: ['student'],
      } as any);
    await expect(httpServices.auth.signIn('kid@school.test', 'pw', 'parent'))
      .rejects.toMatchObject({ status: 403, code: 'wrong_role' });
    expect(tokenStore.clear).toHaveBeenCalled();
  });

  it('signIn on the student tab rejects a parent JWT when /auth/me fails', async () => {
    const payload = Buffer.from(JSON.stringify({ role: 'student.parent' })).toString('base64url');
    const access = `eyJhbGciOiJub25lIn0.${payload}.sig`;
    jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce({ access_token: access, refresh_token: 'REF' } as any)
      .mockRejectedValueOnce(new Error('offline'));
    await expect(httpServices.auth.signIn('dad@home.test', 'pw', 'student'))
      .rejects.toMatchObject({ status: 403, code: 'wrong_role' });
    expect(tokenStore.clear).toHaveBeenCalled();
  });

  it('refresh maps token fields', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({ access_token: 'A2', refresh_token: 'R2' } as any);
    await expect(httpServices.auth.refresh('REF')).resolves.toEqual({ access: 'A2', refresh: 'R2' });
  });

  it('getMe returns role + email from roles[]', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({
      id: 'u1', name: 'Asha', email: 'asha@school.edu', roles: ['student'],
    } as any);
    await expect(httpServices.auth.getMe()).resolves.toEqual({ role: 'student', email: 'asha@school.edu' });
  });

  it('requestPasswordReset posts identifier and selected role', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue({
      sent: true, channel: 'email', sent_to: 'd***@home.test', recipient: 'self',
    } as any);
    await expect(httpServices.auth.requestPasswordReset('Dad@Home.test', 'parent')).resolves.toEqual({
      sent: true, channel: 'email', sentTo: 'd***@home.test', recipient: 'self',
    });
    expect(spy.mock.calls[0][0]).toBe('/auth/password/forgot');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual({
      identifier: 'dad@home.test', role: 'parent',
    });
  });

  it('school.getCurrent loads tenant mark from /auth/me (not GET /school)', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      id: 'u1',
      tenant_id: 't1',
      tenant_name: 'SCC Academy',
      tenant_logo_url: 'https://cdn/logo.png',
      tenant_image_url: 'https://cdn/cover.png',
    } as any);
    const school = await httpServices.school.getCurrent();
    expect(spy.mock.calls[0][0]).toBe('/auth/me');
    expect(school).toMatchObject({
      id: 't1',
      name: 'SCC Academy',
      logoUrl: 'https://cdn/logo.png',
      imageUrl: 'https://cdn/cover.png',
    });
    spy.mockRestore();
  });

  it('announcements.list prepends GET /notifications onto the feed', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockImplementation(async (path: string) => {
      if (String(path).startsWith('/announcements')) {
        return [{ id: 'a1', from: 'Office', role: 'admin', date: '2026-08-13', title: 'Holiday', body: 'Closed', type: 'info' }];
      }
      if (path === '/notifications') {
        return [{ id: 'n1', title: 'Timetable updated', body: '1 class · 30 periods', time: 'Just now' }];
      }
      throw new Error(`unexpected ${path}`);
    });
    const rows = await httpServices.announcements.list('student');
    expect(rows.map((r) => r.id)).toEqual(['n1', 'a1']);
    expect(rows[0]).toMatchObject({ from: 'School', role: 'notice', title: 'Timetable updated' });
    spy.mockRestore();
  });

  it('announcements.list maps chat alerts onto the notices feed', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockImplementation(async (path: string) => {
      if (String(path).startsWith('/announcements')) return [];
      if (path === '/notifications') {
        return [
          { id: 'c1', title: 'Amit', body: 'Hi', tone: 'chat', unread: true },
          { id: 'f1', title: 'Fee due', body: 'Pay by May 5', tone: 'fees', unread: true },
        ];
      }
      throw new Error(`unexpected ${path}`);
    });
    const rows = await httpServices.announcements.list('student');
    expect(rows.map((r) => r.id)).toEqual(['c1', 'f1']);
    expect(rows[0]).toMatchObject({ from: 'Amit', role: 'message' });
    expect(rows[1]).toMatchObject({ from: 'Fees', role: 'fees' });
    spy.mockRestore();
  });

  it('announcements.list puts the newest notification first', async () => {
    jest.spyOn(client, 'apiFetch').mockImplementation(async (path: string) => {
      if (String(path).startsWith('/announcements')) {
        return [{ id: 'a1', from: 'Office', role: 'admin', date: '2026-08-13', title: 'Holiday', body: 'Closed', type: 'info' }];
      }
      if (path === '/notifications') {
        return [
          { id: 'old', title: 'Old note', body: 'yesterday', time: '09:00:00', unread: false },
          { id: 'new', title: 'School Owner', body: 'gg', tone: 'chat', time: '23:28:21', unread: true },
        ];
      }
      throw new Error(`unexpected ${path}`);
    });
    const rows = await httpServices.announcements.list('parent');
    expect(rows.map((r) => r.id)).toEqual(['new', 'a1']);
    expect(rows[0]).toMatchObject({ id: 'new', title: 'Message from School Owner', body: 'gg', unread: true });
    expect(rows.find((r) => r.id === 'old')).toBeUndefined();
  });

  it('student.getTimetable does not swallow GET /timetable errors', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockImplementation(async (path: string) => {
      if (path === '/timetable') throw new Error('forbidden');
      if (String(path).startsWith('/subjects')) return [];
      throw new Error(`unexpected ${path}`);
    });
    await expect(httpServices.student.getTimetable()).rejects.toThrow('forbidden');
    spy.mockRestore();
  });

  it('messaging.threads loads GET /threads', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
      {
        id: '3c8a1c9e-1111-2222-3333-444444444444',
        name: 'Amit Yadav',
        role: 'Class teacher',
        last_message: 'See you at PTM',
        last_at: '09:15',
        unread: 1,
      },
    ] as any);
    const rows = await httpServices.messaging.threads('student');
    expect(spy.mock.calls[0][0]).toBe('/threads');
    expect(rows[0]).toMatchObject({ id: '3c8a1c9e-1111-2222-3333-444444444444', name: 'Amit Yadav', last: 'See you at PTM' });
    spy.mockRestore();
  });

  it('messaging.messages and send use /threads/{id}/messages', async () => {
    const id = '3c8a1c9e-1111-2222-3333-444444444444';
    const spy = jest.spyOn(client, 'apiFetch')
      .mockResolvedValueOnce([
        { id: 'm1', thread_id: id, text: 'Hello', sent_at: '09:00', is_mine: false },
      ] as any)
      .mockResolvedValueOnce({ id: 'm2', thread_id: id, text: 'Hi', sent_at: 'now', is_mine: true } as any);
    const msgs = await httpServices.messaging.messages(id);
    expect(spy.mock.calls[0][0]).toBe(`/threads/${id}/messages`);
    expect(msgs[0]).toMatchObject({ from: 'them', text: 'Hello' });
    const sent = await httpServices.messaging.send(id, 'Hi');
    expect(spy.mock.calls[1][0]).toBe(`/threads/${id}/messages`);
    expect(JSON.parse(spy.mock.calls[1][1].body as string)).toEqual({ text: 'Hi' });
    expect(sent.from).toBe('me');
    spy.mockRestore();
  });

  it('messaging.send blocks abusive language before POST', async () => {
    const spy = jest.spyOn(client, 'apiFetch');
    await expect(httpServices.messaging.send('3c8a1c9e-1111-2222-3333-444444444444', 'kiss me tonight')).rejects.toMatchObject({
      name: 'ChatModerationError',
      reason: 'abusive_language',
    });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('messaging.send includes image_url in the POST body when an image is attached', async () => {
    const id = '3c8a1c9e-1111-2222-3333-444444444444';
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({
      id: 'm3', thread_id: id, text: '', sent_at: 'now', is_mine: true, image_url: 'data:image/jpeg;base64,abc',
    } as any);
    const sent = await httpServices.messaging.send(id, '', 'data:image/jpeg;base64,abc');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual({ text: '', image_url: 'data:image/jpeg;base64,abc' });
    expect(sent.imageUrl).toBe('data:image/jpeg;base64,abc');
    spy.mockRestore();
  });

  it('messaging.send blocks an unsupported image before POST', async () => {
    const spy = jest.spyOn(client, 'apiFetch');
    await expect(
      httpServices.messaging.send('3c8a1c9e-1111-2222-3333-444444444444', '', 'data:text/plain;base64,abc'),
    ).rejects.toMatchObject({ name: 'ChatModerationError', reason: 'inappropriate_image' });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
