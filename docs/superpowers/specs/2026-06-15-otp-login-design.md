# Role-Based Login — Design

Date: 2026-06-15
Status: Implemented

## Goal

The login method depends on the selected role:

- **Student** → Student ID + password (unchanged).
- **Parent** → mobile number or email + OTP (no password).

If the entered parent identifier is not found in the database, show
*"Not registered — contact your school."* and do **not** create an account.

## Decisions

- **Parent identifier:** single field, auto-detects mobile vs email (`@` ⇒ email, else phone).
- **OTP delivery:** mock now (fixed code `123456`, shown on-screen as a dev hint),
  plus real HTTP endpoints defined for a future backend.
- **Not found:** inline *"Not registered — contact your school"*, no signup.
- **Role on verify:** derived from the matched record (student vs parent).

## Service layer

`AuthService` (`src/services/types.ts`):

```ts
requestOtp(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
verifyOtp(identifier: string, code: string): Promise<Session>;
```

### Mock (`src/services/mock/auth.mock.ts`)
- `requestOtp`: normalize identifier (trim, lowercase email; strip non-digits for
  phone, matched on trailing digits to tolerate a country code). Look up against
  `db.student.email`, `db.parent.email`, `db.parent.phone`.
  - Not found → throw `ApiError('Not registered', 404)`.
  - Found → `{ channel, sent: true }`.
- `verifyOtp`: code must equal `123456` → `Session` with the matched record's
  `role`/`email`; else `ApiError('Incorrect or expired code', 401)`.

### HTTP (`src/services/http/index.ts`)
- `requestOtp` → `POST /auth/otp/request` `{ identifier }`.
- `verifyOtp` → `POST /auth/otp/verify` `{ identifier, code }` → `toSession`.

## Provider

`AuthProvider` exposes `requestOtp(identifier)` and `signInWithOtp(identifier, code)`
(wraps `verifyOtp` → `setAuthToken` → dispatch `SIGNED_IN`).

## UI (`LoginScreen`)

Role toggle drives the form:

- **Student:** existing `react-hook-form` Student ID + password + Sign in.
- **Parent:** local state machine `otpStep: 'idle' | 'sent'`.
  - idle → "Parent email or number" input + **Send code**.
  - sent → 6-digit code input + **Verify & sign in**, with **Resend** and
    **Change number/email**. Switching role resets the OTP step.

`ApiError` statuses map to inline copy: 404 → "Not registered", 401 → "Incorrect
or expired code", other → generic retry.

## Testing

Mock unit tests (`auth.mock.test.ts`): `requestOtp` found (student email, parent
email, parent phone, normalized) / not-found (404); `verifyOtp` correct (role/email
derived) / wrong code (401) / unknown identifier (404).
