/** Student screens omit the id (own roster). Parent screens pass the selected child id. */
export function enabledWhenOwnOrChild(studentId?: string) {
  return studentId === undefined || Boolean(studentId);
}

export const qk = {
  school: ['school'] as const,
  studentProfile: (id?: string) => ['student', 'profile', id ?? 'me'] as const,
  today: ['student', 'today'] as const,
  timetable: (id?: string) => ['student', 'timetable', id ?? 'me'] as const,
  todayAttendance: ['student', 'today', 'attendance'] as const,
  peers: ['student', 'peers'] as const,
  achievements: (id?: string) => ['student', 'achievements', id ?? 'me'] as const,
  subjects: (id?: string) => ['subjects', id ?? 'me'] as const,
  subject: (id: string) => ['subjects', id] as const,
  homework: (id?: string) => ['homework', id ?? 'me'] as const,
  homeworkItem: (id: string) => ['homework', id] as const,
  grades: (id?: string) => ['grades', id ?? 'me'] as const,
  exams: (id?: string) => ['exams', id ?? 'me'] as const,
  announcements: (audience: string) => ['announcements', audience] as const,
  notifications: ['notifications'] as const,
  settings: ['me', 'settings'] as const,
  threads: (audience: string) => ['threads', audience] as const,
  messages: (threadId: string) => ['messages', threadId] as const,
  directory: ['directory', 'teachers'] as const,
  // parent
  parentProfile: ['parent', 'profile'] as const,
  children: ['parent', 'children'] as const,
  childToday: (id: string) => ['parent', 'today', id] as const,
  fees: (id: string) => ['parent', 'fees', id] as const,
  ptm: ['parent', 'ptm'] as const,
  transport: (id: string) => ['parent', 'transport', id] as const,
  transportList: () => ['parent', 'transport'] as const,
  attendance: (id: string) => ['parent', 'attendance', id] as const,
  leave: (id: string) => ['parent', 'leave', id] as const,
};
