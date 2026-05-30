# School Desk — Student + Parent modules on a swappable mock-data layer

**Date:** 2026-05-30
**Status:** Approved (design)
**Repo:** `sms-student` (Expo SDK 54 · React Native 0.81 · React 19 · TypeScript 5.9)

## 1. Goal

Deliver both the **Student** and **Parent** experiences end-to-end in this single Expo
app, backed by **mock data today** but architected so a **real API swaps in cleanly
later** without touching screens or hooks. Production-level structure, real
loading/error/refetch states, and interactive write actions that mutate in-session.

The Parent module is net-new (designs exist in `.design-pkg`). The Student module
already exists as 12 screens that consume static data directly from
`src/data/sample.ts`; it gets refactored onto the new data layer.

## 2. Decisions (locked)

| Decision | Choice |
| --- | --- |
| App structure | One app; role chosen at **login**, routed to that role's navigator |
| Data layer | **TanStack Query** hooks → typed **service interfaces** → mock impl (swap to HTTP later) |
| Mock writes | **Fully interactive in-session** — in-memory mutable store, React Query mutations + cache invalidation; resets on app restart |
| Auth | **Mock auth**, any credentials (zod format validation), Student/Parent **role toggle**; fake token in `AuthProvider` |
| Parent scope | **All 12 screens** + multi-child switcher |
| Structure | Feature-first: move existing student screens into `features/student/` |
| Testing | Lightweight: unit-test mock services + mock/http registry selection (screen/hook tests deferred) |

## 3. Architecture

### 3.1 The swap seam

```
Screen → React Query hook → Service interface → [ Mock impl  |  HTTP impl ]
                                                      ↑ today        ↑ later
```

Screens never import data or call `fetch` directly. They call hooks. Hooks call the
service registry. The registry returns a mock or HTTP implementation of each service
interface based on a single config flag. Swapping a domain to the real API means
writing its HTTP implementation and flipping the flag — hooks and screens are untouched.

### 3.2 Service interfaces (`src/services/types.ts`)

Typed async interfaces, one per domain. Methods return domain models (the types
currently in `src/data/sample.ts`, promoted to shared model types).

- `AuthService` — `signIn(email, password, role)`, `signOut()`, `currentSession()`
- `StudentService` — profile, dashboard summary
- `SubjectsService` — list, byId
- `HomeworkService` — list, byId, `submit(id)`, `setStatus(id, status)`
- `GradesService` — grades, exams
- `AnnouncementsService` — list (student + parent variants)
- `MessagingService` — threads, messages, `send(threadId, text)` (student + parent inboxes)
- `ParentService` — parent profile, children, `childToday(childId)`
- `FeesService` — list(childId), `pay(feeId)`
- `PTMService` — list, `book(slot)`, `reschedule(id)`, `setStatus(id, status)`
- `TransportService` — bus/route for child
- `LeaveService` — list, `submit(request)`
- `AttendanceService` — month grid + flags for child

### 3.3 Mock layer (`src/services/mock/`)

- `db.ts` — a single in-memory, mutable store object seeded from typed fixtures.
  Holds all student + parent state. Mutations mutate this object so changes persist
  for the session and reset on app restart.
- `fixtures/` — typed seed data: the current `sample.ts` content plus the parent data
  from `.design-pkg/.../data-student-parent.js` (parent, children, childToday, fees,
  ptm, parentChats + thread messages, transport, events, parent attendance/announcements).
- `latency.ts` — helper that resolves after a configurable delay (default ~300–600ms)
  and can optionally inject errors (off by default) to exercise error UI.
- `*.mock.ts` — one mock implementation per service interface, operating on `db`.

### 3.4 HTTP layer (`src/services/http/`)

Thin stubs implementing each interface by calling `api/client.ts`; they throw
`NotImplementedError` until the real endpoints are wired. This is the single place
future API work happens.

### 3.5 Registry (`src/services/index.ts`)

Exposes a `services` object. For each domain it returns the mock or HTTP impl based on
`config.DATA_SOURCE`. Supports a global default and (optionally) per-domain overrides,
so domains can migrate to the real API one at a time.

### 3.6 API client (`src/api/`)

- `config.ts` — `DATA_SOURCE` (`'mock' | 'http'`) and API base URL, read from
  `app.json` `extra` / env. Defaults to `'mock'`.
- `client.ts` — `fetch` wrapper: base URL, JSON handling, auth header injection from
  the active session, and error normalization to a shared error shape.

### 3.7 Hooks (`src/hooks/`)

React Query hooks per domain, e.g. `useSubjects`, `useHomework`, `useSubmitHomework`,
`useFees`, `usePayFee`, `useChildToday`, `usePTM`, `useBookPTM`, `useThreads`,
`useSendMessage`, `useSubmitLeave`, `useTransport`, `useAttendance`. Query keys are
namespaced per domain and, for parent data, keyed by `childId`. Mutations invalidate
the relevant queries on success.

### 3.8 Providers (`src/providers/`)

- `QueryProvider` — `QueryClient` + provider, wraps the app.
- `AuthProvider` — `{ session, role, signIn, signOut }`; the auth gate source of truth.
- `ChildProvider` — parent's selected `childId` (drives the child switcher and re-keys
  all parent queries).

### 3.9 Navigation (`src/navigation/`)

- `RootNavigator` — **auth gate**: no session → `LoginScreen`; session → role navigator.
- `StudentNavigator` — student bottom tabs (Home, Homework, Subjects, Inbox, Profile)
  + stack details (Schedule, HomeworkDetail, SubjectDetail, Grades, ChatThread,
  Announcements). This is the current navigation, relocated under the gate.
- `ParentNavigator` — parent bottom tabs (Today, Progress, Fees, Inbox, Me) + stack
  details (Attendance, PTM, Transport, Leave, Announcements, ChatThread).

## 4. Folder structure

```
src/
├─ api/             client.ts, config.ts
├─ services/        types.ts, index.ts, mock/ (db, latency, fixtures/, *.mock.ts), http/
├─ hooks/           one file per domain (queries + mutations)
├─ providers/       QueryProvider, AuthProvider, ChildProvider
├─ features/
│  ├─ student/screens/   (12 existing screens, relocated)
│  └─ parent/screens/    (12 new screens)
├─ navigation/      RootNavigator, StudentNavigator, ParentNavigator, types
├─ components/
│  ├─ ui/           existing design system (unchanged) + new shared state components
│  └─ cards/        existing + parent-specific cards as needed
└─ theme/           existing (unchanged)
```

Shared UI and theme stay global. The `components/ui` set already provides Avatar,
Button, Card, Donut, IconButton, Pill, ScreenHeader, SearchField, SectionHeader,
TabBar, Toast — reused across both modules.

## 5. Parent module — screens

All rebuilt in React Native with the existing UI kit + theme, matching the design in
`.design-pkg/teacher-app/project/parent-screens.jsx`. Designs already exist; no new
visual design required.

1. **Login** — brand hero + Student/Parent toggle (shared login).
2. **Home** — today snapshot hero, child switcher, today's classes timeline, quick
   actions (Pay fees / Apply leave / PTM / Bus track), fee-due alert, latest notice.
3. **Progress** — overall hero + per-subject performance bars for the focused child.
4. **Attendance** — month grid (present/absent/late/off/future), summary stats,
   recent flags with actions.
5. **Fees** — amount-due hero with line items + **Pay now** (mutation), payment history.
6. **PTM** — open-window banner + **Book slot**, scheduled meetings with
   **reschedule** / status.
7. **Inbox** — parent chat threads list, keyed/labeled by child.
8. **Chat thread** — message list + composer with **send** (mutation).
9. **Transport** — bus map mock, driver card, route timeline with your-stop highlight.
10. **Leave** — date range, reason chips, note, attach, **Submit request** (mutation) +
    toast.
11. **Announcements** — school notices list.
12. **Profile** — parent hero, "My children" cards, account rows, **Sign out**.

Child switcher (`ChildProvider`) appears on Home/Progress/Attendance and re-keys data
between Maya (k1) and Arjun (k2).

## 6. Student module — refactor

Each of the 12 existing screens swaps `import … from '@/data/sample'` for the matching
hook, gains loading/error/empty states, and write actions become real mutations
(submit homework, change homework status, send chat message). No visual change.

## 7. Shared states & quality

- `components/ui/Loading.tsx` — skeleton placeholders.
- `components/ui/ErrorState.tsx` — message + retry (calls `refetch`).
- `components/ui/Empty.tsx` — empty-list state.
- `RefreshControl` on list/scroll screens wired to `refetch`.
- Tests: unit tests for mock services (read + mutate behavior) and the registry's
  mock/http selection logic. Pure, fast, high-value. Screen/hook tests deferred.

## 8. Build order (milestones → implementation plan)

1. **Foundation** — `api/config` + `client`, `services/types` + registry, mock `db` +
   `latency` + fixtures, `QueryProvider` / `AuthProvider` / `ChildProvider`, shared
   state components, `RootNavigator` auth gate + `StudentNavigator`, and migrate the
   **Home** screen as the reference pattern. Verifies the full vertical slice.
2. **Student** — migrate the remaining 11 screens to hooks + mutations; relocate into
   `features/student/`.
3. **Parent** — build all 12 parent screens + child switcher + mutations + `ParentNavigator`.
4. **Polish** — empty/error/skeleton coverage, pull-to-refresh, HTTP stubs, and a
   README section documenting the swap-to-real-API steps.

## 9. Out of scope

- Real backend, real auth, real payments, real GPS bus tracking (mock only; seams ready).
- Push notifications, deep linking, offline persistence.
- New visual design — existing designs are recreated, not redesigned.
- Teacher app (separate concern).

## 10. Swapping to the real API later (developer note)

For each domain: implement its interface in `services/http/<domain>.http.ts` using
`api/client.ts`, then set that domain to `'http'` in `api/config.ts` (or flip the
global `DATA_SOURCE`). No hook or screen changes required. The mock impl stays as a
fixture/offline/test backend.
