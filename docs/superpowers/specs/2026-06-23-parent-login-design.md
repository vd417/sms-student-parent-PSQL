# Parent Login Redesign — Design

Date: 2026-06-23
Status: Approved (pending implementation)
Branch context: `field-alignment-canonical`

## Goal

Replace the parent **OTP-only sign-in** with a **password login**, where the
password is created/reset through an **OTP-verified flow** and the parent account
itself is **provisioned by the admin** (no self-signup). Define the
production-grade HTTP contract now and ship a working mock, consistent with the
codebase's existing mock/HTTP split.

Student login is unchanged (Student ID + password).

## Flow

### Returning login (default parent screen)
1. Parent enters **email or mobile** + **password**.
2. `signIn(identifier, password, 'parent')` → `Session` → dashboard.
3. Wrong password → 401 inline error. Identifier not registered → 404
   "contact your school".

### First-time setup / Forgot password (one shared flow)
1. Parent enters **email or mobile**.
2. System checks it is **registered in the admin DB**. Not found → inline
   *"No account is registered for this email/mobile. Contact your school."*
   (no account is created).
3. Registered → **send OTP** to that mobile/email.
4. Parent **verifies OTP** → receives a short-lived **reset token**.
5. Parent **sets a new password** (with confirm + strength rules).
6. On success → **return to the login screen** with a "Password set — please log
   in" notice and the identifier prefilled. Parent logs in with the new password.

The same flow serves both first-time setup (no password yet) and forgot-password
(password exists, being replaced). "New password takes reference from admin" =
the parent identity/record is admin-provisioned; the password is set by the parent
via this OTP-verified flow.

## Decisions

- **Identifier:** single field, auto-detects mobile vs email (`@` ⇒ email, else
  phone), reusing `isValidIdentifier` in `LoginScreen`.
- **OTP authorizes a password set, not a session.** This is the key behavior
  change from the prior OTP-login design — `verifyOtp` no longer returns a
  `Session`.
- **Post-set-password:** return to login screen (do NOT auto sign-in), so the new
  password is exercised once.
- **No self-signup:** unregistered identifiers are rejected at OTP request.
- **Mock now + production contract defined**, so the app is demoable today and a
  config flip away from live (matches the `MOCK_BACKED` convention).

## Service layer (`src/services/types.ts`, `AuthService`)

Reuse existing methods; one behavior change on `verifyOtp`:

```ts
requestOtp(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
verifyOtp(identifier: string, code: string): Promise<{ resetToken: string; expiresIn: number }>; // CHANGED: was Promise<Session>
setPassword(args: { token: string; password: string }): Promise<void>; // exists
signIn(identifier: string, password: string, role: Role): Promise<Session>; // reused for returning parent login
```

`AuthProvider`:
- Add/adjust: `requestOtp`, `verifyResetCode(identifier, code)` (wraps `verifyOtp`,
  holds `resetToken` in flow state), `setNewPassword(password)` (wraps
  `setPassword`).
- **Remove** `signInWithOtp` (OTP→session path no longer exists).
- `signIn` continues to back the returning-login path.

## Production endpoint contract (HTTP layer, `src/services/http/index.ts`)

All paths flagged `VERIFY-LIVE` until a real Swagger arrives.

| Method & path             | Body                              | Success            | Errors                                  |
|---------------------------|-----------------------------------|--------------------|-----------------------------------------|
| `POST /auth/otp/request`  | `{ identifier }`                  | `{ channel, sent }`| 404 not registered                      |
| `POST /auth/otp/verify`   | `{ identifier, code }`            | `{ resetToken, expiresIn }` | 401 bad/expired code           |
| `POST /auth/set-password` | `{ resetToken, password }`        | `204`              | 410 expired token, 400 weak password    |
| `POST /auth/login`        | `{ identifier, password, role }`  | `Session`          | 401 bad creds, 404 not registered       |

## Mock layer (`src/services/mock/auth.mock.ts`)

- Parent records exist in the mock DB **without a password** (admin-provisioned).
  Passwords stored in an in-memory `Map<identifier, password>`.
- `requestOtp`: normalize identifier; look up `db.parent.email` / `db.parent.phone`
  (and student email for the unchanged student path). Not found → `ApiError(404)`.
- `verifyOtp`: `code === '123456'` → return `{ resetToken: 'reset-<identifier>',
  expiresIn: 600 }`; else `ApiError('Incorrect or expired code', 401)`.
- `setPassword`: validate `resetToken` matches an outstanding request → store
  password in the map; bad/expired token → `ApiError(410)`.
- `signIn` (parent): no password set yet → `ApiError('Set up your password first',
  409)`; wrong password → `ApiError(401)`; match → `Session` with derived role.

## UI (`src/screens/LoginScreen.tsx`, parent tab)

Parent sub-state machine: `password` → `otp-request` → `otp-verify` →
`set-password` → (`password`).

- **`password` (default):** identifier + password inputs + **Log in**, plus a
  **"First time or forgot password?"** link → `otp-request`.
- **`otp-request`:** identifier input + **Send code** (reuses validation).
- **`otp-verify`:** 6-digit code + **Verify**, with **Resend** (30s cooldown) and
  **Change number/email**.
- **`set-password`:** new password + confirm password (both `secureTextEntry`) +
  **Set password**; inline strength/match errors.
- On set-password success → toast/notice "Password set — please log in", route to
  `password` with identifier prefilled.
- Switching role or "back to login" resets the sub-state.

Error mapping (extends existing `mapAuthError`): 404 → not registered, 401 →
incorrect code/credentials, 409 → set up password first, 410 → code/link expired,
other → generic retry.

## Password policy ("careful password")

- Minimum 8 characters, must contain letters **and** digits.
- Confirm field must match.
- `secureTextEntry` on both inputs; password never logged or echoed.
- Client-side **resend cooldown** (30s) to blunt OTP spam.
- Server-side rate-limiting / lockout / OTP expiry enforcement is the backend's
  responsibility (noted, not built here).

## Testing

- **Mock unit tests** (`auth.mock.test.ts`):
  - `requestOtp`: found (parent email, parent phone, normalized) / not-found (404).
  - `verifyOtp`: correct code → resetToken / wrong code → 401.
  - `setPassword`: valid token → stored / bad-or-expired token → 410.
  - `signIn` (parent): correct password → Session / wrong password → 401 /
    no-password-set → 409.
- **Provider/reducer tests:** new flow-state transitions (request → verify → set →
  back to login); ensure `signInWithOtp` removal doesn't break callers.

## Out of scope

- Student login (unchanged).
- Real SMS/email OTP delivery gateway (backend).
- Server-side rate-limiting, lockout, audit logging.
- Admin panel / account creation (separate system — the "reference" source).
