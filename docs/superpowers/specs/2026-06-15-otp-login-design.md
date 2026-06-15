# Mobile/Email OTP Login — Design

Date: 2026-06-15
Status: Approved

## Goal

Add an OTP-based sign-in option below the existing Student-ID + password card on
`LoginScreen`. The user enters a **mobile number or email**; the app checks
whether that identifier already exists in the database. If it exists, an OTP is
"sent" and the user verifies it to sign in. If it does **not** exist, the app
shows *"Not registered"* and does **not** create an account (no signup path).

## Decisions

- **Identifier:** single field, auto-detects mobile vs email (`@` ⇒ email, else phone).
- **Delivery:** mock now (fixed code `123456`, surfaced on-screen as a dev hint),
  plus real HTTP endpoints defined for a future backend.
- **Not found:** inline *"Not registered — contact your school"*, no signup.
- **Role:** derived from the matched record (student vs parent), not chosen by the user.

## Service layer

Extend `AuthService` (`src/services/types.ts`):

```ts
requestOtp(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
verifyOtp(identifier: string, code: string): Promise<Session>;
```

### Mock (`src/services/mock/auth.mock.ts`)
- `requestOtp`: normalize identifier (trim, lowercase email; strip non-digits for
  phone). Look up against `db.student.email`, `db.parent.email`, `db.parent.phone`.
  - Not found → throw `ApiError('Not registered', 404)`.
  - Found → `{ channel, sent: true }` (`channel` = `'email'` or `'sms'`).
- `verifyOtp`: code must equal `123456` → return `Session` with the matched
  record's `role` and `email`; else throw `ApiError('Incorrect or expired code', 401)`.

### HTTP (`src/services/http/index.ts`)
- `requestOtp` → `POST /auth/otp/request` `{ identifier }`.
- `verifyOtp` → `POST /auth/otp/verify` `{ identifier, code }` → `toSession`.

## Provider

`AuthProvider` exposes `signInWithOtp(identifier, code)` that wraps
`services.auth.verifyOtp` → `setAuthToken` → `dispatch SIGNED_IN`, keeping the
provider the single source of session truth.

## UI / state (`LoginScreen`)

Below the password card, an **"or sign in with OTP"** block with a small local
state machine: `step: 'idle' | 'sent'`, plus `identifier`, `code`, `loading`,
`error`, and (dev) `sentChannel`.

- **idle:** one input (mobile or email) + **Send code**. Zod gate: looks like an
  email OR a 7–15 digit phone. On send → `requestOtp`; 404 → "Not registered";
  success → `step = 'sent'`.
- **sent:** 6-digit code input + **Verify & sign in**, plus **Resend** and
  **Change number/email** (returns to idle). On verify → `signInWithOtp`.

Reuses existing `Button`, theme tokens, and input styles. Errors render inline.

## Error handling

`ApiError` statuses map to inline copy: 404 → "Not registered — contact your
school", 401 → "Incorrect or expired code", other → generic retry message. No
crashes.

## Testing

Mock unit tests (`auth.mock.test.ts`):
- `requestOtp` found via student email, parent email, parent phone (with spacing/
  case normalization); not-found throws 404.
- `verifyOtp` correct code returns session with derived role/email; wrong code
  throws 401.
