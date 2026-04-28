// School Desk — Student app sample data.
// Ported from the design package's `data-student-parent.js` (student section).

import type { SubjectHue } from '@/theme';

export type HomeworkStatus = 'todo' | 'progress' | 'submitted' | 'graded';

export interface Subject {
  id: string;
  name: string;
  short: string;
  teacher: string;
  avg: number;
  trend: number;
  color: SubjectHue;
}

export interface TodayBlock {
  t: string;
  d: number;
  label: string;
  subjId?: string;
  kind: 'class' | 'break' | 'meeting' | 'club';
  room?: string;
  teacher?: string;
}

export interface Homework {
  id: string;
  title: string;
  subjId: string;
  due: string;
  dueT: string;
  status: HomeworkStatus;
  priority: 'low' | 'med' | 'high';
  grade?: string;
}

export interface Exam {
  id: string;
  title: string;
  subjId: string;
  date: string;
  time: string;
  dur: string;
  status: 'upcoming' | 'graded';
  max: number;
  score?: number;
  grade?: string;
}

export interface Grade {
  id: string;
  subjId: string;
  title: string;
  score: number;
  max: number;
  grade: string;
  date: string;
}

export interface Announcement {
  id: string;
  from: string;
  role: string;
  when: string;
  title: string;
  body: string;
}

export interface Teacher {
  id: string;
  name: string;
  initials: string;
  subj: string;
  online: boolean;
}

export interface Peer {
  id: string;
  name: string;
  initials: string;
  subj: string;
}

export interface Achievement {
  id: string;
  title: string;
  when: string;
  icon: 'award' | 'star' | 'check' | 'flag';
  hue: SubjectHue;
}

export const student = {
  name: 'Maya Patel',
  initials: 'MP',
  grade: 'Grade 10 — A',
  roll: 14,
  school: 'Westbrook Academy',
  studentId: 'WBA-2024-1042',
  email: 'maya.patel@westbrook.edu',
  classroom: 'Block C · Room 214',
  house: 'Indus House',
  overallAvg: 87,
  attnPct: 96,
  rank: 4,
  rankOf: 28,
};

export const subjects: Subject[] = [
  { id: 's1', name: 'Mathematics', short: 'Math', teacher: 'Ms. Aanya Krishnan', avg: 88, trend: +3, color: 'pink' },
  { id: 's2', name: 'English Lit', short: 'Eng', teacher: 'Mr. R. Bell', avg: 84, trend: +1, color: 'coral' },
  { id: 's3', name: 'Physics', short: 'Phys', teacher: 'Dr. K. Suzuki', avg: 91, trend: +4, color: 'teal' },
  { id: 's4', name: 'World History', short: 'Hist', teacher: 'Ms. L. Reyes', avg: 79, trend: -2, color: 'blue' },
  { id: 's5', name: 'Hindi', short: 'Hin', teacher: 'Ms. P. Mishra', avg: 86, trend: +2, color: 'amber' },
  { id: 's6', name: 'Computer Sci', short: 'CS', teacher: 'Mr. T. Park', avg: 94, trend: +6, color: 'mint' },
];

export const today: TodayBlock[] = [
  { t: '08:00', d: 30, label: 'Morning Assembly', kind: 'meeting', room: 'Auditorium' },
  { t: '09:00', d: 50, label: 'Mathematics', subjId: 's1', kind: 'class', room: 'C-214', teacher: 'Ms. Krishnan' },
  { t: '10:00', d: 50, label: 'Physics', subjId: 's3', kind: 'class', room: 'B-102', teacher: 'Dr. Suzuki' },
  { t: '11:00', d: 20, label: 'Short break', kind: 'break' },
  { t: '11:30', d: 50, label: 'English Lit', subjId: 's2', kind: 'class', room: 'A-203', teacher: 'Mr. Bell' },
  { t: '12:30', d: 60, label: 'Lunch', kind: 'break' },
  { t: '13:30', d: 50, label: 'World History', subjId: 's4', kind: 'class', room: 'A-118', teacher: 'Ms. Reyes' },
  { t: '14:30', d: 50, label: 'Computer Sci', subjId: 's6', kind: 'class', room: 'D-301', teacher: 'Mr. Park' },
  { t: '15:30', d: 60, label: 'Math Club', kind: 'club', room: 'C-214' },
];

export const homework: Homework[] = [
  { id: 'h1', title: 'Problem Set 14 — Quadratics', subjId: 's1', due: 'Today', dueT: '11:59 PM', status: 'todo', priority: 'high' },
  { id: 'h2', title: 'Read Ch. 9: To Kill a Mockingbird', subjId: 's2', due: 'Tomorrow', dueT: '09:00 AM', status: 'todo', priority: 'med' },
  { id: 'h3', title: 'Lab Report — Pendulum', subjId: 's3', due: 'Apr 30', dueT: '11:59 PM', status: 'progress', priority: 'high' },
  { id: 'h4', title: 'Essay — French Revolution causes', subjId: 's4', due: 'May 02', dueT: '11:59 PM', status: 'todo', priority: 'med' },
  { id: 'h5', title: 'Functions Pop Quiz revisions', subjId: 's1', due: 'Apr 22', dueT: '—', status: 'submitted', priority: 'low' },
  { id: 'h6', title: 'Python — Sorting algorithms', subjId: 's6', due: 'Apr 21', dueT: '—', status: 'graded', grade: 'A', priority: 'low' },
];

export const exams: Exam[] = [
  { id: 'se1', title: 'Quadratics — Unit Test', subjId: 's1', date: 'Apr 28', time: '10:00', dur: '60 min', status: 'upcoming', max: 50 },
  { id: 'se2', title: 'Physics — Mechanics', subjId: 's3', date: 'May 03', time: '09:00', dur: '90 min', status: 'upcoming', max: 80 },
  { id: 'se3', title: 'English — Paper 1', subjId: 's2', date: 'May 10', time: '09:00', dur: '120 min', status: 'upcoming', max: 100 },
  { id: 'se4', title: 'Functions Pop Quiz', subjId: 's1', date: 'Apr 12', time: '09:30', dur: '20 min', status: 'graded', max: 20, score: 17, grade: 'A' },
  { id: 'se5', title: 'History — Mid-Term', subjId: 's4', date: 'Apr 18', time: '10:00', dur: '90 min', status: 'graded', max: 80, score: 62, grade: 'B+' },
  { id: 'se6', title: 'CS — Logic & Algorithms', subjId: 's6', date: 'Apr 14', time: '11:00', dur: '45 min', status: 'graded', max: 40, score: 38, grade: 'A+' },
];

export const grades: Grade[] = [
  { id: 'g1', subjId: 's1', title: 'Functions Pop Quiz', score: 17, max: 20, grade: 'A', date: 'Apr 12' },
  { id: 'g2', subjId: 's4', title: 'History Mid-Term', score: 62, max: 80, grade: 'B+', date: 'Apr 18' },
  { id: 'g3', subjId: 's6', title: 'CS Logic & Algorithms', score: 38, max: 40, grade: 'A+', date: 'Apr 14' },
  { id: 'g4', subjId: 's3', title: 'Physics Lab Practical', score: 36, max: 40, grade: 'A', date: 'Apr 09' },
  { id: 'g5', subjId: 's2', title: 'Poetry Analysis Essay', score: 27, max: 30, grade: 'A-', date: 'Apr 04' },
];

export const announcements: Announcement[] = [
  { id: 'sa1', from: 'Principal Hayes', role: 'Principal', when: '2h ago', title: 'Inter-house Sports Day moved to May 7', body: 'All students should report to the field by 8:30 AM in their house colours. Snacks and water will be provided.' },
  { id: 'sa2', from: 'Ms. Krishnan', role: 'Class teacher', when: 'Yesterday', title: 'Math club extra session — Friday 4 PM', body: "We will work through the prep set for next week's test. Bring your notebook and a sharpened pencil." },
  { id: 'sa3', from: 'Library', role: 'Library', when: '2 days ago', title: 'New books added to the senior section', body: 'The 2026 reading list is now available — physical copies on shelf F-3, ebooks via the school portal.' },
];

export const peers: Peer[] = [
  { id: 'p1', name: 'Liam Chen', initials: 'LC', subj: 'Captain · House' },
  { id: 'p2', name: 'Aria Okafor', initials: 'AO', subj: 'Lab partner' },
  { id: 'p3', name: 'Noah Lindgren', initials: 'NL', subj: 'Math club' },
  { id: 'p4', name: 'Zara Bukhari', initials: 'ZB', subj: 'Best friend' },
  { id: 'p5', name: 'Ethan Mendes', initials: 'EM', subj: 'Debate team' },
];

export const teachers: Teacher[] = [
  { id: 't1', name: 'Ms. A. Krishnan', initials: 'AK', subj: 'Mathematics', online: true },
  { id: 't2', name: 'Mr. R. Bell', initials: 'RB', subj: 'English Lit', online: false },
  { id: 't3', name: 'Dr. K. Suzuki', initials: 'KS', subj: 'Physics', online: true },
  { id: 't4', name: 'Ms. L. Reyes', initials: 'LR', subj: 'World History', online: false },
  { id: 't5', name: 'Mr. T. Park', initials: 'TP', subj: 'Computer Sci', online: true },
];

export const achievements: Achievement[] = [
  { id: 'ac1', title: 'Math Olympiad — Silver', when: 'Mar 2026', icon: 'award', hue: 'amber' },
  { id: 'ac2', title: 'House Captain · Indus', when: 'Sep 2025', icon: 'star', hue: 'pink' },
  { id: 'ac3', title: 'Perfect attendance · Q3', when: 'Mar 2026', icon: 'check', hue: 'teal' },
  { id: 'ac4', title: 'Science Fair — 1st place', when: 'Feb 2026', icon: 'flag', hue: 'blue' },
];

export function subjectById(id: string): Subject {
  return subjects.find((s) => s.id === id) ?? subjects[0];
}

const HUES: SubjectHue[] = ['coral', 'blue', 'teal', 'pink', 'amber', 'mint'];

export function hueForName(name: string): SubjectHue {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return HUES[h % HUES.length];
}
