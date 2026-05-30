import type {
  Achievement, Announcement, ChatMessage, ChatThread, Exam, Grade,
  Homework, Peer, Student, Subject, Teacher, TodayBlock,
} from '@/models';

export const studentProfile: Student = {
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
  { id: 'math', name: 'Mathematics', short: 'Math', teacher: 'Mr. Alan Grant', avg: 92, trend: 1, color: 'violet' },
  { id: 'sci', name: 'Science', short: 'Sci', teacher: 'Ms. Ellie Sattler', avg: 88, trend: 1, color: 'sky' },
  { id: 'eng', name: 'English', short: 'Eng', teacher: 'Mr. Ian Malcolm', avg: 81, trend: -1, color: 'amber' },
  { id: 'hist', name: 'History', short: 'Hist', teacher: 'Ms. Sara Harding', avg: 85, trend: 1, color: 'rose' },
  { id: 'cs', name: 'Computer Science', short: 'CS', teacher: 'Mr. Dennis Nedry', avg: 90, trend: 1, color: 'emerald' },
  { id: 'art', name: 'Art & Design', short: 'Art', teacher: 'Ms. Claire Dearing', avg: 78, trend: -1, color: 'cyan' },
];

export const today: TodayBlock[] = [
  { t: '08:00', d: 45, label: 'Assembly', kind: 'meeting', room: 'Auditorium' },
  { t: '08:50', d: 50, label: 'Mathematics', subjId: 'math', kind: 'class', room: 'Room 214', teacher: 'Mr. Alan Grant' },
  { t: '09:45', d: 50, label: 'Science', subjId: 'sci', kind: 'class', room: 'Lab 2', teacher: 'Ms. Ellie Sattler' },
  { t: '10:40', d: 20, label: 'Short Break', kind: 'break' },
  { t: '11:00', d: 50, label: 'English', subjId: 'eng', kind: 'class', room: 'Room 110', teacher: 'Mr. Ian Malcolm' },
  { t: '11:55', d: 50, label: 'History', subjId: 'hist', kind: 'class', room: 'Room 305', teacher: 'Ms. Sara Harding' },
  { t: '12:50', d: 40, label: 'Lunch', kind: 'break' },
  { t: '13:30', d: 50, label: 'Computer Science', subjId: 'cs', kind: 'class', room: 'Lab 1', teacher: 'Mr. Dennis Nedry' },
  { t: '14:25', d: 50, label: 'Art & Design', subjId: 'art', kind: 'class', room: 'Studio', teacher: 'Ms. Claire Dearing' },
  { t: '15:20', d: 45, label: 'Robotics Club', kind: 'club', room: 'Lab 1' },
];

export const homework: Homework[] = [
  { id: 'hw1', title: 'Quadratic Equations — Set B', subjId: 'math', due: 'Today', dueT: '18:00', status: 'todo', priority: 'high' },
  { id: 'hw2', title: 'Lab Report: Photosynthesis', subjId: 'sci', due: 'Tomorrow', dueT: '09:00', status: 'progress', priority: 'med' },
  { id: 'hw3', title: 'Essay: The Tempest Act II', subjId: 'eng', due: 'Wed', dueT: '23:59', status: 'todo', priority: 'med' },
  { id: 'hw4', title: 'WWII Timeline Project', subjId: 'hist', due: 'Fri', dueT: '15:00', status: 'todo', priority: 'low' },
  { id: 'hw5', title: 'Python: List Comprehensions', subjId: 'cs', due: 'Thu', dueT: '12:00', status: 'submitted', priority: 'med', grade: 'A' },
  { id: 'hw6', title: 'Still Life Sketch', subjId: 'art', due: 'Mon', dueT: '10:00', status: 'graded', priority: 'low', grade: 'A-' },
  { id: 'hw7', title: 'Reading: Chapters 4–5', subjId: 'eng', due: 'Next Mon', dueT: '08:00', status: 'todo', priority: 'low' },
];

export const grades: Grade[] = [
  { id: 'g1', subjId: 'math', title: 'Algebra Quiz 3', score: 18, max: 20, grade: 'A', date: 'Oct 5' },
  { id: 'g2', subjId: 'sci', title: 'Chemistry Lab Report', score: 27, max: 30, grade: 'A-', date: 'Oct 3' },
  { id: 'g3', subjId: 'eng', title: 'Poetry Analysis', score: 16, max: 20, grade: 'B+', date: 'Oct 1' },
  { id: 'g4', subjId: 'cs', title: 'Algorithm Design', score: 19, max: 20, grade: 'A', date: 'Sep 28' },
  { id: 'g5', subjId: 'hist', title: 'Essay: Cold War Causes', score: 22, max: 30, grade: 'B', date: 'Sep 25' },
];

export const exams: Exam[] = [
  { id: 'ex1', title: 'Mid-Term: Mathematics', subjId: 'math', date: 'Oct 18', time: '09:00', dur: '2h', status: 'upcoming', max: 100 },
  { id: 'ex2', title: 'Mid-Term: Science', subjId: 'sci', date: 'Oct 20', time: '09:00', dur: '2h', status: 'upcoming', max: 100 },
  { id: 'ex3', title: 'Unit Test: English', subjId: 'eng', date: 'Oct 12', time: '11:00', dur: '1h', status: 'graded', max: 50, score: 42, grade: 'A' },
  { id: 'ex4', title: 'Unit Test: History', subjId: 'hist', date: 'Oct 10', time: '11:00', dur: '1h', status: 'graded', max: 50, score: 39, grade: 'B+' },
];

export const announcements: Announcement[] = [
  { id: 'a1', from: 'Principal Hammond', role: 'Principal', when: '2h ago', title: 'Diwali Break Schedule', body: 'School will remain closed from Oct 30 to Nov 3 for Diwali celebrations.' },
  { id: 'a2', from: 'Mr. Alan Grant', role: 'Math Teacher', when: '5h ago', title: 'Extra Math Class', body: 'Optional doubt-clearing session this Saturday at 10 AM in Room 214.' },
  { id: 'a3', from: 'Sports Dept', role: 'Coach Muldoon', when: '1d ago', title: 'Annual Sports Day', body: 'Register for track and field events by Friday. See the notice board.' },
  { id: 'a4', from: 'Library', role: 'Ms. Dearing', when: '2d ago', title: 'New Arrivals', body: 'New science fiction and reference books are now available.' },
];

export const teachers: Teacher[] = [
  { id: 't1', name: 'Mr. Alan Grant', initials: 'AG', subj: 'Mathematics', online: true },
  { id: 't2', name: 'Ms. Ellie Sattler', initials: 'ES', subj: 'Science', online: true },
  { id: 't3', name: 'Mr. Ian Malcolm', initials: 'IM', subj: 'English', online: false },
  { id: 't4', name: 'Ms. Sara Harding', initials: 'SH', subj: 'History', online: false },
  { id: 't5', name: 'Mr. Dennis Nedry', initials: 'DN', subj: 'Computer Science', online: true },
  { id: 't6', name: 'Ms. Claire Dearing', initials: 'CD', subj: 'Art & Design', online: false },
];

export const peers: Peer[] = [
  { id: 'p1', name: 'Arjun Sharma', initials: 'AS', subj: 'Study Group' },
  { id: 'p2', name: 'Zara Khan', initials: 'ZK', subj: 'Lab Partner' },
  { id: 'p3', name: 'Rohan Mehta', initials: 'RM', subj: 'Robotics' },
  { id: 'p4', name: 'Sara Lee', initials: 'SL', subj: 'Debate' },
  { id: 'p5', name: 'Vikram Singh', initials: 'VS', subj: 'Chess' },
];

export const achievements: Achievement[] = [
  { id: 'ac1', title: 'Top Scorer — Mathematics', when: 'This week', icon: 'award', hue: 'violet' },
  { id: 'ac2', title: 'Perfect Attendance — September', when: '2 weeks ago', icon: 'star', hue: 'amber' },
  { id: 'ac3', title: 'Science Fair — 1st Place', when: 'Last month', icon: 'flag', hue: 'sky' },
  { id: 'ac4', title: '50 Books Read', when: 'Term goal', icon: 'check', hue: 'emerald' },
];

// Student inbox = one thread per teacher.
export const studentThreads: ChatThread[] = teachers.map((t) => ({
  id: `st-${t.id}`,
  name: t.name,
  role: t.subj,
  last: 'Tap to open conversation',
  when: '09:00',
  unread: t.online ? 1 : 0,
}));

export const studentMessages: ChatMessage[] = [
  { id: 'sm1', threadId: studentThreads[0].id, from: 'them', text: 'Great work on the pop quiz!', time: '09:00' },
  { id: 'sm2', threadId: studentThreads[0].id, from: 'me', text: 'Thank you! When is the next test?', time: '09:04' },
  { id: 'sm3', threadId: studentThreads[0].id, from: 'them', text: 'Next Friday — revision set is in the library.', time: '09:06' },
];
