import type { StudentDTO, FeeInvoiceDTO, AnnouncementDTO, SessionDTO, ExamPaperDTO, HomeworkDTO, LeaveRequestDTO } from '@/services/http/dtos';

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

  it('SessionDTO carries access_token + refresh_token and nested user', () => {
    const d: SessionDTO = {
      access_token: 'a', refresh_token: 'r',
      user: { id: 'u1', name: 'Maya Patel', email: 'm@wba.edu', role: 'student' },
      tenant: { id: 't1', name: 'Westbrook Academy' },
    };
    expect(d.access_token).toBe('a');
    expect(d.refresh_token).toBe('r');
    expect(d.user.role).toBe('student');
  });

  it('ExamPaperDTO uses name (canonical) for the paper title', () => {
    const d: ExamPaperDTO = {
      id: 'e1', name: 'Algebra Midterm', subject_id: 'sub1', date: '2026-07-10',
      start_time: '09:00', duration_min: 90, status: 'upcoming', max_marks: 100,
    };
    expect(d.name).toBe('Algebra Midterm');
  });

  it('HomeworkDTO carries assignment_id and LeaveRequestDTO carries type', () => {
    const hw: HomeworkDTO = {
      id: 'h1', assignment_id: 'a1', title: 'Fractions', subject_id: 'sub1',
      due_date: '2026-07-10', due_time: '17:00', status: 'todo', priority: 'med',
    };
    const lr: LeaveRequestDTO = {
      id: 'l1', child_id: 'c1', type: 'sick', from_date: '2026-07-01', to_date: '2026-07-02',
      reason: 'Fever', note: '', status: 'pending',
    };
    expect(hw.assignment_id).toBe('a1');
    expect(lr.type).toBe('sick');
  });
});
