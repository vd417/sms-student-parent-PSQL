# Multi-Child Parent Accounts + Student Password-Reset Email Fallback

## Context

Two gaps surfaced while working through the admission-ID auth phase ([[2026-07-24-admission-id-auth-design]]):

1. **Student password reset has no fallback.** A student with no `Email` on file (common — not every student has a personal inbox) cannot complete a forgot-password flow at all today; it just fails with `not_registered`. There is no mechanism to route the reset code to a parent's inbox instead.
2. **Parents can only ever have one linked child.** `Users.StudentId` is a single nullable string field storing one admission number — there is no data model for a parent with multiple children, even though the OpenAPI doc already documents `GET /v1/parents/me/children` returning `Child[]` (spec-only; no backend implementation exists).

This spans two repos: `sms-backend` (.NET, schema + endpoints) and `sms-student` (this repo, child-selector UI). Investigated by reading the actual backend code (not the aspirational OpenAPI doc) — see verified findings below.

## Verified current state (sms-backend)

- `Users.Email` and `Users.StudentId` are both nullable (`db/Sms.Migrations/M0001_Foundation_Tables.cs:21-22`). `StudentId` holds an admission number and lives on the *parent's* row — a one-way, one-to-one link.
- No `ParentId`/link table exists anywhere in `src` or `db`.
- OTP/reset delivery (`AuthService.SendOtpToRegisteredAsync`, `AuthService.cs:408-422`) sends the code to exactly the identifier string the client supplied — no alternate-recipient lookup exists.
- `GET /v1/parents/me/children` is documented (`docs/api/student-api.md:66`, `docs/api/student-api.openapi.yaml:90`) but has no controller/service/DAO.
- The only real "my children" backend code is transport-only (`ParentTransportController` → `StudentBusService.cs:58-68` → `ChildrenBusByAdmissionAsync`), resolving a single admission number from `Users.StudentId`.

## Design

### Data model (sms-backend)

- New table `ParentStudentLinks`: `ParentUserId` (FK → Users), `StudentAdmissionNo` (nvarchar, matches `Students.AdmissionNo`), `IsPrimary` (bit), `CreatedAt`. Unique constraint on `(ParentUserId, StudentAdmissionNo)`.
- One-time migration backfills every non-null `Users.StudentId` into this table as `IsPrimary = 1`. Rows where `StudentId` doesn't match any real `Students.AdmissionNo` are logged and skipped, not fatal to the migration.
- `Users.StudentId` is retired as the parent-child link once all readers are migrated (decision: replace, not coexist — single source of truth going forward).
- Any existing reader of `Users.StudentId` for this purpose (`StudentBusService` and anywhere else) is updated to read `ParentStudentLinks` via the new DAO instead.

### New DAO (sms-backend)

`ParentStudentDao`:
- `GetChildrenForParentAsync(parentUserId)` → list of linked children (admission no, name, isPrimary), ordered primary-first.
- `GetPrimaryParentEmailForStudentAsync(admissionNo)` → the `Email` of the parent whose link to this student has `IsPrimary = 1` (or the earliest-created link if none is flagged), or null if none/no email.

### Endpoint (sms-backend)

- `ParentController.GetChildrenAsync` → `GET /v1/parents/me/children`, implementing the already-documented contract, backed by `ParentStudentDao.GetChildrenForParentAsync`.

### Password-reset fallback (sms-backend)

- In `AuthService`'s OTP-request/forgot-password path: after resolving the target user, if it's a student (`StudentId`/admission-linked identity) and `Email` is null, call `GetPrimaryParentEmailForStudentAsync` and send the code to that address instead of failing.
- Delivery channel changes; the *identifier* used for the subsequent `password/reset` call is unchanged (still the student's own identifier) — only where the code lands changes. Client-facing response stays the same generic "a code was sent" message regardless of which inbox it went to, so no information about parent linkage leaks to the caller.
- If the student has no email AND no linked parent (or the parent also has no email), behavior is unchanged from today: `not_registered`/no-delivery-channel error.

### Children selector (sms-student)

- `ChildrenContext` (new, alongside `AuthProvider`): on parent login, fetches `/v1/parents/me/children`, holds `children: Child[]` and `selectedChildId`, defaulting selection to the primary child. Exposes a setter to switch.
- Mock layer gets a matching `getChildren()` in `src/services/mock/*`, gated by the existing `MOCK_BACKED` flag pattern, so the UI works ahead of the real backend endpoint shipping.
- UI: an inline child-selector (chip row) on the parent home screen, shown only when `children.length > 1`. Parents with exactly one child see no new UI at all — zero behavior change for the common case.
- Per-child screens (fees/attendance/transport/etc.) read `selectedChildId` from context rather than assuming a single implicit child.
- No client change to the reset/forgot-password flow itself — it already just sends the student's identifier; the fallback is entirely server-side.

## Error handling

- Student with no email and no (or emailless) linked parent → same `not_registered` failure as today, not a regression.
- Parent with zero linked children → `children: []`; client hides the selector and shows an empty/"no linked children" state on data screens instead of crashing on an undefined `selectedChildId`.
- Migration backfill: unmatched `Users.StudentId` values are logged and skipped, never fail the whole migration run.

## Testing

- Backend: unit tests for `ParentStudentDao` (children lookup, primary-parent-email lookup incl. no-primary-flag fallback to earliest link), `AuthService` fallback branch (null-email student → parent email used; no-parent case → existing error), migration backfill (row-count spot check, unmatched-StudentId skip path).
- Frontend: `ChildrenContext` tests (populate from mock/API, switch selection, empty-list state); existing login/reset jest suite should be unaffected since that flow has no client-visible change.
- End-to-end (local `docker-compose`, per the pattern in [[2026-07-24-admission-id-auth-design]]): parent with 2 children sees both and can switch; parent with 1 child sees no selector; student with no email completes password reset via the parent's inbox.

## Out of scope

- Parent self-service linking/unlinking of children (confirmed: view/select only; linking stays an admin/school-office operation).
- Sending the reset code to *all* linked parents (confirmed: primary-parent-only).
- Any other non-auth domain endpoints already tracked as later phases in [[2026-07-24-admission-id-auth-design]] (fees, attendance, leave, ptm, etc.) beyond the children-list endpoint itself.
