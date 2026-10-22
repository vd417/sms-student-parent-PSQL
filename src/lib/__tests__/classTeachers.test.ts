import { messageRoleLine, sameClass, samePerson, teacherCardLine, teacherRoleLine, teachersForClass } from '../classTeachers';
import type { Teacher } from '@/models';

const teachers: Teacher[] = [
  { id: 'p', name: 'Dr. N. Alvarez', initials: 'NA', subj: 'Admin', online: false, role: 'principal', designation: 'Principal' },
  {
    id: 'ct',
    name: 'Ms. A. Krishnan',
    initials: 'AK',
    subj: 'Mathematics',
    online: true,
    role: 'class_teacher',
    designation: 'Senior Teacher',
    classTeacher: 'IV-B',
  },
  { id: 'en', name: 'Mr. R. Bell', initials: 'RB', subj: 'English', online: false, role: 'subject_teacher', designation: 'TGT' },
  { id: 'ot', name: 'Ms. Other', initials: 'MO', subj: 'Art', online: false, role: 'subject_teacher', classTeacher: 'V-A' },
];

test('treats class labels with different punctuation as the same class', () => {
  expect(sameClass('IV-B', 'Class IV Section B')).toBe(true);
  expect(sameClass('Grade 10 — A', '10-A')).toBe(true);
  expect(sameClass('IV-B', 'IV-A')).toBe(false);
  expect(sameClass('IV', 'IV-B')).toBe(false);
});

test('matches a timetable name to the directory teacher', () => {
  expect(samePerson('Ms. Krishnan', 'Ms. A. Krishnan')).toBe(true);
  expect(samePerson('Mr. Bell', 'Mr. R. Bell')).toBe(true);
  expect(samePerson('Ravi', 'Mr. Ravi Kumar')).toBe(true);
  expect(samePerson('Amit Sharma', 'Anita Sharma')).toBe(false);
  expect(samePerson('Arts', 'Anita Sharma')).toBe(false);
});

test('keeps the class teacher and timetable teachers, and drops the rest of the school', () => {
  const rows = teachersForClass(
    teachers,
    { classroom: 'IV-B', grade: 'IV', section: 'B' },
    [
      { name: 'Mr. Bell', subject: 'English' },
      { name: 'Neha Singh', subject: 'Science' },
    ],
  );
  expect(rows.map((row) => row.id)).toEqual(['ct', 'en', 'name:neha singh']);
  expect(rows.find((row) => row.id === 'en')?.subj).toBe('English');
  expect(rows.find((row) => row.id === 'name:neha singh')?.subj).toBe('Science');
});

test('shows Neha as Principal when that is her role, even if she teaches the class', () => {
  const rows = teachersForClass(
    [
      {
        id: 'neha',
        name: 'Neha Singh',
        initials: 'NS',
        subj: 'Science',
        online: false,
        role: 'principal',
        designation: 'Principal',
      },
    ],
    { classroom: 'IV-B', grade: 'IV', section: 'B' },
    [{ name: 'Neha Singh', subject: 'Science' }],
  );
  expect(rows.map((row) => row.id)).toEqual(['neha']);
  expect(teacherRoleLine(rows[0])).toBe('Principal');
});

test('leaves principal, admin, vice principal, and school owner off the class list', () => {
  const rows = teachersForClass(
    [
      ...teachers,
      { id: 'vp', name: 'Ms. Vice', initials: 'MV', subj: '', online: false, role: 'subject_teacher', designation: 'Vice Principal' },
      { id: 'ad', name: 'Mr. Admin', initials: 'MA', subj: '', online: false, role: 'subject_teacher', designation: 'Admin' },
      { id: 'ow', name: 'Ms. Owner', initials: 'MO', subj: '', online: false, role: 'subject_teacher', designation: 'School Owner' },
    ],
    { classroom: 'IV-B', grade: 'IV', section: 'B' },
    [],
  );
  expect(rows.map((row) => row.id)).toEqual(['ct']);
});

test('shows a leadership role on a message even when the directory says Teacher', () => {
  const teacher = { role: 'subject_teacher' as const, designation: 'Teacher' };
  expect(messageRoleLine('Owner', teacher)).toBe('School Owner');
  expect(messageRoleLine('Principal', teacher)).toBe('Principal');
  expect(messageRoleLine('School Admin', teacher)).toBe('Admin');
  expect(messageRoleLine('Vice Principal', teacher)).toBe('Vice Principal');
  expect(messageRoleLine('Teacher', { role: 'principal', designation: 'Principal' })).toBe('Principal');
});

test('shows only Teacher, Principal, Admin, Vice Principal, or School Owner', () => {
  const thisClass = { classroom: 'IV-B', grade: 'IV', section: 'B' };
  expect(teacherRoleLine(teachers[0], thisClass)).toBe('Principal');
  expect(teacherRoleLine(teachers[1], thisClass)).toBe('Teacher');
  expect(teacherRoleLine({ ...teachers[2], designation: 'Teacher' }, thisClass)).toBe('Teacher');
  expect(teacherRoleLine({ role: 'principal', designation: 'Vice Principal' })).toBe('Vice Principal');
  expect(teacherRoleLine({ role: 'principal', designation: 'Admin' })).toBe('Admin');
  expect(teacherRoleLine({ role: 'subject_teacher', designation: 'School Owner' })).toBe('School Owner');
  expect(teacherCardLine({ role: 'subject_teacher', designation: 'Teacher' }, thisClass)).toBe('Teacher');
});
