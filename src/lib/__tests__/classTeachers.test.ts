import { sameClass, samePerson, teacherCardLine, teacherRoleLine, teachersForClass } from '../classTeachers';
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
  expect(rows.map((row) => row.id)).toEqual(['p', 'ct', 'en', 'name:neha singh']);
  expect(rows.find((row) => row.id === 'en')?.subj).toBe('English');
  expect(rows.find((row) => row.id === 'name:neha singh')?.subj).toBe('Science');
});

test('keeps the principal, admin, and vice principal even when they do not teach this class', () => {
  const rows = teachersForClass(
    [
      ...teachers,
      { id: 'vp', name: 'Ms. Vice', initials: 'MV', subj: '', online: false, role: 'subject_teacher', designation: 'Vice Principal' },
      { id: 'ad', name: 'Mr. Admin', initials: 'MA', subj: '', online: false, role: 'subject_teacher', designation: 'Admin' },
    ],
    { classroom: 'IV-B', grade: 'IV', section: 'B' },
    [],
  );
  expect(rows.map((row) => row.id)).toEqual(['p', 'ad', 'vp', 'ct']);
  expect(rows.map((row) => teacherRoleLine(row))).toEqual(['Principal', 'Admin', 'Vice Principal', 'Teacher']);
});

test('shows only Teacher, Principal, Admin, or Vice Principal', () => {
  const thisClass = { classroom: 'IV-B', grade: 'IV', section: 'B' };
  expect(teacherRoleLine(teachers[0], thisClass)).toBe('Principal');
  expect(teacherRoleLine(teachers[1], thisClass)).toBe('Teacher');
  expect(teacherRoleLine({ ...teachers[2], designation: 'Teacher' }, thisClass)).toBe('Teacher');
  expect(teacherRoleLine({ role: 'principal', designation: 'Vice Principal' })).toBe('Vice Principal');
  expect(teacherRoleLine({ role: 'principal', designation: 'Admin' })).toBe('Admin');
  expect(teacherCardLine({ role: 'subject_teacher', designation: 'Teacher' }, thisClass)).toBe('Teacher');
});
