import {
  toStudent,
  toFee,
  toAnnouncement,
  toNotice,
  toSession,
  toExam,
  toLeaveRequest,
  toChatMessage,
  toChatThread,
  toAttendanceFromRecords,
  toTimetableBlock,
  compareTimetableBlocks,
  parseHm,
  schoolFromMe,
  subjectShortCode,
  toGrade,
  toChild,
  toAchievement,
  formatAchievementWhen,
  toTeacher,
} from '@/services/http/mappers';
import type { StudentDTO, FeeInvoiceDTO, AnnouncementDTO, NotificationDTO, SessionDTO, ExamPaperDTO, LeaveRequestDTO, ChatMessageDTO, SessionUserDTO, TeacherDTO } from '@/services/http/dtos';

describe('http mappers → domain', () => {
  it('toTeacher maps the role field', () => {
    const d: TeacherDTO = { id: 't1', name: 'Priya Rao', role: 'principal' };
    expect(toTeacher(d).role).toBe('principal');
  });

  it('toTeacher defaults role to subject_teacher when omitted', () => {
    const d: TeacherDTO = { id: 't2', name: 'Sam Lee' };
    expect(toTeacher(d).role).toBe('subject_teacher');
  });


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
      gender: '', section: '', dob: '', address: '', guardianName: '', guardianPhone: '',
      photoUrl: undefined,
    });
  });

  it('toStudent maps live SIS personal-info fields', () => {
    const d: StudentDTO = {
      id: 's1',
      admission_no: 'IVB-12',
      name: 'Ankit Rana',
      gender: 'male',
      grade: 'IV',
      section: 'B',
      class_label: 'IV-B',
      roll: 12,
      house: 'Blue',
      email: 'ankit@school.edu',
      dob: '2015-03-22T00:00:00',
      address: '12 Park Street',
      guardian_name: 'Ramesh Rana',
      guardian_phone: '9876543210',
      attendance_pct: 100,
    };
    expect(toStudent(d)).toMatchObject({
      studentId: 'IVB-12',
      classroom: 'IV-B',
      roll: 12,
      gender: 'male',
      dob: '2015-03-22',
      address: '12 Park Street',
      guardianName: 'Ramesh Rana',
      guardianPhone: '9876543210',
      attnPct: 100,
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

  it('toAchievement formats ISO dates and defaults unknown icons', () => {
    expect(
      toAchievement({
        id: 'ac1',
        title: 'Perfect attendance',
        date: '2026-08-13',
        icon: 'check',
        hue: 'teal',
      }),
    ).toEqual({
      id: 'ac1',
      title: 'Perfect attendance',
      when: formatAchievementWhen('2026-08-13'),
      icon: 'check',
      hue: 'teal',
    });
    expect(toAchievement({ id: 'x', title: 'X', date: 'Mar 2026', icon: 'nope' as any }).icon).toBe('award');
  });

  it('toNotice maps timetable publish payload onto the notices feed', () => {
    const d: NotificationDTO = {
      id: 'n1',
      title: 'Timetable updated',
      body: '1 class · 30 periods with bell times — open Schedule to refresh.',
      time: 'Just now',
      unread: true,
    };
    expect(toNotice(d)).toEqual({
      id: 'n1',
      from: 'School',
      role: 'notice',
      when: 'Just now',
      title: 'Timetable updated',
      body: '1 class · 30 periods with bell times — open Schedule to refresh.',
    });
  });

  it('toNotice maps chat alerts as messages', () => {
    expect(
      toNotice({
        id: 'c1',
        title: 'Amit Yadav',
        body: 'Please bring the notebook',
        tone: 'chat',
        time: '10:15:00',
        unread: true,
      }),
    ).toEqual({
      id: 'c1',
      from: 'Amit Yadav',
      role: 'message',
      when: '10:15:00',
      title: 'Message from Amit Yadav',
      body: 'Please bring the notebook',
    });
  });

  it('toSession maps access_token→token and reads role/email from nested user', () => {
    const d: SessionDTO = {
      access_token: 'aaa', refresh_token: 'rrr',
      user: { id: 'u1', name: 'Parent', email: 'p@wba.edu', role: 'parent' },
      tenant: { id: 't1', name: 'Westbrook Academy' },
    };
    expect(toSession(d)).toEqual({ token: 'aaa', role: 'parent', email: 'p@wba.edu' });
  });

  it('toSession accepts a token-only login payload', () => {
    expect(toSession({ access_token: 'aaa', refresh_token: 'rrr' }, 'student')).toEqual({
      token: 'aaa', role: 'student', email: '',
    });
  });

  it('toTimetableBlock maps slot times and break kind', () => {
    expect(
      toTimetableBlock({
        id: '1', day: 'Monday', period: 1, subject: 'Mathematics',
        start_time: '09:00', end_time: '09:40', teacher_name: 'Ravi', room: 'A1',
      }),
    ).toMatchObject({
      day: 'Mon', label: 'Mathematics', kind: 'class', teacher: 'Ravi', room: 'A1', d: 40,
      period: 1, startMin: 9 * 60,
    });
    expect(
      toTimetableBlock({ id: '2', day: 'Tue', subject: 'Lunch Break', start_time: '12:00', end_time: '12:30' }),
    ).toMatchObject({ day: 'Tue', kind: 'break', label: 'Lunch Break', d: 30 });
  });

  it('compareTimetableBlocks sorts AM before PM (not localeCompare on 12h strings)', () => {
    const blocks = [
      toTimetableBlock({ id: 'a', day: 'Thu', period: 8, subject: 'Music', start_time: '13:35', end_time: '14:20' }),
      toTimetableBlock({ id: 'b', day: 'Thu', period: 1, subject: 'Music', start_time: '08:15', end_time: '09:00' }),
      toTimetableBlock({ id: 'c', day: 'Thu', period: 5, subject: 'Music', start_time: '12:05', end_time: '12:50' }),
    ].sort(compareTimetableBlocks);
    expect(blocks.map((b) => b.t)).toEqual(['8:15 AM', '12:05 PM', '1:35 PM']);
    expect(blocks.map((b) => b.endT)).toEqual(['9:00 AM', '12:50 PM', '2:20 PM']);
    expect(parseHm('1:35 PM')).toBe(13 * 60 + 35);
  });

  it('subjectShortCode uses known codes and rejects junk API shorts', () => {
    expect(subjectShortCode('Mathematics', 'c')).toBe('MA');
    expect(subjectShortCode('Physical Education', 'PH')).toBe('PE');
    expect(subjectShortCode('Music', 'mu')).toBe('MU');
    expect(subjectShortCode('Hindi', null)).toBe('HI');
  });

  it('schoolFromMe maps tenant mark fields from /auth/me', () => {
    const me: SessionUserDTO = {
      id: 'u1',
      tenant_id: 't1',
      tenant_name: 'SCC Academy',
      tenant_logo_url: 'data:image/png;base64,aaa',
      tenant_image_url: 'https://cdn/cover.png',
    };
    expect(schoolFromMe(me)).toEqual({
      id: 't1',
      name: 'SCC Academy',
      shortName: 'SA',
      logoUrl: 'data:image/png;base64,aaa',
      imageUrl: 'https://cdn/cover.png',
    });
  });

  it('toGrade maps live marks/paper_name/subject fields', () => {
    expect(
      toGrade({
        id: 'g1',
        subject_id: 'sub1',
        subject: 'Mathematics',
        paper_name: 'Midterm',
        marks: 88,
        max_marks: 100,
        grade: 'A2',
        date: '2026-07-10T00:00:00Z',
      }),
    ).toEqual({
      id: 'g1',
      subjId: 'sub1',
      subjectName: 'Mathematics',
      title: 'Midterm',
      score: 88,
      max: 100,
      grade: 'A2',
      date: '2026-07-10',
    });
  });

  it('toExam maps canonical name→title and subject_id→subjId', () => {
    const d: ExamPaperDTO = {
      id: 'e1', name: 'Algebra Midterm', subject_id: 'sub1', date: '2026-07-10',
      start_time: '09:00', duration_min: 90, status: 'graded', max_marks: 100, score: 88, grade: 'A',
    };
    expect(toExam(d)).toEqual({
      id: 'e1', title: 'Algebra Midterm', subjId: 'sub1', date: '2026-07-10',
      time: '09:00', dur: '90 min', status: 'graded', max: 100, score: 88, grade: 'A',
    });
  });

  it('toExam maps live Scheduled papers and class/subject fields', () => {
    const d: ExamPaperDTO = {
      id: 'e2',
      name: 'Unit Test',
      subject_id: 'sub1',
      subject: 'Mathematics',
      class_id: 'class-ivb',
      date: '2026-08-13T00:00:00Z',
      start_time: '09:00',
      duration_min: 45,
      status: 'Scheduled',
      max_marks: 50,
    };
    expect(toExam(d)).toMatchObject({
      id: 'e2',
      title: 'Unit Test',
      subjId: 'sub1',
      subjectName: 'Mathematics',
      classId: 'class-ivb',
      date: '2026-08-13',
      dur: '45 min',
      status: 'upcoming',
      max: 50,
    });
  });

  it('toLeaveRequest maps child_id/from_date/to_date', () => {
    const d: LeaveRequestDTO = { id: 'l1', child_id: 'c1', from_date: '2026-07-01', to_date: '2026-07-02', reason: 'Trip', note: 'n', status: 'pending' };
    expect(toLeaveRequest(d)).toEqual({ id: 'l1', childId: 'c1', from: '2026-07-01', to: '2026-07-02', reason: 'Trip', note: 'n', status: 'pending' });
  });

  it('toChatMessage maps is_mine→from and sent_at→time', () => {
    const d: ChatMessageDTO = { id: 'm1', thread_id: 't1', sender_id: 'u1', text: 'hi', sent_at: '10:00', is_mine: true };
    expect(toChatMessage(d)).toEqual({ id: 'm1', threadId: 't1', from: 'me', text: 'hi', time: '10:00', status: 'sent' });
  });

  it('toChatMessage maps double-blue-tick read receipts on outgoing messages', () => {
    const d: ChatMessageDTO = {
      id: 'm1',
      thread_id: 't1',
      sender_id: 'u1',
      text: 'hi',
      sent_at: '10:00',
      is_mine: true,
      is_delivered: true,
      is_read: true,
      read_at: '2026-08-13T10:01:00Z',
    };
    expect(toChatMessage(d).status).toBe('read');
  });

  it('toChatThread maps live GET /threads fields', () => {
    expect(
      toChatThread({
        id: '3c8a1c9e-1111-2222-3333-444444444444',
        name: 'Amit Yadav',
        role: 'Class teacher',
        last_message: 'Homework is on the board',
        last_at: '09:15',
        unread: 2,
        child_id: null,
        group: false,
      }),
    ).toEqual({
      id: '3c8a1c9e-1111-2222-3333-444444444444',
      name: 'Amit Yadav',
      role: 'Class teacher',
      last: 'Homework is on the board',
      when: '09:15',
      unread: 2,
      kid: null,
      group: false,
    });
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

  it('toChild maps a live StudentResponse (IV-B class_label + attendance_pct)', () => {
    expect(
      toChild({
        id: 'sis-1',
        name: 'Ankit Rana',
        grade: 'IV',
        section: 'B',
        class_label: 'IV-B',
        school: 'SCC',
        admission_no: 'SCC/26/0002',
        attendance_pct: 96,
        overall_avg: 88,
        fee_status: 'due',
      } as any),
    ).toMatchObject({
      id: 'sis-1',
      name: 'Ankit Rana',
      initials: 'AR',
      grade: 'IV-B',
      school: 'SCC',
      studentId: 'SCC/26/0002',
      avg: 88,
      attn: 96,
      fee: 'Due',
    });
  });

  it('toChild maps admission_no, fee_status, and avatar_hue from the live roster', () => {
    expect(
      toChild({
        id: 'sis-2',
        name: 'Maya Patel',
        admission_no: 'WBA-2024-1042',
        grade: '9',
        section: 'A',
        fee_status: 'paid',
        avatar_hue: 1,
      } as any),
    ).toMatchObject({
      studentId: 'WBA-2024-1042',
      grade: '9-A',
      fee: 'Paid',
      hue: 'red',
    });
  });

  it('toChild maps fee_due when fee_status is absent', () => {
    expect(
      toChild({
        id: 'sis-3',
        name: 'Kid',
        fee_due: 2500,
      } as any),
    ).toMatchObject({ id: 'sis-3', fee: 'Due' });
  });
});
