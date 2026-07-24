# Admission-ID Login + Email-Code Verification (Phase 1 of production backend wiring)

## Context

`sms-student` (this repo) has a production-ready client-side auth stack (`field-alignment-canonical` branch) but is still pointed at a placeholder API host. A real backend, `sms-backend` (sibling repo, .NET), exists with a working `LoginController` (`v1/auth/*`) — but only auth is implemented; every student/parent domain endpoint in `docs/api/student-api.openapi.yaml` is spec-only. This is Phase 1 of a larger effort ("wire the client to a real, production-grade backend and remove all mock data") — auth first, since it's foundational and the backend is closest to done here.

This phase touches two repos:
- **`sms-backend`**: extend identifier resolution to add admission ID as a third lookup type.
- **`sms-student`**: rework the login screen so students can use admission ID or email, and extend the existing OTP-based set-password machine (built for parents) to also cover students.

## Current backend state (verified by reading code, not the spec doc — the spec doc is aspirational)

- `LoginController` (`src/Sms.Api/Controllers/LoginController.cs`, route `v1/auth`) exposes `login`, `refresh`, `otp/request`, `otp/verify`, `password/forgot`, `password/reset`, `set-password`, `me`, `logout` — all real, backed by `AuthService`.
- `LoginRequest` (`src/Sms.Application/DTOs/Auth/LoginModels.cs`) **already has a `StudentId` field** — it's defined but never read.
- `AuthService.LoginAsync` computes `identifier = Email ?? Phone` — `req.StudentId` is ignored (`AuthService.cs:47`).
- `AuthService.ListByIdentifierAsync` (`AuthService.cs:287-290`) branches only two ways: contains `@` → `ListByEmailAsync`, else → `ListByPhoneAsync`. This one private method backs login, OTP request/verify, and forgot/reset-password — a single change point.
- `AuthDao` has `ListByEmailAsync`/`ListByPhoneAsync` (`src/Sms.Infrastructure/DAO/AuthDao.cs`) but no `ListByAdmissionIdAsync`.
- `Users.StudentId` already stores the admission number today — confirmed by an existing comment in `StudentBusService.cs:53`: "The parent's account is tied to a single student via Users.StudentId (their admission number)." So the column and its meaning already exist; only the login-lookup path is missing.
- OTP mechanism is real and working: `OtpCodes` table, SHA256-hashed codes, delivery via `IOtpSender`/`IEmailQueue`, 10-minute expiry (`AuthService.cs:258`).
- No admission-ID format validation exists yet; phone detection is implicit (falls through when there's no `@`), so admission ID needs its own detection rule to avoid misrouting.

## Design

### Backend (`sms-backend`)

1. **`AuthDao`**: add `ListByAdmissionIdAsync(string admissionId, ct)`, querying `dbo.Users WHERE StudentId = @AdmissionId`, same shape/ordering as the existing `ListByEmailAsync`/`ListByPhoneAsync`.
2. **`AuthService.ListByIdentifierAsync`**: change from a 2-way to a 3-way branch:
   - contains `@` → email
   - matches a phone pattern (digits, optional leading `+`, length 7–15) → phone
   - otherwise → admission ID
3. **`AuthService.LoginAsync`**: change `identifier = Email ?? Phone` to `identifier = Email ?? StudentId ?? Phone`, then pass through the same `ListByIdentifierAsync`/`FindUserByPasswordAsync` path (no other changes needed — password verification, tenant resolution, and access-blocked checks are identifier-agnostic already).
4. **`RequestOtpAsync`/`ForgotPasswordAsync`/`ResetPasswordAsync`**: no code changes needed beyond the shared `ListByIdentifierAsync` fix — they already take a free-form `Identifier` string.
5. No migration needed — `Users.StudentId` is already populated and used elsewhere (transport module). Verify during implementation that it's populated for parent-linked students too, not just the student's own row.

### Client (`sms-student`)

1. **LoginScreen — student tab**: accept admission ID *or* email as the identifier (parent tab stays email-only, unchanged).
2. **Extend the existing 4-step machine** (`password → otp-request → otp-verify → set-password`, currently parent-only per `parent-login-redesign-done` memory) to the student tab, so new/forgot-password students go through the same emailed-code flow already built and working for parents. No new UI pattern — reuse the component/state machine, gate it by role where the identifier type differs.
3. **Field-name reconciliation**: current client posts `identifier` (single field) per `src/services/http/index.ts`; real backend `LoginRequest` wants discrete `Email`/`StudentId`/`Phone` fields, not one generic `identifier` string, for the login request specifically (OTP/forgot/reset endpoints do take a generic `Identifier` string, matching the client's current shape). This is the one real shape mismatch to fix — the login call needs to classify the input client-side (or just send it in one field the backend also accepts — simplest: also let backend's `LoginRequest` accept a single generic field, OR client sends the same string in whichever of `Email`/`StudentId`/`Phone` it heuristically matches). **Decision: client does the classification** (contains `@` → `Email`, digit-only → `Phone`, else → `StudentId`) before calling `/auth/login`, mirroring the backend's own detection logic so both sides agree independent of each other.
4. Remove demo-only UI: "Demo code: 123456" hint, prefilled demo Student ID (per user decision: strip all demo hints now, not gated behind full mock removal).
5. Point `apiBaseUrl` (`app.json`) at the locally-running `sms-backend` (via `docker-compose up`) for verification; the real deployed production URL is a separate, later concern (out of scope for this phase).

### Data flow (new/forgot-password, either role)

1. User enters identifier (admission ID/email for student, email for parent) → client calls `otp/request` with `{Identifier}`.
2. Backend resolves identifier via the fixed 3-way `ListByIdentifierAsync`, sends a 6-digit code to the user's registered email (existing `IOtpSender`/`IEmailQueue`), stores its SHA256 hash with a 10-minute expiry.
3. User enters the code → client calls `otp/verify` with `{Identifier, Code}` → backend returns a short-lived reset token (existing behavior, unchanged).
4. User sets password → client calls `set-password` with the reset-token-authenticated session → backend hashes and stores it (existing behavior, unchanged).
5. Subsequent logins → client classifies the identifier client-side and calls `/auth/login` with the appropriate field populated → backend's 3-way branch resolves it the same way.

### Error handling

- Unregistered admission ID/email → same 404 "not registered" pattern already implemented for email/phone (`AuthService.cs:255`), just also reachable via the admission-ID branch.
- Ambiguous input (e.g., an admission ID that happens to be all-digits and could misroute to the phone branch): mitigated by checking against a realistic phone-length/format range first; a genuine edge case worth a unit test but not a blocker for this phase.

### Testing

- Backend: unit test `ListByIdentifierAsync`'s 3-way branch (email/phone/admission-id classification) and `ListByAdmissionIdAsync` DAO query.
- End-to-end (local): `docker-compose up` in `sms-backend`, point `sms-student` at `http://localhost:<port>`, exercise:
  - student login by admission ID
  - student login by email
  - parent login by email
  - new-user set-password via emailed code (student and parent)
  - forgot-password via emailed code (student and parent)
- Client: existing jest suite for the login state machine extended to cover the student-tab OTP path; remove/update any test asserting the old demo-hint UI.

## Out of scope for this phase (tracked as later phases)

- All non-auth domain endpoints (school, students/me/today, peers, achievements, parents/me/children, children/{id}/today|fees|transport|attendance|leave, ptm) — zero backend implementation today; each is its own phase.
- Full mock-data removal across the client — only auth-related demo UI is removed now; other domains stay on flagged mock per `MOCK_BACKED` until their backend phase lands.
- Pointing at a real deployed (non-local) backend URL/host.
