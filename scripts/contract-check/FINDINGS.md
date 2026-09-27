# Contract-check findings

Run against sms-api `feat/sms-api-e2e-wiring` (includes PTM commit `98bbe4d`) and `sms_dev` on 2026-09-27.
API at `http://localhost:5262/v1`. The port is set by the local user-secret `Kestrel:Endpoints:Http:Url`.

Test logins are E2E accounts created in the "SchoolDesk Dev Seed" school, because `sms_dev` had no
student logins and no parent–child links:
- student `DS-A-01`
- parent `e2e.parent@schooldesk.test`, linked to `DS-A-01` and `DS-A-02`

Baseline result: **PASS 44, WARN 14, FAIL 1**.

| # | Row | Result | Evidence (raw file in out/, not committed) | Verdict | Side | Fix commit |
|---|-----|--------|--------------------------------------------|---------|------|-----------|
| 1 | parent/ptm | FAIL HTTP 500 | out/parent/ptm.json | confirmed: table `dbo.PtmMeetings` missing in sms_dev, because migration 0005 isn't applied (it needs the schema owner) | backend (db) | 98bbe4d (code); apply 0005 pending owner credentials |
| 2 | student/announcements, parent/announcements | WARN empty list | out/*/announcements.json | confirmed defect: the one row has `Audience = 'all'`; the list filter matches only `NULL` or an exact audience. The admin writes `parents`/`students`/`everyone`/`all`, while the app asks for `parent`/`student`, so admin announcements never reach the app | backend | 6914d49 |
| 3 | */homework (3 rows) | WARN empty list | out/*/…homework.json | not a defect: `dbo.Homework` has 0 rows for this school | — | — |
| 4 | */grades (3 rows) | WARN empty list | out/*/…grades.json | not a defect: `dbo.Grades` has 0 rows for this school | — | — |
| 5 | */attendance (3 rows) | WARN empty list | out/*/…attendance.json | not a defect: `dbo.AttendanceRecords` has 0 rows for this school | — | — |
| 6 | */fees (3 rows) | WARN empty list | out/*/…fees.json | not a defect: `dbo.FeeInvoices` has 0 rows for this school | — | — |

Re-confirmed live (spec "known fixes" that were not broken): `/health` answers; no endpoint the app uses
returned `next_cursor`; route geometry returned 200; both SignalR hubs connected and `JoinMyChildrenBuses`
succeeded.

Environment notes (not code defects):
- The API listens on 5262 (user-secret), but the app, teacher app and admin default to 5162.
- `sms_dev` has no student or parent logins; the SQL Server logins were not migrated.

## Re-run after fixes (2026-09-27)

- sms-api now includes `6914d49` (announcements audience fix) and `af6dc6f` (staff PTM).
- Read-only run: **PASS 57, WARN 4, FAIL 1**. Announcements (#2) now PASS for both roles.
- With `CONTRACT_WRITES=1`: **PASS 59, WARN 4, FAIL 1**. `notifications/read` passes for both roles.
- The remaining FAIL is #1 (`/ptm`, HTTP 500): migration 0005 is not yet applied to sms_dev, because it needs the schema-owner connection.
- The remaining WARNs are empty fee invoices and one child's grades; `sms_dev` has no such rows.

## Final run (2026-09-27): all green

- Migration 0005 is applied to sms_dev (as `postgres`). Two tagged meetings were added for the E2E parent's children
  (ids `e2e00000-…-00a1` / `…-00a2`; `sms_dev/e2e-cleanup.sql` removes them).
- API from sms-api `4ae5a2d`.
- `CONTRACT_WRITES=1 npm run contract-check`: **PASS 61, WARN 4, FAIL 0**.
- `/ptm?scope=family` and `PATCH /ptm/{id}` both PASS. Finding #1 is closed.
- The remaining WARNs are empty fee invoices and one child's grades; `sms_dev` has no such rows.
