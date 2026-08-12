import {
  toStudent,
  toFee,
  toAnnouncement,
  toSession,
  toExam,
  toLeaveRequest,
  toChatMessage,
  toAttendanceFromRecords,
} from '@/services/http/mappers';
import type { StudentDTO, FeeInvoiceDTO, AnnouncementDTO, SessionDTO, ExamPaperDTO, LeaveRequestDTO, ChatMessageDTO } from '@/services/http/dtos';

describe('http mappers → domain', () => {
  it('toStudent maps canonical fields to the domain Student', () => {
    const d: StudentDTO = {
      id: 's1', admission_no: 'WBA-2024-1042', name: 'Maya Patel', initials: 'MP',
      grade: '9', class_label: '9-A', house: 'Blue', email: 'maya@wba.edu',
      school: 'Westbrook Academy', attendance_pct: 94, overall_avg: 88, rank: 3, rank_of: 40,
    };
    expect(toStudent(d)).toEqual({
      name: 'Maya Patel', initials: 'MP', grade: '9', roll: 0, school: 'Westbrook Academy',
      studentId: 'WBA-2024-1042', email: 'maya@wba.edu', classroom: '9-A', house: 'Blue',
      overallAvg: 88, attnPct: 94, rank: 3, rankOf: 40,
    });
  });

  it('toFee maps due_date/paid_on/items', () => {
    const d: FeeInvoiceDTO = {
      id: 'f1', period: 'Jul', due_date: '2026-07-10', amount: 12000, status: 'paid',
      items: [{ label: 'Tuition', amount: 12000 }], paid_on: '2026-07-01', method: 'UPI',
    };
    expect(toFee(d)).toEqual({
      id: 'f1', period: 'Jul', dueDate: '2026-07-10', amount: 12000, status: 'paid',
      items: [{ l: 'Tuition', amt: 12000 }], paidOn: '2026-07-01', method: 'UPI',
    });
  });

  it('toAnnouncement maps date→when', () => {
    const d: AnnouncementDTO = { id: 'a1', from: 'Office', role: 'admin', date: '2026-06-13', title: 'T', body: 'B', type: 'info' };
    expect(toAnnouncement(d)).toEqual({ id: 'a1', from: 'Office', role: 'admin', when: '2026-06-13', title: 'T', body: 'B' });
  });

  it('toSession maps access_token→token and reads role/email from nested user', () => {
    const d: SessionDTO = {
      access_token: 'aaa', refresh_token: 'rrr',
      user: { id: 'u1', name: 'Parent', email: 'p@wba.edu', role: 'parent' },
      tenant: { id: 't1', name: 'Westbrook Academy' },
    };
    expect(toSession(d)).toEqual({ token: 'aaa', role: 'parent', email: 'p@wba.edu' });
  });

  it('toExam maps canonical name→title and subject_id→subjId', () => {
    const d: ExamPaperDTO = {
      id: 'e1', name: 'Algebra Midterm', subject_id: 'sub1', date: '2026-07-10',
      start_time: '09:00', duration_min: 90, status: 'graded', max_marks: 100, score: 88, grade: 'A',
    };
    expect(toExam(d)).toEqual({
      id: 'e1', title: 'Algebra Midterm', subjId: 'sub1', date: '2026-07-10',
      time: '09:00', dur: '90', status: 'graded', max: 100, score: 88, grade: 'A',
    });
  });

  it('toLeaveRequest maps child_id/from_date/to_date', () => {
    const d: LeaveRequestDTO = { id: 'l1', child_id: 'c1', from_date: '2026-07-01', to_date: '2026-07-02', reason: 'Trip', note: 'n', status: 'pending' };
    expect(toLeaveRequest(d)).toEqual({ id: 'l1', childId: 'c1', from: '2026-07-01', to: '2026-07-02', reason: 'Trip', note: 'n', status: 'pending' });
  });

  it('toChatMessage maps is_mine→from and sent_at→time', () => {
    const d: ChatMessageDTO = { id: 'm1', thread_id: 't1', sender_id: 'u1', text: 'hi', sent_at: '10:00', is_mine: true };
    expect(toChatMessage(d)).toEqual({ id: 'm1', threadId: 't1', from: 'me', text: 'hi', time: '10:00' });
  });

  it('maps leave statuses to off instead of present', () => {
    expect(toAttendanceFromRecords([
      { id: 'a1', date: '2026-08-13', status: 'leave' },
      { id: 'a2', date: '2026-08-14', status: 'v' },
    ]).days).toEqual([
      { d: 13, kind: 'off' },
      { d: 14, kind: 'off' },
    ]);
  });

  it('keeps only the last attendance row for a date', () => {
    expect(toAttendanceFromRecords([
      { id: 'a1', date: '2026-08-13', status: 'absent' },
      { id: 'a2', date: '2026-08-13', status: 'late' },
    ])).toEqual({
      days: [{ d: 13, kind: 'late' }],
      flags: [{
        id: 'a2',
        tone: 'late',
        date: '2026-08-13',
        reason: 'Late',
        action: '',
      }],
    });
  });
});
