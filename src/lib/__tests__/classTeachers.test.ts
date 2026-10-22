import { sameClass, samePerson, teacherCardLine, teachersForClass } from '../classTeachers';
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
  expect(samePerson('Amit Sharma', 'Anita Sharma')).toBe(false);
});

test('keeps the class teacher and timetable teachers, and drops the rest of the school', () => {
  const rows = teachersForClass(
    teachers,
    { classroom: 'IV-B', grade: 'IV', section: 'B' },
    [{ name: 'Mr. Bell' }],
  );
  expect(rows.map((row) => row.id)).toEqual(['ct', 'en']);
});

test('shows role and designation together', () => {
  expect(teacherCardLine(teachers[1])).toBe('Class teacher · Senior Teacher · IV-B · Mathematics');
});
