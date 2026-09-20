# Student + Parent Modules on a Swappable Mock-Data Layer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship both the Student and Parent experiences end-to-end in this Expo app, backed by interactive mock data behind typed service interfaces so a real API swaps in later without touching screens or hooks.

**Architecture:** Screens consume TanStack Query hooks → hooks call a service registry → the registry returns a mock implementation today (in-memory mutable store with simulated latency) or an HTTP implementation later, selected by a single config flag. Auth is a mock provider gating role-based navigation (Student vs Parent). Writes are React Query mutations that mutate the in-memory store and invalidate queries.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9, React Navigation 7, `@tanstack/react-query` v5, `jest-expo` for unit tests, existing `components/ui` design system + `theme`.

**Spec:** `docs/superpowers/specs/2026-05-30-student-parent-modules-data-layer-design.md`

---

## Conventions

- **Path alias:** `@/` → `src/` (already configured in `tsconfig.json` / babel).
- **Imports:** named exports, match existing style.
- **Tests:** only for pure logic (services, registry, providers' reducers, latency). Screens are verified by running the app (`npm run web`), not unit-tested.
- **Commits:** one per task (or per logical step where noted). Conventional commit messages.
- **TDD applies to logic tasks.** Screen tasks are recreation-from-design and use a build-then-verify loop instead of red/green unit tests.
- **Design sources to mirror for screens:**
  - Student: `.design-pkg/teacher-app/project/student-screens.jsx` + the existing `src/screens/*` (already faithful).
  - Parent: `.design-pkg/teacher-app/project/parent-screens.jsx`.
  - Data shapes: `.design-pkg/teacher-app/project/data-student-parent.js`.

---

## File Structure (created/modified across the plan)

```
src/
├─ api/
│  ├─ config.ts                 DATA_SOURCE flag + base URL (from app.json extra)
│  └─ client.ts                 fetch wrapper (base URL, auth header, error normalize)
├─ models/
│  └─ index.ts                  shared domain types (moved out of data/sample.ts)
├─ services/
│  ├─ types.ts                  service interfaces
│  ├─ index.ts                  registry: mock|http selection
│  ├─ errors.ts                 NotImplementedError, ApiError
│  ├─ mock/
│  │  ├─ latency.ts             delay + optional error injection
│  │  ├─ db.ts                  in-memory mutable store
│  │  ├─ fixtures/student.ts    seed (from data/sample.ts)
│  │  ├─ fixtures/parent.ts     seed (from data-student-parent.js parent section)
│  │  └─ *.mock.ts              one per service interface
│  └─ http/
│     └─ *.http.ts              stubs throwing NotImplementedError
├─ hooks/                        one file per domain (queries + mutations)
├─ providers/
│  ├─ QueryProvider.tsx
│  ├─ AuthProvider.tsx
│  └─ ChildProvider.tsx
├─ features/
│  ├─ student/screens/          12 existing screens relocated
│  └─ parent/screens/           12 new screens
├─ navigation/
│  ├─ RootNavigator.tsx         auth gate
│  ├─ StudentNavigator.tsx      (was RootNavigator + TabNavigator)
│  ├─ ParentNavigator.tsx
│  └─ types.ts
├─ components/ui/                + Loading, ErrorState, Empty
└─ theme/                        unchanged
```

---

# MILESTONE 1 — Foundation + Home reference slice

Produces working software: login (mock) → student tabs → Home screen rendering from the data layer with loading/error states and an interactive homework status mutation.

---

### Task 1: Install dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install React Query and test tooling**

Run:
```bash
npm install @tanstack/react-query
npm install -D jest jest-expo @types/jest
```
Expected: packages added, no peer-dependency errors that break install.

- [ ] **Step 2: Add the test script**

Modify `package.json` `scripts` to add:
```json
"test": "jest"
```

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-query and jest tooling"
```

---

### Task 2: Configure Jest

**Files:**
- Create: `jest.config.js`
- Create: `jest.setup.js`

- [ ] **Step 1: Create `jest.config.js`**

```js
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testMatch: ['**/*.test.ts', '**/*.test.tsx'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@react-navigation/.*|@tanstack/.*))',
  ],
};
```

- [ ] **Step 2: Create `jest.setup.js`**

```js
// Reserved for global test setup. Intentionally minimal for pure-logic tests.
```

- [ ] **Step 3: Add a smoke test**

Create `src/__smoke__.test.ts`:
```ts
test('jest runs', () => {
  expect(1 + 1).toBe(2);
});
```

- [ ] **Step 4: Run it**

Run: `npm test -- src/__smoke__.test.ts`
Expected: PASS.

- [ ] **Step 5: Delete the smoke test and commit**

```bash
rm src/__smoke__.test.ts
git add jest.config.js jest.setup.js package.json
git commit -m "chore: configure jest-expo"
```

---

### Task 3: Domain model types

**Files:**
- Create: `src/models/index.ts`
- Modify: `src/data/sample.ts` (re-export from models to avoid breaking current imports during migration)

- [ ] **Step 1: Create `src/models/index.ts`**

Move every interface/type from `src/data/sample.ts` here, and add the Parent-side models. Full content:

```ts
import type { SubjectHue } from '@/theme';

// ---------- shared ----------
export type Role = 'student' | 'parent';

// ---------- student ----------
export type HomeworkStatus = 'todo' | 'progress' | 'submitted' | 'graded';

export interface Student {
  name: string;
  initials: string;
  grade: string;
  roll: number;
  school: string;
  studentId: string;
  email: string;
  classroom: string;
  house: string;
  overallAvg: number;
  attnPct: number;
  rank: number;
  rankOf: number;
}

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

// ---------- messaging (shared shape; student + parent inboxes) ----------
export interface ChatThread {
  id: string;
  name: string;
  role: string;
  last: string;
  when: string;
  unread: number;
  kid?: string | null;
  group?: boolean;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  from: 'me' | 'them';
  text: string;
  time: string;
}

// ---------- parent ----------
export interface Parent {
  name: string;
  initials: string;
  relation: string;
  email: string;
  phone: string;
}

export interface Child {
  id: string;
  name: string;
  initials: string;
  grade: string;
  school: string;
  avg: number;
  attn: number;
  fee: string;
  unread: number;
  hue: SubjectHue;
}

export interface ChildClass {
  t: string;
  label: string;
  done: boolean;
  attn: 'present' | 'late' | null;
}

export interface ChildToday {
  classes: ChildClass[];
  meals: { breakfast: string; lunch: string };
  pickup: string;
}

export interface FeeItem {
  l: string;
  amt: number;
}

export interface Fee {
  id: string;
  period: string;
  dueDate: string;
  amount: number;
  status: 'due' | 'paid';
  items?: FeeItem[];
  paidOn?: string;
  method?: string;
}

export interface PTMMeeting {
  id: string;
  date: string;
  time: string;
  teacher: string;
  subj: string;
  child: string;
  mode: string;
  status: 'confirmed' | 'pending';
}

export interface TransportStop {
  stop: string;
  eta: string;
  done: boolean;
  you?: boolean;
}

export interface Transport {
  busNo: string;
  driver: string;
  plate: string;
  eta: string;
  pickupStop: string;
  nextStops: TransportStop[];
}

export interface CalendarEvent {
  day: string;
  items: { t: string; label: string; kind: 'pickup' | 'exam' | 'meeting' | 'event' }[];
}

export type AttendanceKind = 'present' | 'absent' | 'late' | 'off' | 'future';

export interface AttendanceDay {
  d: number;
  kind: AttendanceKind;
}

export interface AttendanceFlag {
  id: string;
  tone: 'absent' | 'late';
  date: string;
  reason: string;
  action: string;
}

export interface LeaveRequest {
  id: string;
  childId: string;
  from: string;
  to: string;
  reason: string;
  note: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ---------- auth ----------
export interface Session {
  token: string;
  role: Role;
  email: string;
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: no new errors from `src/models/index.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/models/index.ts
git commit -m "feat: add shared domain models for student and parent"
```

---

### Task 4: API config + errors

**Files:**
- Create: `src/api/config.ts`
- Create: `src/services/errors.ts`
- Modify: `app.json` (add `extra`)

- [ ] **Step 1: Add `extra` to `app.json`**

Inside the `"expo"` object add:
```json
"extra": {
  "dataSource": "mock",
  "apiBaseUrl": "https://api.example.com"
}
```

- [ ] **Step 2: Create `src/api/config.ts`**

```ts
import Constants from 'expo-constants';

export type DataSource = 'mock' | 'http';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  dataSource?: DataSource;
  apiBaseUrl?: string;
};

// Global default. Per-domain overrides live in services/index.ts.
export const DATA_SOURCE: DataSource = extra.dataSource ?? 'mock';
export const API_BASE_URL: string = extra.apiBaseUrl ?? '';

// Mock tuning.
export const MOCK_LATENCY_MS = 350;
export const MOCK_ERROR_RATE = 0; // 0..1, set >0 to exercise error UI
```

- [ ] **Step 3: Create `src/services/errors.ts`**

```ts
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`Not implemented: ${what}. Provide an HTTP implementation.`);
    this.name = 'NotImplementedError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
```

- [ ] **Step 4: Verify `expo-constants` is available**

Run: `node -e "require.resolve('expo-constants')"`
Expected: prints a path (it ships with Expo SDK 54). If it errors, run `npx expo install expo-constants`.

- [ ] **Step 5: Commit**

```bash
git add src/api/config.ts src/services/errors.ts app.json
git commit -m "feat: add data-source config and service errors"
```

---

### Task 5: Latency helper (TDD)

**Files:**
- Create: `src/services/mock/latency.ts`
- Test: `src/services/mock/latency.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { withLatency } from './latency';

describe('withLatency', () => {
  test('resolves to the provided value', async () => {
    await expect(withLatency('x', { ms: 0, errorRate: 0 })).resolves.toBe('x');
  });

  test('rejects when errorRate is 1', async () => {
    await expect(withLatency('x', { ms: 0, errorRate: 1 })).rejects.toThrow();
  });

  test('supports lazy value factories', async () => {
    await expect(withLatency(() => 42, { ms: 0, errorRate: 0 })).resolves.toBe(42);
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- src/services/mock/latency.test.ts`
Expected: FAIL — `withLatency` not found.

- [ ] **Step 3: Implement**

```ts
import { ApiError } from '@/services/errors';
import { MOCK_ERROR_RATE, MOCK_LATENCY_MS } from '@/api/config';

interface Options {
  ms?: number;
  errorRate?: number;
}

export function withLatency<T>(
  value: T | (() => T),
  opts: Options = {},
): Promise<T> {
  const ms = opts.ms ?? MOCK_LATENCY_MS;
  const errorRate = opts.errorRate ?? MOCK_ERROR_RATE;
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (errorRate > 0 && Math.random() < errorRate) {
        reject(new ApiError('Mock network error', 500));
        return;
      }
      const resolved = typeof value === 'function' ? (value as () => T)() : value;
      resolve(resolved);
    }, ms);
  });
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- src/services/mock/latency.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/mock/latency.ts src/services/mock/latency.test.ts
git commit -m "feat: add mock latency helper"
```

---

### Task 6: Student fixtures + mock db

**Files:**
- Create: `src/services/mock/fixtures/student.ts`
- Create: `src/services/mock/db.ts`

- [ ] **Step 1: Create `src/services/mock/fixtures/student.ts`**

Port the data from `src/data/sample.ts` (the exported `student`, `subjects`, `today`, `homework`, `exams`, `grades`, `announcements`, `peers`, `teachers`, `achievements`) typed against `@/models`. Also add student chat threads + messages derived from `teachers`. Shape:

```ts
import type {
  Achievement, Announcement, ChatMessage, ChatThread, Exam, Grade,
  Homework, Peer, Student, Subject, Teacher, TodayBlock,
} from '@/models';

export const studentProfile: Student = {
  name: 'Maya Patel', initials: 'MP', grade: 'Grade 10 — A', roll: 14,
  school: 'Westbrook Academy', studentId: 'WBA-2024-1042',
  email: 'maya.patel@westbrook.edu', classroom: 'Block C · Room 214',
  house: 'Indus House', overallAvg: 87, attnPct: 96, rank: 4, rankOf: 28,
};

export const subjects: Subject[] = [ /* copy all 6 from src/data/sample.ts */ ];
export const today: TodayBlock[] = [ /* copy from src/data/sample.ts */ ];
export const homework: Homework[] = [ /* copy from src/data/sample.ts */ ];
export const exams: Exam[] = [ /* copy from src/data/sample.ts */ ];
export const grades: Grade[] = [ /* copy from src/data/sample.ts */ ];
export const announcements: Announcement[] = [ /* copy from src/data/sample.ts */ ];
export const peers: Peer[] = [ /* copy from src/data/sample.ts */ ];
export const teachers: Teacher[] = [ /* copy from src/data/sample.ts */ ];
export const achievements: Achievement[] = [ /* copy from src/data/sample.ts */ ];

// Student inbox = one thread per teacher.
export const studentThreads: ChatThread[] = teachers.map((t) => ({
  id: `st-${t.id}`, name: t.name, role: t.subj,
  last: 'Tap to open conversation', when: '09:00', unread: t.online ? 1 : 0,
}));

export const studentMessages: ChatMessage[] = [
  { id: 'sm1', threadId: studentThreads[0].id, from: 'them', text: 'Great work on the pop quiz!', time: '09:00' },
  { id: 'sm2', threadId: studentThreads[0].id, from: 'me', text: 'Thank you! When is the next test?', time: '09:04' },
  { id: 'sm3', threadId: studentThreads[0].id, from: 'them', text: 'Next Friday — revision set is in the library.', time: '09:06' },
];
```

> Copy the literal array contents verbatim from `src/data/sample.ts` lines 110–184. Drop the design-only `hue`/`glyph`/`pattern` fields not present in the model types.

- [ ] **Step 2: Create `src/services/mock/db.ts`**

A single mutable store, deep-cloned from fixtures so mutations don't corrupt the source arrays across reloads:

```ts
import type {
  Achievement, Announcement, ChatMessage, ChatThread, Child, ChildToday,
  Exam, Fee, Grade, Homework, LeaveRequest, Parent, Peer, PTMMeeting,
  Student, Subject, Teacher, TodayBlock, Transport,
} from '@/models';
import * as student from './fixtures/student';

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

export interface MockDb {
  // student
  student: Student;
  subjects: Subject[];
  today: TodayBlock[];
  homework: Homework[];
  exams: Exam[];
  grades: Grade[];
  announcements: Announcement[];
  peers: Peer[];
  teachers: Teacher[];
  achievements: Achievement[];
  studentThreads: ChatThread[];
  studentMessages: ChatMessage[];
  // parent (populated in Milestone 3)
  parent?: Parent;
  children?: Child[];
  childToday?: Record<string, ChildToday>;
  fees?: Fee[];
  ptm?: PTMMeeting[];
  parentThreads?: ChatThread[];
  parentMessages?: ChatMessage[];
  transport?: Transport;
  leave?: LeaveRequest[];
}

export const db: MockDb = {
  student: clone(student.studentProfile),
  subjects: clone(student.subjects),
  today: clone(student.today),
  homework: clone(student.homework),
  exams: clone(student.exams),
  grades: clone(student.grades),
  announcements: clone(student.announcements),
  peers: clone(student.peers),
  teachers: clone(student.teachers),
  achievements: clone(student.achievements),
  studentThreads: clone(student.studentThreads),
  studentMessages: clone(student.studentMessages),
};
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/mock/fixtures/student.ts src/services/mock/db.ts
git commit -m "feat: add student fixtures and in-memory mock db"
```

---

### Task 7: Service interfaces

**Files:**
- Create: `src/services/types.ts`

- [ ] **Step 1: Create `src/services/types.ts`**

```ts
import type {
  Achievement, Announcement, AttendanceDay, AttendanceFlag, ChatMessage,
  ChatThread, Child, ChildToday, Exam, Fee, Grade, Homework, HomeworkStatus,
  LeaveRequest, Parent, Peer, PTMMeeting, Role, Session, Student, Subject,
  Teacher, TodayBlock, Transport,
} from '@/models';

export interface AuthService {
  signIn(email: string, password: string, role: Role): Promise<Session>;
  signOut(): Promise<void>;
}

export interface StudentService {
  getProfile(): Promise<Student>;
  getToday(): Promise<TodayBlock[]>;
  getPeers(): Promise<Peer[]>;
  getAchievements(): Promise<Achievement[]>;
}

export interface SubjectsService {
  list(): Promise<Subject[]>;
  byId(id: string): Promise<Subject | undefined>;
}

export interface HomeworkService {
  list(): Promise<Homework[]>;
  byId(id: string): Promise<Homework | undefined>;
  setStatus(id: string, status: HomeworkStatus): Promise<Homework>;
  submit(id: string): Promise<Homework>;
}

export interface GradesService {
  listGrades(): Promise<Grade[]>;
  listExams(): Promise<Exam[]>;
}

export interface AnnouncementsService {
  list(audience: Role): Promise<Announcement[]>;
}

export interface MessagingService {
  threads(audience: Role): Promise<ChatThread[]>;
  messages(threadId: string): Promise<ChatMessage[]>;
  send(threadId: string, text: string): Promise<ChatMessage>;
}

export interface DirectoryService {
  teachers(): Promise<Teacher[]>;
}

export interface ParentService {
  getProfile(): Promise<Parent>;
  children(): Promise<Child[]>;
  childToday(childId: string): Promise<ChildToday>;
}

export interface FeesService {
  list(childId: string): Promise<Fee[]>;
  pay(feeId: string): Promise<Fee>;
}

export interface PTMService {
  list(): Promise<PTMMeeting[]>;
  setStatus(id: string, status: PTMMeeting['status']): Promise<PTMMeeting>;
}

export interface TransportService {
  forChild(childId: string): Promise<Transport>;
}

export interface AttendanceService {
  month(childId: string): Promise<{ days: AttendanceDay[]; flags: AttendanceFlag[] }>;
}

export interface LeaveService {
  list(childId: string): Promise<LeaveRequest[]>;
  submit(req: Omit<LeaveRequest, 'id' | 'status'>): Promise<LeaveRequest>;
}

export interface Services {
  auth: AuthService;
  student: StudentService;
  subjects: SubjectsService;
  homework: HomeworkService;
  grades: GradesService;
  announcements: AnnouncementsService;
  messaging: MessagingService;
  directory: DirectoryService;
  parent: ParentService;
  fees: FeesService;
  ptm: PTMService;
  transport: TransportService;
  attendance: AttendanceService;
  leave: LeaveService;
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/types.ts
git commit -m "feat: define service interfaces"
```

---

### Task 8: Student mock services (TDD for homework mutation)

**Files:**
- Create: `src/services/mock/student.mock.ts` (StudentService, SubjectsService, GradesService, AnnouncementsService, DirectoryService, MessagingService)
- Create: `src/services/mock/homework.mock.ts`
- Create: `src/services/mock/auth.mock.ts`
- Test: `src/services/mock/homework.mock.test.ts`

- [ ] **Step 1: Write the failing test for homework mutation**

```ts
import { db } from './db';
import { homeworkMock } from './homework.mock';

const fast = { ms: 0, errorRate: 0 };

describe('homeworkMock', () => {
  test('submit() flips status to submitted and persists in db', async () => {
    const target = db.homework[0];
    const updated = await homeworkMock(fast).submit(target.id);
    expect(updated.status).toBe('submitted');
    expect(db.homework.find((h) => h.id === target.id)?.status).toBe('submitted');
  });

  test('setStatus() updates the stored item', async () => {
    const target = db.homework[1];
    await homeworkMock(fast).setStatus(target.id, 'progress');
    expect(db.homework.find((h) => h.id === target.id)?.status).toBe('progress');
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- src/services/mock/homework.mock.test.ts`
Expected: FAIL — `homework.mock` not found.

- [ ] **Step 3: Implement `src/services/mock/homework.mock.ts`**

```ts
import type { HomeworkService } from '@/services/types';
import type { HomeworkStatus } from '@/models';
import { db } from './db';
import { withLatency } from './latency';

interface Opts { ms?: number; errorRate?: number }

export function homeworkMock(opts: Opts = {}): HomeworkService {
  return {
    list: () => withLatency(() => db.homework, opts),
    byId: (id) => withLatency(() => db.homework.find((h) => h.id === id), opts),
    setStatus: (id, status: HomeworkStatus) =>
      withLatency(() => {
        const hw = db.homework.find((h) => h.id === id);
        if (!hw) throw new Error(`Homework ${id} not found`);
        hw.status = status;
        return hw;
      }, opts),
    submit: (id) =>
      withLatency(() => {
        const hw = db.homework.find((h) => h.id === id);
        if (!hw) throw new Error(`Homework ${id} not found`);
        hw.status = 'submitted';
        return hw;
      }, opts),
  };
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- src/services/mock/homework.mock.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/services/mock/student.mock.ts`**

```ts
import type {
  AnnouncementsService, DirectoryService, GradesService, MessagingService,
  StudentService, SubjectsService,
} from '@/services/types';
import { db } from './db';
import { withLatency } from './latency';

interface Opts { ms?: number; errorRate?: number }

export function studentMock(opts: Opts = {}): StudentService {
  return {
    getProfile: () => withLatency(() => db.student, opts),
    getToday: () => withLatency(() => db.today, opts),
    getPeers: () => withLatency(() => db.peers, opts),
    getAchievements: () => withLatency(() => db.achievements, opts),
  };
}

export function subjectsMock(opts: Opts = {}): SubjectsService {
  return {
    list: () => withLatency(() => db.subjects, opts),
    byId: (id) => withLatency(() => db.subjects.find((s) => s.id === id), opts),
  };
}

export function gradesMock(opts: Opts = {}): GradesService {
  return {
    listGrades: () => withLatency(() => db.grades, opts),
    listExams: () => withLatency(() => db.exams, opts),
  };
}

export function announcementsMock(opts: Opts = {}): AnnouncementsService {
  return {
    list: (audience) =>
      withLatency(
        () => (audience === 'parent' ? db.parentAnnouncements ?? db.announcements : db.announcements),
        opts,
      ),
  };
}

export function directoryMock(opts: Opts = {}): DirectoryService {
  return { teachers: () => withLatency(() => db.teachers, opts) };
}

export function messagingMock(opts: Opts = {}): MessagingService {
  let counter = 0;
  return {
    threads: (audience) =>
      withLatency(
        () => (audience === 'parent' ? db.parentThreads ?? [] : db.studentThreads),
        opts,
      ),
    messages: (threadId) =>
      withLatency(() => {
        const all = [...db.studentMessages, ...(db.parentMessages ?? [])];
        return all.filter((m) => m.threadId === threadId);
      }, opts),
    send: (threadId, text) =>
      withLatency(() => {
        counter += 1;
        const msg = {
          id: `m-new-${counter}`,
          threadId,
          from: 'me' as const,
          text,
          time: 'now',
        };
        const isParent = (db.parentThreads ?? []).some((t) => t.id === threadId);
        if (isParent) (db.parentMessages ??= []).push(msg);
        else db.studentMessages.push(msg);
        return msg;
      }, opts),
  };
}
```

> Note: `db.parentAnnouncements` / `db.parentThreads` / `db.parentMessages` are populated in Milestone 3; the `?? db.announcements` / `?? []` fallbacks keep this compiling and working for Student now. Add `parentAnnouncements?: Announcement[]` to the `MockDb` interface in `db.ts` in this step.

- [ ] **Step 6: Implement `src/services/mock/auth.mock.ts`**

```ts
import type { AuthService } from '@/services/types';
import type { Role } from '@/models';
import { withLatency } from './latency';

interface Opts { ms?: number; errorRate?: number }

export function authMock(opts: Opts = {}): AuthService {
  return {
    signIn: (email, _password, role: Role) =>
      withLatency(
        () => ({ token: `mock-token-${role}-${Date.now()}`, role, email }),
        opts,
      ),
    signOut: () => withLatency(undefined, opts),
  };
}
```

- [ ] **Step 7: Verify compile + tests**

Run: `npx tsc --noEmit && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/services/mock/
git commit -m "feat: add student mock services"
```

---

### Task 9: HTTP stubs + API client

**Files:**
- Create: `src/api/client.ts`
- Create: `src/services/http/index.ts`

- [ ] **Step 1: Create `src/api/client.ts`**

```ts
import { API_BASE_URL } from './config';
import { ApiError } from '@/services/errors';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) throw new ApiError(`Request failed: ${path}`, res.status);
  return (await res.json()) as T;
}
```

- [ ] **Step 2: Create `src/services/http/index.ts`**

A single module exporting HTTP impls of every service interface, each throwing `NotImplementedError` until wired. Pattern (repeat for every method of every interface in `services/types.ts`):

```ts
import type { Services } from '@/services/types';
import { NotImplementedError } from '@/services/errors';

const ni = (what: string) => {
  throw new NotImplementedError(what);
};

export const httpServices: Services = {
  auth: {
    signIn: () => ni('auth.signIn'),
    signOut: () => ni('auth.signOut'),
  },
  student: {
    getProfile: () => ni('student.getProfile'),
    getToday: () => ni('student.getToday'),
    getPeers: () => ni('student.getPeers'),
    getAchievements: () => ni('student.getAchievements'),
  },
  subjects: { list: () => ni('subjects.list'), byId: () => ni('subjects.byId') },
  homework: {
    list: () => ni('homework.list'),
    byId: () => ni('homework.byId'),
    setStatus: () => ni('homework.setStatus'),
    submit: () => ni('homework.submit'),
  },
  grades: { listGrades: () => ni('grades.listGrades'), listExams: () => ni('grades.listExams') },
  announcements: { list: () => ni('announcements.list') },
  messaging: {
    threads: () => ni('messaging.threads'),
    messages: () => ni('messaging.messages'),
    send: () => ni('messaging.send'),
  },
  directory: { teachers: () => ni('directory.teachers') },
  parent: {
    getProfile: () => ni('parent.getProfile'),
    children: () => ni('parent.children'),
    childToday: () => ni('parent.childToday'),
  },
  fees: { list: () => ni('fees.list'), pay: () => ni('fees.pay') },
  ptm: { list: () => ni('ptm.list'), setStatus: () => ni('ptm.setStatus') },
  transport: { forChild: () => ni('transport.forChild') },
  attendance: { month: () => ni('attendance.month') },
  leave: { list: () => ni('leave.list'), submit: () => ni('leave.submit') },
};
```

> The `() => ni(...)` arrows are typed as returning `never`, which is assignable to the `Promise<T>` return types. This compiles.

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/api/client.ts src/services/http/index.ts
git commit -m "feat: add api client and http service stubs"
```

---

### Task 10: Service registry (TDD)

**Files:**
- Create: `src/services/index.ts`
- Test: `src/services/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { buildServices } from './index';

describe('buildServices', () => {
  test('mock source wires real mock implementations', async () => {
    const s = buildServices('mock');
    const list = await s.homework.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
  });

  test('http source wires stubs that throw NotImplemented', () => {
    const s = buildServices('http');
    expect(() => s.homework.list()).toThrow(/Not implemented/);
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- src/services/index.test.ts`
Expected: FAIL — `buildServices` not found.

- [ ] **Step 3: Implement `src/services/index.ts`**

```ts
import type { DataSource } from '@/api/config';
import { DATA_SOURCE } from '@/api/config';
import type { Services } from './types';
import { httpServices } from './http';
import {
  announcementsMock, directoryMock, gradesMock, messagingMock,
  studentMock, subjectsMock,
} from './mock/student.mock';
import { homeworkMock } from './mock/homework.mock';
import { authMock } from './mock/auth.mock';
import { parentMock, feesMock, ptmMock, transportMock, attendanceMock, leaveMock } from './mock/parent.mock';

function mockServices(): Services {
  return {
    auth: authMock(),
    student: studentMock(),
    subjects: subjectsMock(),
    homework: homeworkMock(),
    grades: gradesMock(),
    announcements: announcementsMock(),
    messaging: messagingMock(),
    directory: directoryMock(),
    parent: parentMock(),
    fees: feesMock(),
    ptm: ptmMock(),
    transport: transportMock(),
    attendance: attendanceMock(),
    leave: leaveMock(),
  };
}

export function buildServices(source: DataSource = DATA_SOURCE): Services {
  return source === 'http' ? httpServices : mockServices();
}

export const services: Services = buildServices();
```

> **Milestone-1 stand-in:** `parent.mock` does not exist until Milestone 3. For Milestone 1, create a temporary `src/services/mock/parent.mock.ts` that exports `parentMock/feesMock/ptmMock/transportMock/attendanceMock/leaveMock` factories whose methods `throw new NotImplementedError('parent.* (milestone 3)')`. Milestone 3 Task replaces the bodies. This keeps the registry whole and typed now.

- [ ] **Step 4: Create the temporary `src/services/mock/parent.mock.ts` stub**

```ts
import type {
  AttendanceService, FeesService, LeaveService, ParentService,
  PTMService, TransportService,
} from '@/services/types';
import { NotImplementedError } from '@/services/errors';

const ni = (what: string): never => {
  throw new NotImplementedError(what);
};

export const parentMock = (): ParentService => ({
  getProfile: () => ni('parent.getProfile'),
  children: () => ni('parent.children'),
  childToday: () => ni('parent.childToday'),
});
export const feesMock = (): FeesService => ({ list: () => ni('fees.list'), pay: () => ni('fees.pay') });
export const ptmMock = (): PTMService => ({ list: () => ni('ptm.list'), setStatus: () => ni('ptm.setStatus') });
export const transportMock = (): TransportService => ({ forChild: () => ni('transport.forChild') });
export const attendanceMock = (): AttendanceService => ({ month: () => ni('attendance.month') });
export const leaveMock = (): LeaveService => ({ list: () => ni('leave.list'), submit: () => ni('leave.submit') });
```

- [ ] **Step 5: Run it (passes)**

Run: `npm test -- src/services/index.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/index.ts src/services/mock/parent.mock.ts src/services/index.test.ts
git commit -m "feat: add service registry with mock/http selection"
```

---

### Task 11: QueryProvider

**Files:**
- Create: `src/providers/QueryProvider.tsx`

- [ ] **Step 1: Create `src/providers/QueryProvider.tsx`**

```tsx
import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export function QueryProvider({ children }: { children: ReactNode }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/providers/QueryProvider.tsx
git commit -m "feat: add react-query provider"
```

---

### Task 12: AuthProvider (TDD for the reducer)

**Files:**
- Create: `src/providers/authReducer.ts`
- Create: `src/providers/AuthProvider.tsx`
- Test: `src/providers/authReducer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { authReducer, initialAuthState } from './authReducer';

describe('authReducer', () => {
  test('signed-in sets session and role', () => {
    const next = authReducer(initialAuthState, {
      type: 'SIGNED_IN',
      session: { token: 't', role: 'parent', email: 'a@b.com' },
    });
    expect(next.session?.role).toBe('parent');
    expect(next.status).toBe('authenticated');
  });

  test('signed-out clears session', () => {
    const signedIn = authReducer(initialAuthState, {
      type: 'SIGNED_IN',
      session: { token: 't', role: 'student', email: 'a@b.com' },
    });
    const out = authReducer(signedIn, { type: 'SIGNED_OUT' });
    expect(out.session).toBeNull();
    expect(out.status).toBe('unauthenticated');
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- src/providers/authReducer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/providers/authReducer.ts`**

```ts
import type { Session } from '@/models';

export interface AuthState {
  status: 'unauthenticated' | 'authenticated';
  session: Session | null;
}

export const initialAuthState: AuthState = { status: 'unauthenticated', session: null };

export type AuthAction =
  | { type: 'SIGNED_IN'; session: Session }
  | { type: 'SIGNED_OUT' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGNED_IN':
      return { status: 'authenticated', session: action.session };
    case 'SIGNED_OUT':
      return { status: 'unauthenticated', session: null };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- src/providers/authReducer.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Implement `src/providers/AuthProvider.tsx`**

```tsx
import { createContext, ReactNode, useContext, useMemo, useReducer } from 'react';
import type { Role, Session } from '@/models';
import { services } from '@/services';
import { setAuthToken } from '@/api/client';
import { authReducer, initialAuthState } from './authReducer';

interface AuthContextValue {
  session: Session | null;
  role: Role | null;
  status: 'unauthenticated' | 'authenticated';
  signIn: (email: string, password: string, role: Role) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      role: state.session?.role ?? null,
      status: state.status,
      signIn: async (email, password, role) => {
        const session = await services.auth.signIn(email, password, role);
        setAuthToken(session.token);
        dispatch({ type: 'SIGNED_IN', session });
      },
      signOut: async () => {
        await services.auth.signOut();
        setAuthToken(null);
        dispatch({ type: 'SIGNED_OUT' });
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/providers/authReducer.ts src/providers/authReducer.test.ts src/providers/AuthProvider.tsx
git commit -m "feat: add auth provider with mock sign-in"
```

---

### Task 13: ChildProvider

**Files:**
- Create: `src/providers/ChildProvider.tsx`

- [ ] **Step 1: Create `src/providers/ChildProvider.tsx`**

```tsx
import { createContext, ReactNode, useContext, useMemo, useState } from 'react';

interface ChildContextValue {
  childId: string;
  setChildId: (id: string) => void;
}

const ChildContext = createContext<ChildContextValue | null>(null);

export function ChildProvider({ children }: { children: ReactNode }) {
  const [childId, setChildId] = useState('k1');
  const value = useMemo(() => ({ childId, setChildId }), [childId]);
  return <ChildContext.Provider value={value}>{children}</ChildContext.Provider>;
}

export function useSelectedChild(): ChildContextValue {
  const ctx = useContext(ChildContext);
  if (!ctx) throw new Error('useSelectedChild must be used within ChildProvider');
  return ctx;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/providers/ChildProvider.tsx
git commit -m "feat: add selected-child provider for parent module"
```

---

### Task 14: Shared state components

**Files:**
- Create: `src/components/ui/Loading.tsx`
- Create: `src/components/ui/ErrorState.tsx`
- Create: `src/components/ui/Empty.tsx`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create `src/components/ui/Loading.tsx`**

```tsx
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '@/theme';

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.primary} />
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
});
```

- [ ] **Step 2: Create `src/components/ui/ErrorState.tsx`**

```tsx
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.msg}>{message ?? 'Something went wrong.'}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.btn}>
          <Text style={styles.btnText}>Retry</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  msg: { fontFamily: fontFamily.semiBold, color: colors.inkMuted, fontSize: 14, textAlign: 'center' },
  btn: { backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 100 },
  btnText: { fontFamily: fontFamily.bold, color: colors.white, fontSize: 13 },
});
```

- [ ] **Step 3: Create `src/components/ui/Empty.tsx`**

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily } from '@/theme';

export function Empty({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.msg}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  msg: { fontFamily: fontFamily.semiBold, color: colors.inkMuted, fontSize: 13, textAlign: 'center' },
});
```

- [ ] **Step 4: Re-export from `src/components/ui/index.ts`**

Add to the existing barrel:
```ts
export { Loading } from './Loading';
export { ErrorState } from './ErrorState';
export { Empty } from './Empty';
```

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Loading.tsx src/components/ui/ErrorState.tsx src/components/ui/Empty.tsx src/components/ui/index.ts
git commit -m "feat: add shared loading/error/empty state components"
```

---

### Task 15: Student hooks

**Files:**
- Create: `src/hooks/keys.ts`
- Create: `src/hooks/useStudent.ts`
- Create: `src/hooks/useSubjects.ts`
- Create: `src/hooks/useHomework.ts`
- Create: `src/hooks/useGrades.ts`
- Create: `src/hooks/useAnnouncements.ts`
- Create: `src/hooks/useMessaging.ts`

- [ ] **Step 1: Create `src/hooks/keys.ts`**

```ts
export const qk = {
  studentProfile: ['student', 'profile'] as const,
  today: ['student', 'today'] as const,
  peers: ['student', 'peers'] as const,
  achievements: ['student', 'achievements'] as const,
  subjects: ['subjects'] as const,
  subject: (id: string) => ['subjects', id] as const,
  homework: ['homework'] as const,
  homeworkItem: (id: string) => ['homework', id] as const,
  grades: ['grades'] as const,
  exams: ['exams'] as const,
  announcements: (audience: string) => ['announcements', audience] as const,
  threads: (audience: string) => ['threads', audience] as const,
  messages: (threadId: string) => ['messages', threadId] as const,
  // parent
  parentProfile: ['parent', 'profile'] as const,
  children: ['parent', 'children'] as const,
  childToday: (id: string) => ['parent', 'today', id] as const,
  fees: (id: string) => ['parent', 'fees', id] as const,
  ptm: ['parent', 'ptm'] as const,
  transport: (id: string) => ['parent', 'transport', id] as const,
  attendance: (id: string) => ['parent', 'attendance', id] as const,
  leave: (id: string) => ['parent', 'leave', id] as const,
};
```

- [ ] **Step 2: Create the student hooks**

`src/hooks/useStudent.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useStudentProfile = () =>
  useQuery({ queryKey: qk.studentProfile, queryFn: () => services.student.getProfile() });
export const useToday = () =>
  useQuery({ queryKey: qk.today, queryFn: () => services.student.getToday() });
export const usePeers = () =>
  useQuery({ queryKey: qk.peers, queryFn: () => services.student.getPeers() });
export const useAchievements = () =>
  useQuery({ queryKey: qk.achievements, queryFn: () => services.student.getAchievements() });
```

`src/hooks/useSubjects.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useSubjects = () =>
  useQuery({ queryKey: qk.subjects, queryFn: () => services.subjects.list() });
export const useSubject = (id: string) =>
  useQuery({ queryKey: qk.subject(id), queryFn: () => services.subjects.byId(id) });
```

`src/hooks/useHomework.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { HomeworkStatus } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useHomework = () =>
  useQuery({ queryKey: qk.homework, queryFn: () => services.homework.list() });

export const useHomeworkItem = (id: string) =>
  useQuery({ queryKey: qk.homeworkItem(id), queryFn: () => services.homework.byId(id) });

export function useSubmitHomework() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => services.homework.submit(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.homework });
    },
  });
}

export function useSetHomeworkStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: HomeworkStatus }) =>
      services.homework.setStatus(vars.id, vars.status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.homework });
    },
  });
}
```

`src/hooks/useGrades.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useGrades = () =>
  useQuery({ queryKey: qk.grades, queryFn: () => services.grades.listGrades() });
export const useExams = () =>
  useQuery({ queryKey: qk.exams, queryFn: () => services.grades.listExams() });
```

`src/hooks/useAnnouncements.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import type { Role } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useAnnouncements = (audience: Role) =>
  useQuery({ queryKey: qk.announcements(audience), queryFn: () => services.announcements.list(audience) });
```

`src/hooks/useMessaging.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Role } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useThreads = (audience: Role) =>
  useQuery({ queryKey: qk.threads(audience), queryFn: () => services.messaging.threads(audience) });

export const useMessages = (threadId: string) =>
  useQuery({ queryKey: qk.messages(threadId), queryFn: () => services.messaging.messages(threadId) });

export function useSendMessage(threadId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (text: string) => services.messaging.send(threadId, text),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.messages(threadId) });
    },
  });
}
```

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/
git commit -m "feat: add student data hooks"
```

---

### Task 16: Navigation — auth gate + StudentNavigator

**Files:**
- Modify: `src/navigation/types.ts`
- Create: `src/navigation/StudentNavigator.tsx` (from current `RootNavigator.tsx` stack contents)
- Rewrite: `src/navigation/RootNavigator.tsx` (becomes the auth gate)
- Modify: `App.tsx` (wrap providers)
- Note: keep `src/navigation/TabNavigator.tsx` (student tabs) as-is for now; it is consumed by `StudentNavigator`.

- [ ] **Step 1: Extend `src/navigation/types.ts`**

```ts
export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  Schedule: undefined;
  HomeworkDetail: { id: string };
  SubjectDetail: { id: string };
  Grades: undefined;
  ChatThread: { id: string };
  Announcements: undefined;
};

export type TabParamList = {
  Home: undefined;
  Homework: undefined;
  Subjects: undefined;
  Inbox: undefined;
  Profile: undefined;
};

// Parent (used in Milestone 3)
export type ParentStackParamList = {
  Main: undefined;
  Attendance: undefined;
  PTM: undefined;
  Transport: undefined;
  Leave: undefined;
  Announcements: undefined;
  ChatThread: { id: string };
};

export type ParentTabParamList = {
  Home: undefined;
  Progress: undefined;
  Fees: undefined;
  Inbox: undefined;
  Profile: undefined;
};
```

- [ ] **Step 2: Create `src/navigation/StudentNavigator.tsx`**

Move the stack from the current `RootNavigator.tsx` here, minus the `NavigationContainer` and minus `Login` (Login moves up to the gate). Imports for screens stay pointing at `@/screens/*` until Milestone 2 relocates them.

```tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ScheduleScreen } from '@/screens/ScheduleScreen';
import { HomeworkDetailScreen } from '@/screens/HomeworkDetailScreen';
import { SubjectDetailScreen } from '@/screens/SubjectDetailScreen';
import { GradesScreen } from '@/screens/GradesScreen';
import { ChatThreadScreen } from '@/screens/ChatThreadScreen';
import { AnnouncementsScreen } from '@/screens/AnnouncementsScreen';
import { TabNavigator } from './TabNavigator';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function StudentNavigator() {
  return (
    <Stack.Navigator
      initialRouteName="Main"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Main" component={TabNavigator} />
      <Stack.Screen name="Schedule" component={ScheduleScreen} />
      <Stack.Screen name="HomeworkDetail" component={HomeworkDetailScreen} />
      <Stack.Screen name="SubjectDetail" component={SubjectDetailScreen} />
      <Stack.Screen name="Grades" component={GradesScreen} />
      <Stack.Screen name="ChatThread" component={ChatThreadScreen} />
      <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
    </Stack.Navigator>
  );
}
```

- [ ] **Step 3: Rewrite `src/navigation/RootNavigator.tsx` as the auth gate**

```tsx
import { NavigationContainer } from '@react-navigation/native';
import { useAuth } from '@/providers/AuthProvider';
import { LoginScreen } from '@/screens/LoginScreen';
import { StudentNavigator } from './StudentNavigator';
// ParentNavigator imported in Milestone 3.

export function RootNavigator() {
  const { status, role } = useAuth();
  return (
    <NavigationContainer>
      {status === 'unauthenticated' ? (
        <LoginScreen />
      ) : role === 'parent' ? (
        <StudentNavigator /> /* TODO Milestone 3: replace with <ParentNavigator /> */
      ) : (
        <StudentNavigator />
      )}
    </NavigationContainer>
  );
}
```

> The `LoginScreen` must call `useAuth().signIn(...)` instead of `navigation.navigate('Main')`. Update it in the next step.

- [ ] **Step 4: Update `src/screens/LoginScreen.tsx` to use mock auth + role toggle**

Read the current file, then: add a Student/Parent toggle (two `Pill`/`Pressable` chips bound to local state `role`), and change the submit handler to `await signIn(email, password, role)` from `useAuth()`. On success the gate swaps navigators automatically (no manual navigation). Keep the existing zod form validation.

- [ ] **Step 5: Wrap providers in `App.tsx`**

Modify the `inner` tree so the order is: `QueryProvider` → `AuthProvider` → `ChildProvider` → `RootNavigator`. Concretely, change `<RootNavigator />` to:
```tsx
<QueryProvider>
  <AuthProvider>
    <ChildProvider>
      <RootNavigator />
    </ChildProvider>
  </AuthProvider>
</QueryProvider>
```
with imports from `@/providers/QueryProvider`, `@/providers/AuthProvider`, `@/providers/ChildProvider`.

- [ ] **Step 6: Verify compile + run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run web` and confirm: login screen shows role toggle → signing in lands on student tabs.

- [ ] **Step 7: Commit**

```bash
git add src/navigation/ src/screens/LoginScreen.tsx App.tsx
git commit -m "feat: add auth-gated role-based navigation"
```

---

### Task 17: Migrate Home screen to the data layer (reference pattern)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`

- [ ] **Step 1: Replace static imports with hooks**

Remove `import { announcements, homework as allHomework, student, subjectById, subjects, today } from '@/data/sample';`. Add:
```ts
import { useStudentProfile, useToday } from '@/hooks/useStudent';
import { useHomework } from '@/hooks/useHomework';
import { useSubjects } from '@/hooks/useSubjects';
import { useAnnouncements } from '@/hooks/useAnnouncements';
import { Loading, ErrorState } from '@/components/ui';
```

- [ ] **Step 2: Wire query state at the top of the component**

```tsx
const profileQ = useStudentProfile();
const todayQ = useToday();
const homeworkQ = useHomework();
const subjectsQ = useSubjects();
const annQ = useAnnouncements('student');

const isLoading = profileQ.isLoading || todayQ.isLoading || homeworkQ.isLoading || subjectsQ.isLoading || annQ.isLoading;
const isError = profileQ.isError || todayQ.isError || homeworkQ.isError || subjectsQ.isError || annQ.isError;

if (isLoading) return <SafeAreaView style={styles.safe} edges={['top']}><Loading /></SafeAreaView>;
if (isError) return <SafeAreaView style={styles.safe} edges={['top']}><ErrorState onRetry={() => { profileQ.refetch(); todayQ.refetch(); homeworkQ.refetch(); subjectsQ.refetch(); annQ.refetch(); }} /></SafeAreaView>;

const student = profileQ.data!;
const today = todayQ.data!;
const allHomework = homeworkQ.data!;
const subjects = subjectsQ.data!;
const announcements = annQ.data!;
const subjectById = (id: string) => subjects.find((s) => s.id === id) ?? subjects[0];
```

- [ ] **Step 3: Leave the rest of the render unchanged**

The existing JSX already references `student`, `today`, `allHomework`, `subjects`, `announcements`, and `subjectById(...)` — now sourced from queries. No further edits needed.

- [ ] **Step 4: Add pull-to-refresh**

Add to the `ScrollView`:
```tsx
import { RefreshControl } from 'react-native';
// ...
refreshControl={
  <RefreshControl
    refreshing={profileQ.isRefetching}
    onRefresh={() => { profileQ.refetch(); todayQ.refetch(); homeworkQ.refetch(); subjectsQ.refetch(); annQ.refetch(); }}
  />
}
```

- [ ] **Step 5: Verify compile + run**

Run: `npx tsc --noEmit`
Expected: no errors.
Run: `npm run web` → sign in → Home renders after a brief spinner; pull-to-refresh works.

- [ ] **Step 6: Commit**

```bash
git add src/screens/HomeScreen.tsx
git commit -m "feat: migrate Home screen to data-layer hooks"
```

**Milestone 1 complete:** working login → student tabs → Home from the data layer with loading/error/refresh. This is the reference pattern for every screen.

---

# MILESTONE 2 — Migrate remaining Student screens

Each task follows the **Task 17 pattern**: swap `@/data/sample` imports for hooks, add `Loading`/`ErrorState` guards, convert write actions to mutations, add pull-to-refresh on scroll screens, then relocate the file into `features/student/screens/` and fix its import path in the navigator. Verify each by running `npm run web`. One commit per screen.

> Relocation note: when moving a screen to `features/student/screens/`, update the import in `TabNavigator.tsx` or `StudentNavigator.tsx`. Do the move + import-fix + compile-check in the same commit as the migration.

- [ ] **Task 18: HomeworkListScreen** — `useHomework()`; filter tabs operate on query data; status changes via `useSetHomeworkStatus()`. Relocate to `features/student/screens/`.
- [ ] **Task 19: HomeworkDetailScreen** — `useHomeworkItem(id)` + `useSubject(subjId)`; **Submit** button → `useSubmitHomework()` with success toast; invalidate refreshes the list.
- [ ] **Task 20: SubjectsScreen** — `useSubjects()`.
- [ ] **Task 21: SubjectDetailScreen** — `useSubject(id)` + `useHomework()`/`useGrades()` filtered by `subjId`.
- [ ] **Task 22: GradesScreen** — `useGrades()` + `useExams()`.
- [ ] **Task 23: ScheduleScreen** — `useToday()`.
- [ ] **Task 24: InboxScreen** — `useThreads('student')`; search filters query data.
- [ ] **Task 25: ChatThreadScreen** — `useMessages(id)` + composer `useSendMessage(id)`; new message appears after send.
- [ ] **Task 26: AnnouncementsScreen** — `useAnnouncements('student')`.
- [ ] **Task 27: ProfileScreen** — `useStudentProfile()` + `useAchievements()` + `usePeers()`; **Sign out** row → `useAuth().signOut()` (returns to login).
- [ ] **Task 28: Delete `src/data/sample.ts`** once no screen imports it. Run `grep -r "data/sample" src` → expect no results. Run `npx tsc --noEmit` and `npm test`. Commit `refactor: remove static sample data; all screens use the data layer`.

**Milestone 2 complete:** entire Student app runs on the data layer; static data file removed.

---

# MILESTONE 3 — Parent module

### Task 29: Parent fixtures

**Files:**
- Create: `src/services/mock/fixtures/parent.ts`
- Modify: `src/services/mock/db.ts` (seed parent slices; populate the optional fields)

- [ ] **Step 1: Create `src/services/mock/fixtures/parent.ts`**

Port the parent section from `.design-pkg/teacher-app/project/data-student-parent.js` lines 108–192 (`parent`, `children`, `childToday`, `fees`, `ptm`, `parentChats`, `transport`, `events`) typed against `@/models`. Map `parentChats` → `ChatThread[]` (rename `kid`→`kid`, keep `group`). Add parent thread messages and parent announcements and per-child attendance:

```ts
import type {
  Announcement, AttendanceDay, AttendanceFlag, ChatMessage, ChatThread,
  Child, ChildToday, Fee, Parent, PTMMeeting, Transport,
} from '@/models';

export const parentProfile: Parent = {
  name: 'Priya Patel', initials: 'PP', relation: 'Mother',
  email: 'priya.patel@home.com', phone: '+1 (415) 555-0142',
};

export const children: Child[] = [ /* k1 Maya, k2 Arjun — copy from data-student-parent.js */ ];
export const childToday: Record<string, ChildToday> = { /* k1, k2 — copy */ };
export const fees: Fee[] = [ /* f1..f4 — copy */ ];
export const ptm: PTMMeeting[] = [ /* pt1..pt3 — copy */ ];
export const transport: Transport = { /* copy */ };

export const parentThreads: ChatThread[] = [ /* from parentChats pc1..pc5 */ ];
export const parentMessages: ChatMessage[] = [
  { id: 'pm1', threadId: 'pc1', from: 'them', text: 'Maya did very well on the pop quiz!', time: '11:08' },
  { id: 'pm2', threadId: 'pc1', from: 'me', text: 'Thank you! Anything to focus on at home?', time: '11:14' },
  { id: 'pm3', threadId: 'pc1', from: 'them', text: 'Reading aloud 15 min each evening would be perfect.', time: '11:18' },
];

export const parentAnnouncements: Announcement[] = [ /* pa1..pa4 from ParentAnnouncementsScreen */ ];

// Per-child attendance month (Apr 2026) — mirrors the design's generator.
export function attendanceFor(childId: string): { days: AttendanceDay[]; flags: AttendanceFlag[] } {
  const absent = childId === 'k2' ? [8, 17, 24] : [8, 17];
  const late = childId === 'k2' ? [3, 22, 28] : [3, 22];
  const days: AttendanceDay[] = Array.from({ length: 30 }, (_, i) => {
    const d = i + 1;
    const dow = (d + 2) % 7;
    const weekend = dow === 0 || dow === 6;
    let kind: AttendanceDay['kind'] = 'present';
    if (weekend) kind = 'off';
    else if (absent.includes(d)) kind = 'absent';
    else if (late.includes(d)) kind = 'late';
    if (d > 25) kind = 'future';
    return { d, kind };
  });
  const flags: AttendanceFlag[] = [
    { id: 'af1', tone: 'absent', date: 'Apr 17', reason: 'Marked absent · no excuse on file', action: 'Submit excuse' },
    { id: 'af2', tone: 'late', date: 'Apr 22', reason: 'Late by 14 min · Math class', action: 'View' },
    { id: 'af3', tone: 'absent', date: 'Apr 08', reason: 'Marked absent · sick (excused)', action: 'View' },
  ];
  return { days, flags };
}
```

- [ ] **Step 2: Seed parent slices in `db.ts`**

Import the parent fixtures and assign the optional fields, including `parentAnnouncements`:
```ts
import * as parent from './fixtures/parent';
// inside the db object literal, add:
parent: clone(parent.parentProfile),
children: clone(parent.children),
childToday: clone(parent.childToday),
fees: clone(parent.fees),
ptm: clone(parent.ptm),
parentThreads: clone(parent.parentThreads),
parentMessages: clone(parent.parentMessages),
transport: clone(parent.transport),
parentAnnouncements: clone(parent.parentAnnouncements),
leave: [],
```
Also store the attendance generator reference (keep `attendanceFor` imported in the attendance mock, not in db).

- [ ] **Step 3: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/services/mock/fixtures/parent.ts src/services/mock/db.ts
git commit -m "feat: add parent fixtures and seed parent db slices"
```

---

### Task 30: Parent mock services (TDD for fees.pay, leave.submit, ptm.setStatus)

**Files:**
- Rewrite: `src/services/mock/parent.mock.ts` (replace the Milestone-1 stubs)
- Test: `src/services/mock/parent.mock.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import { db } from './db';
import { feesMock, leaveMock, ptmMock, parentMock } from './parent.mock';

const fast = { ms: 0, errorRate: 0 };

describe('parent mocks', () => {
  test('children() returns both kids', async () => {
    const kids = await parentMock(fast).children();
    expect(kids.map((k) => k.id)).toEqual(['k1', 'k2']);
  });

  test('fees.pay() marks a due fee paid', async () => {
    const due = db.fees!.find((f) => f.status === 'due')!;
    const updated = await feesMock(fast).pay(due.id);
    expect(updated.status).toBe('paid');
    expect(db.fees!.find((f) => f.id === due.id)?.status).toBe('paid');
  });

  test('leave.submit() appends a pending request', async () => {
    const before = db.leave!.length;
    const req = await leaveMock(fast).submit({
      childId: 'k1', from: 'Apr 28', to: 'Apr 30', reason: 'Travel', note: 'Family trip',
    });
    expect(req.status).toBe('pending');
    expect(db.leave!.length).toBe(before + 1);
  });

  test('ptm.setStatus() confirms a meeting', async () => {
    const pending = db.ptm!.find((m) => m.status === 'pending')!;
    const updated = await ptmMock(fast).setStatus(pending.id, 'confirmed');
    expect(updated.status).toBe('confirmed');
  });
});
```

- [ ] **Step 2: Run it (fails)**

Run: `npm test -- src/services/mock/parent.mock.test.ts`
Expected: FAIL — stubs throw `NotImplementedError`.

- [ ] **Step 3: Rewrite `src/services/mock/parent.mock.ts`**

```ts
import type {
  AttendanceService, FeesService, LeaveService, ParentService,
  PTMService, TransportService,
} from '@/services/types';
import { db } from './db';
import { withLatency } from './latency';
import { attendanceFor } from './fixtures/parent';

interface Opts { ms?: number; errorRate?: number }
let leaveCounter = 0;

export function parentMock(opts: Opts = {}): ParentService {
  return {
    getProfile: () => withLatency(() => db.parent!, opts),
    children: () => withLatency(() => db.children!, opts),
    childToday: (childId) => withLatency(() => db.childToday![childId], opts),
  };
}

export function feesMock(opts: Opts = {}): FeesService {
  return {
    list: (childId) => withLatency(() => db.fees!, opts), // single-child fee set in mock
    pay: (feeId) =>
      withLatency(() => {
        const fee = db.fees!.find((f) => f.id === feeId);
        if (!fee) throw new Error(`Fee ${feeId} not found`);
        fee.status = 'paid';
        fee.paidOn = 'today';
        fee.method = 'Visa •• 4421';
        return fee;
      }, opts),
  };
}

export function ptmMock(opts: Opts = {}): PTMService {
  return {
    list: () => withLatency(() => db.ptm!, opts),
    setStatus: (id, status) =>
      withLatency(() => {
        const m = db.ptm!.find((x) => x.id === id);
        if (!m) throw new Error(`PTM ${id} not found`);
        m.status = status;
        return m;
      }, opts),
  };
}

export function transportMock(opts: Opts = {}): TransportService {
  return { forChild: (_childId) => withLatency(() => db.transport!, opts) };
}

export function attendanceMock(opts: Opts = {}): AttendanceService {
  return { month: (childId) => withLatency(() => attendanceFor(childId), opts) };
}

export function leaveMock(opts: Opts = {}): LeaveService {
  return {
    list: (childId) => withLatency(() => db.leave!.filter((l) => l.childId === childId), opts),
    submit: (req) =>
      withLatency(() => {
        leaveCounter += 1;
        const created = { ...req, id: `lv-${leaveCounter}`, status: 'pending' as const };
        db.leave!.push(created);
        return created;
      }, opts),
  };
}
```

- [ ] **Step 4: Run it (passes)**

Run: `npm test -- src/services/mock/parent.mock.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/mock/parent.mock.ts src/services/mock/parent.mock.test.ts
git commit -m "feat: implement parent mock services"
```

---

### Task 31: Parent hooks

**Files:**
- Create: `src/hooks/useParent.ts`
- Create: `src/hooks/useFees.ts`
- Create: `src/hooks/usePTM.ts`
- Create: `src/hooks/useTransport.ts`
- Create: `src/hooks/useAttendance.ts`
- Create: `src/hooks/useLeave.ts`

- [ ] **Step 1: Create the hooks**

`src/hooks/useParent.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useParentProfile = () =>
  useQuery({ queryKey: qk.parentProfile, queryFn: () => services.parent.getProfile() });
export const useChildren = () =>
  useQuery({ queryKey: qk.children, queryFn: () => services.parent.children() });
export const useChildToday = (childId: string) =>
  useQuery({ queryKey: qk.childToday(childId), queryFn: () => services.parent.childToday(childId) });
```

`src/hooks/useFees.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useFees = (childId: string) =>
  useQuery({ queryKey: qk.fees(childId), queryFn: () => services.fees.list(childId) });

export function usePayFee(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (feeId: string) => services.fees.pay(feeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.fees(childId) }),
  });
}
```

`src/hooks/usePTM.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { PTMMeeting } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const usePTM = () =>
  useQuery({ queryKey: qk.ptm, queryFn: () => services.ptm.list() });

export function useSetPTMStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; status: PTMMeeting['status'] }) =>
      services.ptm.setStatus(vars.id, vars.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.ptm }),
  });
}
```

`src/hooks/useTransport.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useTransport = (childId: string) =>
  useQuery({ queryKey: qk.transport(childId), queryFn: () => services.transport.forChild(childId) });
```

`src/hooks/useAttendance.ts`:
```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export const useAttendance = (childId: string) =>
  useQuery({ queryKey: qk.attendance(childId), queryFn: () => services.attendance.month(childId) });
```

`src/hooks/useLeave.ts`:
```ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { LeaveRequest } from '@/models';
import { services } from '@/services';
import { qk } from './keys';

export const useLeave = (childId: string) =>
  useQuery({ queryKey: qk.leave(childId), queryFn: () => services.leave.list(childId) });

export function useSubmitLeave(childId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (req: Omit<LeaveRequest, 'id' | 'status'>) => services.leave.submit(req),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.leave(childId) }),
  });
}
```

- [ ] **Step 2: Verify compile**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useParent.ts src/hooks/useFees.ts src/hooks/usePTM.ts src/hooks/useTransport.ts src/hooks/useAttendance.ts src/hooks/useLeave.ts
git commit -m "feat: add parent data hooks"
```

---

### Task 32: Parent navigation + child switcher component

**Files:**
- Create: `src/features/parent/components/KidSwitcher.tsx`
- Create: `src/navigation/ParentTabNavigator.tsx`
- Create: `src/navigation/ParentNavigator.tsx`
- Modify: `src/navigation/RootNavigator.tsx` (route parents to `ParentNavigator`)

- [ ] **Step 1: Create `KidSwitcher.tsx`**

A horizontal row of child chips from `useChildren()`, bound to `useSelectedChild()`. Mirror the design in `parent-screens.jsx` lines 61–103 using `View`/`Pressable`/`Text` + theme tokens (active chip = `colors.primary` bg white text; inactive = white bg `colors.rule` border; unread badge = `colors.coral`). Use `hueColor(child.hue, 'base')` for the avatar circle.

- [ ] **Step 2: Create `ParentTabNavigator.tsx`**

Bottom tabs mirroring `TabNavigator.tsx` but with parent routes and labels: Home→"Today", Progress→"Progress", Fees→"Fees", Inbox→"Inbox", Profile→"Me". Icons: `home`, `stats-chart`, `card`, `chatbubbles`, `person` (Ionicons). Components are the parent screens from Task 33+.

- [ ] **Step 3: Create `ParentNavigator.tsx`**

Native stack: `Main` (=`ParentTabNavigator`) + detail screens `Attendance`, `PTM`, `Transport`, `Leave`, `Announcements`, `ChatThread`. Same `screenOptions` as `StudentNavigator`.

- [ ] **Step 4: Wire into `RootNavigator.tsx`**

Replace the parent branch placeholder:
```tsx
import { ParentNavigator } from './ParentNavigator';
// ...
) : role === 'parent' ? (
  <ParentNavigator />
) : (
```

- [ ] **Step 5: Verify compile**

Run: `npx tsc --noEmit`
Expected: errors only for not-yet-created parent screens (resolved as Task 33+ lands). If building incrementally, stub each parent screen as a `View` placeholder first, then fill in. Create placeholder files for all 12 parent screens now (empty `View` returning the screen name) so the navigator compiles, then flesh out per task.

- [ ] **Step 6: Commit**

```bash
git add src/features/parent/ src/navigation/ParentTabNavigator.tsx src/navigation/ParentNavigator.tsx src/navigation/RootNavigator.tsx
git commit -m "feat: add parent navigation, child switcher, screen placeholders"
```

---

### Parent screens (Tasks 33–43)

Each builds one screen in `src/features/parent/screens/`, mirroring the named function in `.design-pkg/teacher-app/project/parent-screens.jsx`, using the existing `components/ui` kit + theme + the hooks from Task 31, with `Loading`/`ErrorState` guards and pull-to-refresh on scroll screens. Verify each via `npm run web` (sign in with the **Parent** toggle). One commit per screen.

- [ ] **Task 33: ParentHomeScreen** (design lines 108–257) — `useParentProfile()`, `useChildren()`, `useChildToday(childId)`; `KidSwitcher`; today snapshot hero, classes timeline, quick actions (navigate to Fees/Leave/PTM/Transport), fee-due alert (when child's `fee !== 'Paid'`), latest notice from `useAnnouncements('parent')`.
- [ ] **Task 34: ParentProgressScreen** (262–330) — `useChildren()` for the focused child + `useSubjects()`; overall hero + per-subject bars (apply the `-8` adjustment for `k2` as in the design).
- [ ] **Task 35: ParentAttendanceScreen** (335–419) — `useAttendance(childId)`; month grid + summary stats + flag rows. Stack detail screen.
- [ ] **Task 36: ParentFeesScreen** (457–522) — `useFees(childId)`; due hero with line items + **Pay now** → `usePayFee(childId)` (hero flips to history on success); payment history list. Stack detail screen.
- [ ] **Task 37: ParentPTMScreen** (527–582) — `usePTM()`; open-window banner; meeting cards with **confirm/reschedule** → `useSetPTMStatus()`. Stack detail screen.
- [ ] **Task 38: ParentChatScreen / Inbox** (587–638) — `useThreads('parent')`; search; per-thread child label via `useChildren()`. Tab screen.
- [ ] **Task 39: ParentChatThreadScreen** (640–704) — `useMessages(id)` + composer `useSendMessage(id)`. Stack detail screen.
- [ ] **Task 40: ParentTransportScreen** (709–804) — `useTransport(childId)`; static SVG map mock (recreate with `react-native-svg`), driver card, route timeline. Stack detail screen.
- [ ] **Task 41: ParentLeaveScreen** (809–892) — local form state (dates, reason chips, note); **Submit request** → `useSubmitLeave(childId)` + success toast, then navigate back. Stack detail screen.
- [ ] **Task 42: ParentAnnouncementsScreen** (897–921) — `useAnnouncements('parent')`. Stack detail screen.
- [ ] **Task 43: ParentProfileScreen** (926–996) — `useParentProfile()` + `useChildren()`; children cards; account rows; **Sign out** → `useAuth().signOut()`.

**Milestone 3 complete:** parent login → parent tabs → all 12 screens working with the child switcher and interactive writes.

---

# MILESTONE 4 — Polish & API-swap docs

### Task 44: Empty/error/skeleton coverage pass

**Files:** all list screens (student + parent).

- [ ] **Step 1:** For every screen rendering a list, add an `Empty` state when the query returns an empty array. Verify by temporarily emptying a fixture array (then revert).
- [ ] **Step 2:** Confirm every screen has both `Loading` and `ErrorState` guards (grep for screens missing them).
- [ ] **Step 3:** Set `MOCK_ERROR_RATE = 0.3` in `api/config.ts`, run the app, confirm error states + retry work across screens, then set back to `0`.
- [ ] **Step 4: Commit** `feat: complete empty/error/loading coverage`.

---

### Task 45: Pull-to-refresh audit

- [ ] **Step 1:** Ensure every `ScrollView`/`FlatList` top-level screen has a `RefreshControl` wired to its queries' `refetch`.
- [ ] **Step 2:** Verify on web/device.
- [ ] **Step 3: Commit** `feat: pull-to-refresh on all data screens`.

---

### Task 46: Document the API swap

**Files:**
- Modify: `README.md`

- [ ] **Step 1:** Add a "Data layer & swapping to a real API" section: explain `services/types.ts` interfaces, the mock vs http registry in `services/index.ts`, the `DATA_SOURCE` flag in `app.json` `extra`, and the step-by-step: implement `services/http/*` against `api/client.ts` → set `dataSource: "http"` (or per-domain) → no screen/hook changes. Mention `setAuthToken` is already called on sign-in so HTTP calls are authorized.
- [ ] **Step 2:** Update the "Project layout" section to reflect `api/`, `services/`, `hooks/`, `providers/`, `features/student`, `features/parent`.
- [ ] **Step 3: Commit** `docs: document data layer and real-API swap`.

---

### Task 47: Final verification

- [ ] **Step 1:** Run `npx tsc --noEmit` → no errors.
- [ ] **Step 2:** Run `npm test` → all pass.
- [ ] **Step 3:** Run `npm run lint` → clean (fix any new issues).
- [ ] **Step 4:** Run `npm run web`, walk both flows end-to-end: Student (login → submit homework → send message → sign out) and Parent (login → switch child → pay fee → book/confirm PTM → submit leave → send message → sign out).
- [ ] **Step 5: Commit** any lint fixes; the feature is complete.

---

## Self-Review (author checklist — completed)

**Spec coverage:**
- §2 decisions → all reflected (one-app/login Task 16; React-Query+interfaces Tasks 7/10/15/31; interactive writes Tasks 8/30 + mutation hooks; mock auth + role toggle Tasks 8/12/16; all 12 parent screens Tasks 33–43; feature-first relocation Milestone 2 + Task 32; lightweight tests Tasks 5/8/10/12/30).
- §3 architecture → swap seam (Tasks 4/7/9/10), mock layer (5/6/8/29/30), http stubs (9), registry (10), client/config (4/9), hooks (15/31), providers (11/12/13), navigation (16/32) — all covered.
- §5 parent screens → Tasks 33–43 (12 screens) + child switcher (32). ✓
- §6 student refactor → Tasks 17–28. ✓
- §7 shared states/tests → Tasks 14/44/45 + unit tests noted above. ✓
- §10 swap docs → Task 46. ✓

**Placeholder scan:** Screen Tasks 18–28 and 33–43 intentionally reference the Task 17 pattern + exact design line ranges + named hooks (all defined in Tasks 15/31) rather than repeating full JSX — the visual source already exists verbatim in the design package and the existing student screens; this is recreation, not net-new code, and each task names its hooks, file location, and design source precisely. No "TBD"/"add error handling"-style gaps in logic tasks.

**Type consistency:** Hook names (`useHomework`, `useSubmitHomework`, `useSetHomeworkStatus`, `usePayFee`, `useSetPTMStatus`, `useSubmitLeave`, etc.), service method names (`fees.pay`, `leave.submit`, `ptm.setStatus`, `homework.submit/setStatus`), query keys (`qk.*`), and model types are consistent across Tasks 3/7/8/15/30/31. The Milestone-1 `parent.mock` stub (Task 10) and its Milestone-3 rewrite (Task 30) share identical exported factory names/signatures. The `db` optional parent fields (Task 6) are populated in Task 29.
