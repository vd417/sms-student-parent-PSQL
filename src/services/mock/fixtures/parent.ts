import type {
  Announcement,
  AttendanceDay,
  AttendanceFlag,
  ChatMessage,
  ChatThread,
  Child,
  ChildToday,
  Fee,
  Parent,
  PTMMeeting,
  Transport,
} from '@/models';

// Ported from .design-pkg/teacher-app/project/data-student-parent.js (parent section).
export const parentProfile: Parent = {
  name: 'Priya Patel',
  initials: 'PP',
  relation: 'Mother',
  email: 'priya.patel@home.com',
  phone: '+1 (415) 555-0142',
};

export const children: Child[] = [
  {
    id: 'k1',
    name: 'Maya Patel',
    initials: 'MP',
    grade: 'Grade 10 — A',
    school: 'Westbrook Academy',
    avg: 87,
    attn: 96,
    fee: 'Paid',
    unread: 0,
    hue: 'pink',
  },
  {
    id: 'k2',
    name: 'Arjun Patel',
    initials: 'AP',
    grade: 'Grade 6 — B',
    school: 'Westbrook Academy',
    avg: 81,
    attn: 92,
    fee: 'Due May 5',
    unread: 2,
    hue: 'teal',
  },
];

export const childToday: Record<string, ChildToday> = {
  k1: {
    classes: [
      { t: '09:00', label: 'Mathematics', done: true, attn: 'present' },
      { t: '10:00', label: 'Physics', done: true, attn: 'present' },
      { t: '11:30', label: 'English Lit', done: false, attn: null },
      { t: '13:30', label: 'World History', done: false, attn: null },
      { t: '14:30', label: 'Computer Sci', done: false, attn: null },
    ],
    meals: { breakfast: 'eaten · 8:15', lunch: 'served · 12:45' },
    pickup: '15:50',
    todayAttn: 'present',
  },
  k2: {
    classes: [
      { t: '09:00', label: 'English', done: true, attn: 'late' },
      { t: '10:00', label: 'Mathematics', done: true, attn: 'present' },
      { t: '11:30', label: 'Geography', done: false, attn: null },
      { t: '13:30', label: 'Art & Craft', done: false, attn: null },
    ],
    meals: { breakfast: 'eaten · 8:20', lunch: 'served · 12:40' },
    pickup: '15:30',
    todayAttn: 'late',
  },
};

export const fees: Fee[] = [
  {
    id: 'f1',
    period: 'Term 4 · 2026',
    dueDate: 'May 5, 2026',
    amount: 1240,
    status: 'due',
    items: [
      { l: 'Tuition · Grade 6', amt: 980 },
      { l: 'Activities & sports', amt: 140 },
      { l: 'Lab fees', amt: 80 },
      { l: 'Late book — TKAM', amt: 40 },
    ],
  },
  {
    id: 'f2',
    period: 'Term 3 · 2026',
    dueDate: 'Feb 5, 2026',
    amount: 1240,
    status: 'paid',
    paidOn: 'Feb 3, 2026',
    method: 'Visa •• 4421',
  },
  {
    id: 'f3',
    period: 'Term 2 · 2025',
    dueDate: 'Nov 5, 2025',
    amount: 1180,
    status: 'paid',
    paidOn: 'Nov 4, 2025',
    method: 'ACH transfer',
  },
  {
    id: 'f4',
    period: 'Term 1 · 2025',
    dueDate: 'Aug 5, 2025',
    amount: 1180,
    status: 'paid',
    paidOn: 'Jul 30, 2025',
    method: 'Visa •• 4421',
  },
];

export const ptm: PTMMeeting[] = [
  {
    id: 'pt1',
    date: 'May 3, 2026',
    time: '15:00',
    teacher: 'Ms. A. Krishnan',
    subj: 'Mathematics',
    child: 'k1',
    mode: 'In-person · Room C-214',
    status: 'confirmed',
  },
  {
    id: 'pt2',
    date: 'May 5, 2026',
    time: '16:30',
    teacher: 'Dr. K. Suzuki',
    subj: 'Physics',
    child: 'k1',
    mode: 'Video call',
    status: 'pending',
  },
  {
    id: 'pt3',
    date: 'May 7, 2026',
    time: '09:30',
    teacher: 'Ms. T. Choi',
    subj: 'Class teacher',
    child: 'k2',
    mode: 'In-person · Room A-105',
    status: 'confirmed',
  },
];

export const transport: Transport = {
  busNo: '12',
  routeName: 'Route 7',
  status: 'on_route',
  lat: 28.4595,
  lng: 77.0266,
  speedKmh: 22.5,
  nextStopName: 'Maple & 4th',
  lastPingAt: new Date().toISOString(),
};

// parentChats pc1..pc5 → ChatThread[]
export const parentThreads: ChatThread[] = [
  {
    id: 'pc1',
    name: 'Ms. Krishnan',
    role: 'Math teacher',
    last: 'Maya did very well on the pop quiz!',
    when: '11:42',
    unread: 0,
    kid: 'k1',
  },
  {
    id: 'pc2',
    name: 'Mr. Bell',
    role: 'English teacher',
    last: 'Reading log due tomorrow.',
    when: '09:08',
    unread: 1,
    kid: 'k1',
  },
  {
    id: 'pc3',
    name: 'Grade 10A · Parents',
    role: 'Group',
    last: 'Mr. Hernandez: thank you all!',
    when: 'Yesterday',
    unread: 0,
    kid: 'k1',
    group: true,
  },
  {
    id: 'pc4',
    name: 'Ms. Choi',
    role: 'Class teacher',
    last: "Could we discuss Arjun's reading?",
    when: 'Mon',
    unread: 1,
    kid: 'k2',
  },
  {
    id: 'pc5',
    name: 'Bus Coordinator',
    role: 'Transport',
    last: 'Bus #12 will be 10 min late today.',
    when: 'Mon',
    unread: 0,
    kid: null,
  },
];

export const parentMessages: ChatMessage[] = [
  {
    id: 'pm1',
    threadId: 'pc1',
    from: 'them',
    text: 'Maya did very well on the pop quiz!',
    time: '11:08',
  },
  {
    id: 'pm2',
    threadId: 'pc1',
    from: 'me',
    text: 'Thank you! Anything to focus on at home?',
    time: '11:14',
    status: 'read',
  },
  {
    id: 'pm3',
    threadId: 'pc1',
    from: 'them',
    text: 'Reading aloud 15 min each evening would be perfect.',
    time: '11:18',
  },
  {
    id: 'pm4',
    threadId: 'pc1',
    from: 'them',
    text: 'Also — please confirm pickup on Friday is at 3:30 PM.',
    time: '11:19',
  },
];

export const parentAnnouncements: Announcement[] = [
  {
    id: 'pa1',
    from: 'Principal Hayes',
    role: 'Principal',
    when: '2h ago',
    title: 'Sports Day moved to May 7',
    body: 'Drop-off shifts to 8 AM. House colours required. Snacks and water provided. Parents welcome to attend after 11 AM.',
  },
  {
    id: 'pa2',
    from: 'Accounts Office',
    role: 'Finance',
    when: 'yesterday',
    title: 'Term 4 fee window now open',
    body: 'Please complete payment by May 5. Online and ACH transfer supported. Late fees apply after May 10.',
  },
  {
    id: 'pa3',
    from: 'Transport',
    role: 'Transport',
    when: '2 days ago',
    title: 'Bus route #12 timing change',
    body: 'Effective Monday, Maple & 4th stop moves from 15:42 to 15:48 to ease traffic congestion.',
  },
  {
    id: 'pa4',
    from: 'Ms. Krishnan',
    role: 'Class teacher',
    when: '3 days ago',
    title: 'Term-end PTM schedule',
    body: 'Booking opens this Friday. 15-minute slots, in-person or video. Please book at least one slot per child.',
  },
];

// Per-child attendance month (Apr 2026) — mirrors the design's generator.
export function attendanceFor(childId: string): { days: AttendanceDay[]; flags: AttendanceFlag[] } {
  const absent = childId === 'k2' ? [8, 17, 24] : [8, 17];
  const late = childId === 'k2' ? [3, 22, 28] : [3, 22];
  const days: AttendanceDay[] = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    const dow = (d + 2) % 7; // Apr 1 = Wed
    const weekend = dow === 0 || dow === 6;
    let kind: AttendanceDay['kind'] = 'present';
    if (weekend) kind = 'off';
    else if (absent.includes(d)) kind = 'absent';
    else if (late.includes(d)) kind = 'late';
    if (d > 25) kind = 'future';
    return { d, kind };
  });
  const flags: AttendanceFlag[] = [
    {
      id: 'af1',
      tone: 'absent',
      date: 'Apr 17',
      reason: 'Marked absent · no excuse on file',
      action: 'Submit excuse',
    },
    {
      id: 'af2',
      tone: 'late',
      date: 'Apr 22',
      reason: 'Late by 14 min · Math class',
      action: 'View',
    },
    {
      id: 'af3',
      tone: 'absent',
      date: 'Apr 08',
      reason: 'Marked absent · sick (excused)',
      action: 'View',
    },
  ];
  return { days, flags };
}
