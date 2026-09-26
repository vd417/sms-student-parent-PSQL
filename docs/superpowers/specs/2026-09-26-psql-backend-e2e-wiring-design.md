# End-to-end wiring against the Postgres `sms-api` — Design

**Date:** 2026-09-26
**Repos:** `sms-student-parent-app` (this repo, remote `vd417/sms-student-parent-PSQL`), `sms-api` (branch `postgres-migration`)
**Status:** Draft for review

## Goal

The student/parent app works end to end against the Postgres-backed `sms-api` running locally
against the existing `sms_dev` database.

**Success criteria**

- Every existing student and parent screen loads real data with no errors.
- Login, token refresh and logout work for both roles.
- Fees are paid through Razorpay order/verify only.
- Live bus tracking (`/hubs/transport-fleet`) and live notices (`/hubs/live`) connect and receive events.
- The app works from a phone on the same Wi-Fi network as the dev PC.

**Scope decisions (agreed)**

- Both sides may change: the app adapts where the backend is right; the backend is fixed or
  extended where the app is right.
- A backend PTM feature is built, because the app already ships a PTM screen.
- Peers, meals, pickup, parent relation and a calendar screen stay out of scope; they keep their
  current hidden/blank behaviour.

## Current state (from exploration)

- Every app feature already calls live `/v1` (`src/services/http/index.ts`); mocks are used only
  when `dataSource: 'mock'`. Wire-format drift is absorbed in `src/services/http/dtos.ts` and
  `mappers.ts`, so `src/models` stays stable.
- `sms-api` is .NET 10 + PostgreSQL 18 (Npgsql/Dapper, RLS, `sms_app` role). Conventions:
  `{data}` envelope, `{data, next_cursor}` keyset paging (`limit` default 50, max 200),
  `{error:{code,message,details}}` errors, snake_case on the wire, bearer JWT, SignalR token via
  `?access_token=`.
- `dotnet run --project src/Sms.Api` listens on `0.0.0.0:5162`, matching the app default
  `http://localhost:5162/v1`.

**Known mismatches**

| # | Item | App | Backend |
|---|------|-----|---------|
| 1 | Health ping | `GET {origin}/health` | only `/health/ready` is mapped |
| 2 | PTM | `GET /ptm`, `PATCH /ptm/{id}` | no route, no table |
| 3 | Fee pay | calls `POST fees/invoices/{id}/pay` | staff-only without amount; parents must use Razorpay |
| 4 | Paging | reads the first page only | fees/invoices, fees/payments (and possibly others) are cursor-paged |
| 5 | Dev LAN | preview build uses `192.168.0.103` | CORS dev list has `192.168.29.149` |
| 6 | Route geometry | `GET /transport/routes/{id}/geometry` | controller exists; Postgres storage not confirmed (no match in `db/postgres`) |

Verified as matching: thread create (`name, role, group, child_id`), message send
(`text, image_url`), SignalR hub routes, methods and event names.

## Approach

Contract check first, then fix. A script exercises every endpoint the app uses against the live
backend with real student and parent logins, runs the responses through the app's own mappers,
and reports mismatches. Each mismatch is fixed on the side that is wrong, and the script is re-run
until it is green. The script stays in the repo as a regression check.

Rejected: click-through only (misses silent field drift that renders as "—"); generating types
from Swagger (rewrites a working mapping layer and does not verify real responses).

## Design

### 1. Contract check script — `scripts/contract-check/` (app repo)

- Node + TypeScript, run with `npm run contract-check` (via `tsx`).
- Config from `scripts/contract-check/.env` (git-ignored; a committed `.env.example` lists the keys):
  `API_BASE_URL`, `STUDENT_IDENTIFIER`, `STUDENT_PASSWORD`, `PARENT_IDENTIFIER`, `PARENT_PASSWORD`.
- Flow per role: `POST /auth/login` → `GET /auth/me` → discover ids (own student id,
  `/parents/me/children`, first invoice, first homework, first thread, first route id) → call each
  endpoint the app's `httpServices` uses for that role.
- For each call: save the raw JSON to `scripts/contract-check/out/<role>/<name>.json`
  (git-ignored) and pass it through the matching mapper from `src/services/http/mappers.ts`.
- Result per call:
  - **FAIL:** non-2xx status, or the mapper throws, or a field the app treats as required is
    missing or of the wrong type (checked with small zod schemas per DTO in the script).
  - **WARN:** an empty list where the seed data should have rows.
  - **PASS:** otherwise.
- SignalR: connect to `/hubs/live` and `/hubs/transport-fleet` with the parent token, invoke
  `JoinMyChildrenBuses`, and assert the connection and invoke succeed.
- Read-only by default. `--writes` additionally runs `POST /notifications/read` and
  `PATCH /ptm/{id}`. It never calls any payment endpoint.
- Output: a pass/warn/fail table; exit code 1 if anything fails.

### 2. Known fixes

- **App — health:** `pingHealth()` in `src/api/client.ts` calls `{origin}/health/ready`.
- **App — fees:** remove the parent path to `POST fees/invoices/{id}/pay`; fee payment goes only
  through `razorpay/order` → checkout → `razorpay/verify`.
- **App — paging:** a helper in `src/api/` follows `next_cursor` (with `limit=200`) until it is
  empty, capped at 10 pages, for every endpoint the check shows as paged.
- **App — dev LAN:** remove the hard-coded dev IP from `eas.json`'s preview profile in favour of
  `EXPO_PUBLIC_API_BASE_URL`, and document it in the README.
- **Backend — CORS:** add the dev PC's current LAN origin(s) (ports 8081, 19006) to
  `Cors:AllowedOrigins` in `appsettings.Development.json`.
- **Backend — route geometry:** confirm where geometry is persisted in Postgres; if the table or
  proc is missing from `db/postgres`, add it in a forward migration.
- **Everything the check finds:** a name or shape difference with correct data is fixed in the app
  (`dtos.ts`, `mappers.ts`); a 4xx/5xx, wrong data or a missing field is fixed in the backend.

### 3. Backend PTM feature (`sms-api`)

- **Migration** `db/postgres/migrations/0005_ptm_meetings.sql`:
  - table `comms.ptm_meetings` — `id uuid pk`, `tenant_id uuid not null`, `student_id uuid not null`,
    `teacher_id uuid null`, `subject text null`, `meeting_date date not null`,
    `meeting_time time not null`, `mode text not null` (`in_person` | `online`),
    `status text not null default 'pending'` (`pending` | `confirmed`), `created_at timestamptz`;
  - an index on `(tenant_id, student_id, meeting_date)`;
  - an RLS policy and grants to `sms_app`, matching `07_rls_policies.sql` / `99_app_role_grants.sql`;
  - list, get, create and set-status functions following `17_comms_procs.sql`.
- **Endpoints** (`PtmController`, prefix `v1/ptm`):
  - `GET /v1/ptm` (policy `student.parent`): a parent gets meetings for all linked children
    (`ParentStudentLinks`); a student gets their own. Response items are
    `{id, date, time, teacher, subject, child, mode, status}`, exactly the app's `PTMMeetingDTO`.
  - `PATCH /v1/ptm/{id}` `{status}` (policy `student.parent`): parent only; the meeting's student
    must be linked to the caller (`IsLinkedToCallerAsync`), otherwise 404. Returns the updated item.
  - `POST /v1/ptm` (policy `staff`): creates a meeting so schools have a way to add them.
- Register the controller in `Swagger/ApiAudienceMap.cs` for the student audience.
- Tests follow the existing backend test projects (service unit tests plus a link-check test).

### 4. Error handling

- No new client error paths: the existing `errors.ts` normalisation, 401 single-flight refresh and
  `wrong_role` handling stay as they are.
- PTM returns the standard `{error:{code,message}}` envelope: `not_found` (404) for an unlinked or
  missing meeting, and `invalid_status` (422) for a status other than `pending` or `confirmed`.

## Testing and definition of done

1. `npm run contract-check` passes for both student and parent (no FAIL rows).
2. `npm test` in the app and `dotnet test` in `sms-api` pass.
3. A manual click-through of every student tab (Home, Homework, Subjects, Inbox, Profile) and
   parent tab (Home, Class, Fees, Inbox, Me) plus Transport, PTM, Leave and Attendance on Expo web.
4. The user confirms the app runs from a phone on the same Wi-Fi.
5. Work is committed on `feat/psql-e2e-wiring` in both repos; nothing is pushed without the user
   asking.

## Out of scope

Peers/classmates, meals, pickup, parent relation, a calendar screen, the Google Maps key committed
in `app.json` (flagged separately), and updating the stale `sms-api/docs/api/student-api.md`.
