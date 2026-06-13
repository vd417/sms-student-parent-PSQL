import type { StudentDTO, FeeInvoiceDTO, AnnouncementDTO, SessionDTO } from '@/services/http/dtos';

describe('canonical DTO key contract', () => {
  it('StudentDTO uses admission_no / attendance_pct / class_label', () => {
    const d: StudentDTO = {
      id: 's1', admission_no: 'WBA-2024-1042', name: 'Maya Patel', initials: 'MP',
      grade: '9', class_label: '9-A', house: 'Blue', email: 'maya@wba.edu',
      school: 'Westbrook Academy', attendance_pct: 94, overall_avg: 88, rank: 3, rank_of: 40,
    };
    expect(Object.keys(d)).toEqual(expect.arrayContaining(['admission_no', 'attendance_pct', 'class_label', 'overall_avg', 'rank_of']));
  });

  it('FeeInvoiceDTO uses due_date / paid_on and item {label, amount}', () => {
    const d: FeeInvoiceDTO = {
      id: 'f1', period: 'Jul 2026', due_date: '2026-07-10', amount: 12000,
      status: 'due', items: [{ label: 'Tuition', amount: 10000 }],
    };
    expect(d.due_date).toBe('2026-07-10');
    expect(d.items?.[0].label).toBe('Tuition');
  });

  it('AnnouncementDTO uses date (not when) and has type', () => {
    const d: AnnouncementDTO = { id: 'a1', from: 'Office', role: 'admin', date: '2026-06-13', title: 'T', body: 'B', type: 'info' };
    expect(d.date).toBe('2026-06-13');
    expect(d.type).toBe('info');
  });

  it('SessionDTO carries access_token + refresh_token', () => {
    const d: SessionDTO = { access_token: 'a', refresh_token: 'r', role: 'student', email: 'm@wba.edu' };
    expect(d.access_token).toBe('a');
    expect(d.refresh_token).toBe('r');
  });
});
