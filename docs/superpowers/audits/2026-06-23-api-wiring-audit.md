# API Wiring & Production-Readiness Audit

Date: 2026-06-23
Branch: `field-alignment-canonical`
Scope: Is every API wired to the app end-to-end, and is it production-grade/scalable?

## Verdict (TL;DR)

**Wiring: complete and clean.** All 15 service domains reach the UI through a
single, consistent data layer. No screen bypasses the service layer. One method
is dead (`homework.setStatus`).

**End-to-end against a live backend: NOT functional yet.** Three hard blockers:
1. `apiBaseUrl` is the **placeholder** `https://api.schooldesk.example/v1`
   (`app.json:37`) — every "live" call currently fails network resolution.
2. **No Swagger/OpenAPI** in the repo; 6 request/response shapes are best-guess,
   flagged `VERIFY-LIVE`.
3. **8 features are mock-only** (no backend endpoint exists yet).

**Production plumbing: solid.** Timeout, single-flight token refresh, 401→retry,
cross-platform secure token store, and react-query caching are all in place.

So: the app is **architecturally production-shaped and fully wired**, but it is
**not end-to-end live** until a real backend URL + Swagger arrive and the 8
mock-backed features get endpoints.

## Architecture / data flow

```
Screen (features/**/screens) ── react-query hook (hooks/use*.ts) ── services.<domain>.<method>
                                                                      │
AuthProvider ── services.auth.*  (imperative, reducer-backed)         │
                                                                      ▼
                                          buildServices() composition (services/index.ts)
                                                        │                         │
                                                 httpServices (http/index.ts)   mock/*.ts
                                                        │
                                              apiFetch (api/client.ts) → API_BASE_URL
```

- **Data fetching:** `@tanstack/react-query` v5 only. Defaults
  (`providers/QueryProvider.tsx:6`): `retry: 1`, `staleTime: 30_000`,
  `refetchOnWindowFocus: false`. Every domain method is wrapped 1:1 in a
  `hooks/use*.ts` file. Screens import hooks, never `services.*` directly.
- **Auth** is the deliberate exception: `AuthProvider` calls `services.auth.*`
  imperatively (state lives in a reducer, not react-query).
- **No layer violations:** grep for `fetch(`/`apiFetch(`/`axios` in screens/
  components returned zero hits — all data access is funneled through the
  service layer. This is the single biggest production-quality win here.

## Domain wiring matrix (live vs mock, in `DATA_SOURCE='http'`)

Source of truth: `services/index.ts:53-81`, `api/config.ts:28-37`.

| Domain | Backing (live mode) | Consumed by | Notes |
|---|---|---|---|
| auth | **live** | LoginScreen, Profile/ParentProfile, RootNavigator, bootstrap | 7 endpoints |
| subjects | **live** | 7 screens | most-used domain |
| homework | **live** | Home, HomeworkList, SubjectDetail, HomeworkDetail | `setStatus` DEAD |
| grades | **live** | SubjectDetail | GradesScreen derives from `subject.avg`, not this |
| announcements | **live** | Home, Announcements (student+parent) | audience param |
| messaging | **live** | ChatThread, ParentChat(Thread) | |
| directory | **live** | InboxScreen | |
| fees | **live** | ParentFeesScreen | `student_id` param unverified |
| leave | **live** | ParentLeave, ParentAttendance | `student_id` param unverified |
| student | **mixed** | Home, Schedule, Grades, Inbox, Profile | getProfile live; getToday/getPeers/getAchievements **mock** |
| parent | **mixed** | 9 parent screens + KidSwitcher | getProfile/children live; childToday **mock** |
| school | **mock** | SchoolBadge (both home screens) | no endpoint |
| ptm | **mock** | ParentPTMScreen | no endpoint |
| transport | **mock** | ParentTransportScreen | no endpoint |
| attendance | **mock** | ParentAttendanceScreen | no endpoint |

**Mock-backed even in live mode (8)** — `MOCK_BACKED`, `config.ts:28-37`:
`school.getCurrent`, `student.getToday`, `student.getPeers`,
`student.getAchievements`, `parent.childToday`, `ptm`, `transport`, `attendance`.
Each flips to live with a one-line edit in `services/index.ts` once its endpoint
ships. The startup `console.info` (`index.ts:84`) lists them at runtime.

## Live endpoint inventory (what hits the backend in http mode)

From `services/http/index.ts`:
- **auth:** `POST /auth/login`, `/auth/logout`, `/auth/otp/request`,
  `/auth/otp/verify`, `/auth/refresh`, `/auth/set-password`; `GET /auth/me`
- **subjects:** `GET /subjects`, `/subjects/{id}`
- **homework:** `GET /homework`, `/homework/{id}`; `PATCH /homework/{id}`;
  `POST /homework/{id}/submit`
- **grades:** `GET /exam-papers`, `/exam-papers/{id}/grades`
- **announcements:** `GET /announcements?audience=`
- **messaging:** `GET /threads?audience=`, `/threads/{id}/messages`;
  `POST /threads/{id}/messages`
- **directory:** `GET /teachers`
- **student/parent (live methods):** `GET /students/{id}`, `/parents/me`,
  `/students` (parent's children)
- **fees:** `GET /fees/invoices?student_id=`; `POST /fees/invoices/{id}/pay`
- **leave:** `GET /leave?student_id=`; `POST /leave`

Composed-to-mock paths still exist in code (`/school`, `/students/me/*`,
`/children/{id}/*`, `/ptm`) for the day their endpoints land.

## Unverified contract assumptions (`VERIFY-LIVE`, 6)

`services/http/index.ts`: login body field `identifier` (:39); `/auth/otp/verify`
returns `{ reset_token, expires_in }` (:51); set-password body `reset_token`
(:66); `parent.children` assumed guardian-scoped `GET /students` (:118);
`fees.list` filter param `student_id` (:124); `leave.list` filter param
`student_id` (:136). All must be reconciled against real Swagger.

## Production plumbing assessment

**Strong (`api/client.ts`):**
- Per-request **timeout** via `AbortController` (15s, `config.ts:20`), normalized
  to `ApiError(0)`.
- **Single-flight refresh** (`refreshOnce`) — concurrent 401s await one refresh.
- **401 → refresh → retry once**, then `sessionExpiredHandler` on failure.
- Cross-platform **secure token store** (`services/auth/tokenStore.ts`:
  expo-secure-store native / localStorage web).
- Error normalization carries the response `body` (`services/errors.ts`).
- react-query caching + de-dup + `staleTime` + manual `refetch` pull-to-refresh
  on every list screen.

**Gaps for scale / production hardening:**
1. **No pagination anywhere.** List endpoints (announcements, messaging threads/
   messages, homework, fees, leave, directory) fetch unbounded arrays. Fine for a
   demo class; a real school's message history or announcement archive needs
   cursor/page params on both the API contract and the hooks.
2. **No offline/persisted cache.** react-query state is memory-only; a cold
   launch with no network shows error states. Consider `persistQueryClient` if
   offline matters.
3. **`grades.listGrades` is N+1** (`http/index.ts:93-98`): one call per exam
   paper. Acceptable for few papers; ask the backend for a flat
   `GET /grades?student_id=` to avoid fan-out at scale.
4. **`console.info`/`console.error` left in** (`index.ts:84`, client paths) — route
   through a real logger/telemetry sink before production.
5. **No retry backoff tuning per-domain** — global `retry: 1`. Mutations
   (pay fee, submit homework/leave) inherit it; confirm idempotency expectations
   with the backend before enabling retries on writes.

## Dead code & demo-only artifacts (must clean before prod)

- **Dead:** `homework.setStatus` / `useSetHomeworkStatus` (`hooks/useHomework.ts:22`)
  — fully wired but imported by no screen. Either surface it in HomeworkDetail or
  remove it.
- **Demo-only (gate/remove):** fixed mock OTP `123456` and the on-screen
  "Demo code: 123456" hint (LoginScreen); demo Student-ID default
  `'WBA-2024-1042'` (LoginScreen); `mock getMe` hardcodes `role:'student'`
  (`mock/auth.mock.ts`).
- **Deferred:** 30s resend cooldown on parent OTP (Resend exists without a timer).

## Prioritized action list to reach true end-to-end

**P0 — unblock live (nothing works without these):**
1. Set the real `apiBaseUrl` (per-env via EAS) — replace the `app.json:37`
   placeholder.
2. Obtain Swagger; reconcile the 6 `VERIFY-LIVE` assumptions; run
   `LIVE_API=1 npm test` against a real host.

**P1 — close the mock gaps (8 features):**
3. As each endpoint ships, flip its `MOCK_BACKED` entry to the `http.*` method in
   `services/index.ts` and drop it from `config.ts` `MOCK_BACKED`.

**P2 — production hardening:**
4. Add pagination to list contracts + hooks.
5. Replace `console.*` with telemetry; gate demo artifacts behind `__DEV__`.
6. Remove/wire `homework.setStatus`.
7. Decide offline-cache and write-retry/idempotency policy.

## What this audit did NOT do

Verify against a live backend (none exists), load/perf testing, or a security
review of the backend. Those require the real API host first.
