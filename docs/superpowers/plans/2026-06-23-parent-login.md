# Parent Login Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace parent OTP-only sign-in with password login, where the password is created/reset through an OTP-verified flow against an admin-provisioned account.

**Architecture:** Reuse the existing `AuthService` mock/HTTP split. OTP verification now returns a short-lived **reset token** (not a session); that token authorizes `setPassword`; returning parents sign in with `signIn(identifier, password, 'parent')`. The mock stores parent passwords in an in-memory map keyed by canonical email, so the app is fully demoable before the real backend exists.

**Tech Stack:** React Native (Expo), TypeScript, react-hook-form + zod, Jest, ESLint, the project's `apiFetch`/`ApiError` plumbing.

## Global Constraints

- **Password policy:** min 8 chars, must contain letters AND digits; confirm field must match; `secureTextEntry`; never logged. (Copied verbatim from spec.)
- **Mock OTP code:** `123456` (existing `MOCK_OTP_CODE`).
- **Identifier:** single field auto-detecting mobile vs email (`@` ⇒ email, else phone); reuse `isValidIdentifier` in `LoginScreen` and `findAccount` in the mock.
- **Error → copy mapping:** 404 not registered ("contact your school"), 401 incorrect code/credentials, 409 "set up your password first", 410 code/link expired, other → generic retry.
- **No auto sign-in after set-password:** return to login screen with identifier prefilled.
- **No self-signup:** unregistered identifiers rejected at OTP request.
- **VERIFY-LIVE:** all new HTTP paths/fields are best-guess until real Swagger arrives; flag them with `VERIFY-LIVE` comments, matching the existing convention.
- **Naming note:** to keep every task's build green, the reset-verify service method is introduced as `verifyOtpForReset` (Tasks 1–3) and renamed to the spec's `verifyOtp` in Task 4 cleanup.

---

### Task 1: Service contract — reset-token verify, password store, parent password sign-in (mock + HTTP + types)

**Files:**
- Create: `src/services/auth/password.ts`
- Create: `src/services/auth/__tests__/password.test.ts`
- Modify: `src/services/types.ts:29-37` (`AuthService` — add `verifyOtpForReset`, rename `signIn` param to `identifier`)
- Modify: `src/services/mock/auth.mock.ts` (add store + `verifyOtpForReset`, password-checked parent `signIn`, token-validating `setPassword`)
- Modify: `src/services/http/index.ts:37-68` (add `verifyOtpForReset`, send `identifier` in login body)
- Test: `src/services/mock/auth.mock.test.ts` (add reset-flow + parent-signIn cases)

**Interfaces:**
- Produces:
  - `isStrongPassword(pw: string): boolean` and `PASSWORD_RULE_TEXT: string` from `@/services/auth/password`.
  - `AuthService.verifyOtpForReset(identifier: string, code: string): Promise<{ resetToken: string; expiresIn: number }>`
  - `AuthService.signIn(identifier: string, password: string, role: Role): Promise<Session>` (param renamed; behavior: mock now password-checks parents)
  - `AuthService.setPassword(args: { token: string; password: string }): Promise<void>` (mock now validates `token`)
- Consumes: existing `findAccount`, `MOCK_OTP_CODE`, `ApiError`, `db` (mock); `apiFetch`/`persistSession`, `SessionDTO` (http).

- [ ] **Step 1: Write the failing test for the password validator**

Create `src/services/auth/__tests__/password.test.ts`:

```ts
import { isStrongPassword, PASSWORD_RULE_TEXT } from '@/services/auth/password';

describe('isStrongPassword', () => {
  it('accepts 8+ chars with letters and digits', () => {
    expect(isStrongPassword('secret12')).toBe(true);
  });
  it('rejects under 8 chars', () => {
    expect(isStrongPassword('ab1')).toBe(false);
  });
  it('rejects letters-only', () => {
    expect(isStrongPassword('abcdefgh')).toBe(false);
  });
  it('rejects digits-only', () => {
    expect(isStrongPassword('12345678')).toBe(false);
  });
  it('exposes human-readable rule text', () => {
    expect(PASSWORD_RULE_TEXT).toMatch(/8/);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx jest src/services/auth/__tests__/password.test.ts`
Expected: FAIL — `Cannot find module '@/services/auth/password'`.

- [ ] **Step 3: Implement the password validator**

Create `src/services/auth/password.ts`:

```ts
// Shared password policy: min 8 chars, must contain letters AND digits.
// Used server-side (mock setPassword) and client-side (LoginScreen).
export const PASSWORD_RULE_TEXT = 'At least 8 characters, including letters and numbers.';

export function isStrongPassword(pw: string): boolean {
  return pw.length >= 8 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npx jest src/services/auth/__tests__/password.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Add `verifyOtpForReset` to the `AuthService` type and rename `signIn` param**

In `src/services/types.ts`, replace the `AuthService` interface (lines 29-37) with:

```ts
export interface AuthService {
  signIn(identifier: string, password: string, role: Role): Promise<Session>;
  signOut(): Promise<void>;
  requestOtp(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  verifyOtp(identifier: string, code: string): Promise<Session>;
  verifyOtpForReset(
    identifier: string,
    code: string,
  ): Promise<{ resetToken: string; expiresIn: number }>;
  refresh(refreshToken: string): Promise<{ access: string; refresh: string | null }>;
  setPassword(args: { token: string; password: string }): Promise<void>;
  getMe(): Promise<{ role: Role; email: string }>;
}
```

- [ ] **Step 6: Write the failing mock tests for the reset flow and parent sign-in**

In `src/services/mock/auth.mock.test.ts`, append:

```ts
import { isStrongPassword } from '@/services/auth/password'; // keep imports grouped at top in practice

describe('authMock.verifyOtpForReset', () => {
  it('returns a reset token for the correct code', async () => {
    const res = await auth.verifyOtpForReset('priya.patel@home.com', '123456');
    expect(typeof res.resetToken).toBe('string');
    expect(res.resetToken.length).toBeGreaterThan(0);
    expect(res.expiresIn).toBeGreaterThan(0);
  });
  it('throws 401 for an incorrect code', async () => {
    await expect(auth.verifyOtpForReset('priya.patel@home.com', '000000')).rejects.toMatchObject({
      status: 401,
    });
  });
  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.verifyOtpForReset('nobody@nowhere.com', '123456')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('authMock.setPassword (token-validated) + parent signIn', () => {
  it('sets a password with a valid reset token, then signs the parent in', async () => {
    const { resetToken } = await auth.verifyOtpForReset('priya.patel@home.com', '123456');
    await expect(auth.setPassword({ token: resetToken, password: 'secret12' })).resolves.toBeUndefined();
    const session = await auth.signIn('priya.patel@home.com', 'secret12', 'parent');
    expect(session).toMatchObject({ role: 'parent', email: 'priya.patel@home.com' });
  });
  it('rejects set-password with an unknown/expired token (410)', async () => {
    await expect(auth.setPassword({ token: 'bogus', password: 'secret12' })).rejects.toMatchObject({
      status: 410,
    });
  });
  it('rejects a weak password (400)', async () => {
    const { resetToken } = await auth.verifyOtpForReset('priya.patel@home.com', '123456');
    await expect(auth.setPassword({ token: resetToken, password: 'abc' })).rejects.toMatchObject({
      status: 400,
    });
  });
  it('rejects parent signIn before any password is set (409)', async () => {
    const fresh = authMock({ ms: 0 });
    await expect(fresh.signIn('priya.patel@home.com', 'secret12', 'parent')).rejects.toMatchObject({
      status: 409,
    });
  });
  it('rejects parent signIn with a wrong password (401)', async () => {
    const inst = authMock({ ms: 0 });
    const { resetToken } = await inst.verifyOtpForReset('priya.patel@home.com', '123456');
    await inst.setPassword({ token: resetToken, password: 'secret12' });
    await expect(inst.signIn('priya.patel@home.com', 'nope9999', 'parent')).rejects.toMatchObject({
      status: 401,
    });
  });
});
```

Note: delete the obsolete `setPassword resolves for token 't'` and `setPassword rejects a too-short password` cases from the existing `authMock — refresh/setPassword/getMe` describe block (they assumed token-less setPassword); the new block above replaces them.

- [ ] **Step 7: Run the mock tests to verify they fail**

Run: `npx jest src/services/mock/auth.mock.test.ts`
Expected: FAIL — `auth.verifyOtpForReset is not a function`, plus 410/409 expectations unmet.

- [ ] **Step 8: Implement the mock store, `verifyOtpForReset`, token-validated `setPassword`, and parent `signIn`**

In `src/services/mock/auth.mock.ts`, add the import and rewrite the returned object. Replace the file's body from the import block and the `authMock` function:

```ts
import type { AuthService } from '@/services/types';
import type { Role } from '@/models';
import { ApiError } from '@/services/errors';
import { isStrongPassword } from '@/services/auth/password';
import { withLatency } from './latency';
import { db } from './db';

interface Opts {
  ms?: number;
  errorRate?: number;
}

const MOCK_OTP_CODE = '123456';
const RESET_TTL_SECONDS = 600;

const normEmail = (v: string) => v.trim().toLowerCase();
const normPhone = (v: string) => v.replace(/\D/g, '');
const isEmail = (v: string) => v.includes('@');

function phonesMatch(a: string, b: string): boolean {
  const da = normPhone(a);
  const dbq = normPhone(b);
  if (da.length < 7 || dbq.length < 7) return false;
  const len = Math.min(da.length, dbq.length);
  return da.slice(-len) === dbq.slice(-len);
}

interface Match {
  role: Role;
  email: string;
  channel: 'sms' | 'email';
}

/** Look up an identifier (email or phone) against the mock DB. */
function findAccount(identifier: string): Match | null {
  if (isEmail(identifier)) {
    const email = normEmail(identifier);
    if (db.student.email.toLowerCase() === email) {
      return { role: 'student', email: db.student.email, channel: 'email' };
    }
    if (db.parent && db.parent.email.toLowerCase() === email) {
      return { role: 'parent', email: db.parent.email, channel: 'email' };
    }
    return null;
  }

  if (db.parent && phonesMatch(identifier, db.parent.phone)) {
    return { role: 'parent', email: db.parent.email, channel: 'sms' };
  }
  return null;
}

export function authMock(opts: Opts = {}): AuthService {
  // Per-instance credential store. Parent accounts are "admin-provisioned":
  // they exist in `db` but have no password until set via the reset flow.
  const resetTokens = new Map<string, string>(); // resetToken -> canonical email
  const passwords = new Map<string, string>(); //   canonical email -> password

  const delayed = async <T>(fn: () => T): Promise<T> => {
    await withLatency(undefined, opts);
    return fn();
  };

  return {
    signIn: (identifier, password, role: Role) =>
      delayed(() => {
        if (role === 'parent') {
          const match = findAccount(identifier);
          if (!match) throw new ApiError('Not registered', 404);
          const stored = passwords.get(match.email);
          if (!stored) throw new ApiError('Set up your password first', 409);
          if (stored !== password) throw new ApiError('Incorrect password', 401);
          return { token: `mock-token-parent-${Date.now()}`, role: 'parent', email: match.email };
        }
        return { token: `mock-token-${role}-${Date.now()}`, role, email: identifier };
      }),
    signOut: () => withLatency(undefined, opts),
    requestOtp: (identifier) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        return { channel: match.channel, sent: true };
      }),
    verifyOtp: (identifier, code) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        if (code !== MOCK_OTP_CODE) throw new ApiError('Incorrect or expired code', 401);
        return { token: `mock-token-${match.role}-${Date.now()}`, role: match.role, email: match.email };
      }),
    verifyOtpForReset: (identifier, code) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        if (code !== MOCK_OTP_CODE) throw new ApiError('Incorrect or expired code', 401);
        const resetToken = `reset-${match.email}-${Date.now()}`;
        resetTokens.set(resetToken, match.email);
        return { resetToken, expiresIn: RESET_TTL_SECONDS };
      }),
    refresh: () =>
      delayed(() => ({
        access: `mock-token-refreshed-${Date.now()}`,
        refresh: `mock-refresh-${Date.now()}`,
      })),
    setPassword: ({ token, password }) =>
      delayed(() => {
        const email = resetTokens.get(token);
        if (!email) throw new ApiError('Reset link expired', 410);
        if (!isStrongPassword(password)) throw new ApiError('Password is too weak', 400);
        passwords.set(email, password);
        resetTokens.delete(token);
        return undefined;
      }),
    getMe: () => delayed(() => ({ role: 'student' as const, email: db.student.email })),
  };
}
```

- [ ] **Step 9: Add `verifyOtpForReset` to the HTTP layer and switch login body to `identifier`**

In `src/services/http/index.ts`, inside the `auth` object, change `signIn` to send `identifier` and add `verifyOtpForReset` after `verifyOtp`:

```ts
    signIn: async (identifier, password, role) => {
      // VERIFY-LIVE: confirm login body field name (`identifier`) against Swagger.
      const dto = await post<SessionDTO>('/auth/login', { identifier, password, role });
      await persistSession(dto);
      return toSession(dto);
    },
```

```ts
    // VERIFY-LIVE: confirm /auth/otp/verify returns { reset_token, expires_in }.
    verifyOtpForReset: async (identifier, code) => {
      const dto = await post<{ reset_token: string; expires_in: number }>('/auth/otp/verify', {
        identifier,
        code,
      });
      return { resetToken: dto.reset_token, expiresIn: dto.expires_in };
    },
```

Leave the existing `verifyOtp` (returns a `Session`) in place for now — Task 4 removes it.

- [ ] **Step 10: Run the full mock suite and type-check**

Run: `npx jest src/services/mock/auth.mock.test.ts src/services/auth/__tests__/password.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: only the 1 pre-existing `App.tsx` error (per project memory); no new errors.

- [ ] **Step 11: Commit**

```bash
git add src/services/auth/password.ts src/services/auth/__tests__/password.test.ts src/services/types.ts src/services/mock/auth.mock.ts src/services/mock/auth.mock.test.ts src/services/http/index.ts
git commit -m "feat(student): OTP-verified password reset + parent password sign-in (service+mock)"
```

---

### Task 2: Provider — expose `verifyResetCode`

**Files:**
- Modify: `src/providers/AuthProvider.tsx:8-17` (context type) and `:77-101` (value)

**Interfaces:**
- Consumes: `services.auth.verifyOtpForReset`, `services.auth.setPassword`, `services.auth.signIn` (from Task 1).
- Produces (on the `useAuth()` context):
  - `verifyResetCode(identifier: string, code: string): Promise<{ resetToken: string; expiresIn: number }>`
  - `signIn`, `requestOtp`, `setPassword` (unchanged signatures; `setPassword` takes `{ token, password }`).
  - `signInWithOtp` stays for now (removed in Task 4).

- [ ] **Step 1: Add `verifyResetCode` to the context type**

In `src/providers/AuthProvider.tsx`, add to `AuthContextValue` (after the `requestOtp` line):

```ts
  verifyResetCode: (identifier: string, code: string) => Promise<{ resetToken: string; expiresIn: number }>;
```

- [ ] **Step 2: Implement `verifyResetCode` in the context value**

In the `useMemo` value object, add after the `requestOtp` entry:

```ts
      verifyResetCode: (identifier, code) => services.auth.verifyOtpForReset(identifier, code),
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: only the 1 pre-existing `App.tsx` error; no new errors. (`signInWithOtp` and `setPassword` remain valid; `LoginScreen` still compiles.)

- [ ] **Step 4: Run the existing auth/provider suite**

Run: `npx jest src/providers`
Expected: PASS (existing `authReducer.test.ts` unaffected).

- [ ] **Step 5: Commit**

```bash
git add src/providers/AuthProvider.tsx
git commit -m "feat(student): expose verifyResetCode on auth context"
```

---

### Task 3: LoginScreen — parent password login + OTP-to-reset state machine

**Files:**
- Modify: `src/screens/LoginScreen.tsx` (rewrite the parent branch; add states + handlers)

**Interfaces:**
- Consumes: `useAuth()` → `signIn`, `requestOtp`, `verifyResetCode`, `setPassword`; `isValidIdentifier`; `isStrongPassword`, `PASSWORD_RULE_TEXT` from `@/services/auth/password`; `ApiError`.
- Produces: no exported API change (same `LoginScreen` component).

- [ ] **Step 1: Replace the parent state, handlers, and JSX**

In `src/screens/LoginScreen.tsx`:

(a) Update the auth + imports near the top:

```ts
import { isStrongPassword, PASSWORD_RULE_TEXT } from '@/services/auth/password';
```

```ts
  const { signIn, requestOtp, verifyResetCode, setPassword } = useAuth();
```

(b) Replace the parent state block (the `otpStep`/`identifier`/`code`/`otpLoading`/`otpError`/`sentChannel` declarations and `resetOtp`/`switchRole` through `verifyCode`) with this expanded state machine:

```ts
  // --- Parent: password login + OTP-to-set-password reset flow ---
  type ParentStep = 'password' | 'otp-request' | 'otp-verify' | 'set-password';
  const [parentStep, setParentStep] = useState<ParentStep>('password');
  const [identifier, setIdentifier] = useState('');
  const [parentPassword, setParentPassword] = useState('');
  const [code, setCode] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [parentLoading, setParentLoading] = useState(false);
  const [parentError, setParentError] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<'sms' | 'email' | null>(null);

  const resetParentFlow = () => {
    setParentStep('password');
    setCode('');
    setResetToken('');
    setNewPassword('');
    setConfirmPassword('');
    setParentError(null);
    setSentChannel(null);
  };

  const switchRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    resetParentFlow();
    setNotice(null);
  };

  const mapAuthError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 404)
        return 'No account is registered for this email/mobile. Contact your school to get set up.';
      if (err.status === 401) return 'Incorrect code or password. Try again.';
      if (err.status === 409) return 'No password yet — use "First time or forgot password?" below.';
      if (err.status === 410) return 'That code expired. Request a new one.';
    }
    return 'Something went wrong. Please try again.';
  };

  const parentLogin = async () => {
    if (!isValidIdentifier(identifier)) {
      setParentError('Enter a valid mobile number or email.');
      return;
    }
    if (parentPassword.length === 0) {
      setParentError('Enter your password.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      await signIn(identifier.trim(), parentPassword, 'parent');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };

  const sendCode = async () => {
    if (!isValidIdentifier(identifier)) {
      setParentError('Enter a valid mobile number or email.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      const res = await requestOtp(identifier.trim());
      setSentChannel(res.channel);
      setCode('');
      setParentStep('otp-verify');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };

  const verifyCode = async () => {
    if (code.trim().length < 6) {
      setParentError('Enter the 6-digit code we sent you.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      const { resetToken: token } = await verifyResetCode(identifier.trim(), code.trim());
      setResetToken(token);
      setNewPassword('');
      setConfirmPassword('');
      setParentStep('set-password');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };

  const submitNewPassword = async () => {
    if (!isStrongPassword(newPassword)) {
      setParentError(PASSWORD_RULE_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setParentError('Passwords do not match.');
      return;
    }
    setParentLoading(true);
    setParentError(null);
    try {
      await setPassword({ token: resetToken, password: newPassword });
      // Do NOT auto sign-in: send them back to login with identifier prefilled.
      setParentPassword('');
      resetParentFlow();
      setNotice('Password set — please log in with your new password.');
    } catch (err) {
      setParentError(mapAuthError(err));
    } finally {
      setParentLoading(false);
    }
  };
```

(c) Replace the parent JSX branch (everything rendered when `isParent`, i.e. the `otpStep === 'idle' ? (...) : (...)` block) with the four-step machine:

```tsx
            ) : parentStep === 'password' ? (
              <View style={styles.otpBlock}>
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                <Text style={styles.label}>Parent email or number</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="priya.patel@home.com or 415 555 0142"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={parentPassword}
                  onChangeText={(t) => {
                    setParentPassword(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button variant="primary" size="lg" full loading={parentLoading} onPress={parentLogin}>
                  Log in
                </Button>
                <Pressable
                  onPress={() => {
                    setNotice(null);
                    setParentError(null);
                    setParentStep('otp-request');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.otpLink}>First time or forgot password?</Text>
                </Pressable>
              </View>
            ) : parentStep === 'otp-request' ? (
              <View style={styles.otpBlock}>
                <Text style={styles.label}>Parent email or number</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="priya.patel@home.com or 415 555 0142"
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button variant="primary" size="lg" full loading={parentLoading} onPress={sendCode}>
                  Send code
                </Button>
                <Pressable onPress={resetParentFlow} hitSlop={8}>
                  <Text style={styles.otpLink}>Back to login</Text>
                </Pressable>
              </View>
            ) : parentStep === 'otp-verify' ? (
              <View style={styles.otpBlock}>
                <Text style={styles.otpSentTo}>
                  Code sent via {sentChannel === 'sms' ? 'SMS' : 'email'} to{' '}
                  <Text style={styles.helpStrong}>{identifier.trim()}</Text>
                </Text>
                <Text style={styles.devHint}>Demo code: 123456</Text>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\D/g, ''));
                    if (parentError) setParentError(null);
                  }}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button variant="primary" size="lg" full loading={parentLoading} onPress={verifyCode}>
                  Verify code
                </Button>
                <View style={styles.otpActions}>
                  <Pressable onPress={sendCode} disabled={parentLoading} hitSlop={8}>
                    <Text style={styles.otpLink}>Resend code</Text>
                  </Pressable>
                  <Pressable onPress={resetParentFlow} disabled={parentLoading} hitSlop={8}>
                    <Text style={styles.otpLink}>Back to login</Text>
                  </Pressable>
                </View>
              </View>
            ) : (
              <View style={styles.otpBlock}>
                <Text style={styles.otpSentTo}>Create your password</Text>
                <Text style={styles.devHint}>{PASSWORD_RULE_TEXT}</Text>
                <Text style={styles.label}>New password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                <Text style={styles.label}>Confirm password</Text>
                <TextInput
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    if (parentError) setParentError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                {parentError ? <Text style={styles.error}>{parentError}</Text> : null}
                <Button
                  variant="primary"
                  size="lg"
                  full
                  loading={parentLoading}
                  onPress={submitNewPassword}
                >
                  Set password
                </Button>
                <Pressable onPress={resetParentFlow} disabled={parentLoading} hitSlop={8}>
                  <Text style={styles.otpLink}>Back to login</Text>
                </Pressable>
              </View>
            )}
```

(d) Add a `notice` style to the `StyleSheet.create` block (next to `error`):

```ts
  notice: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
  },
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: only the 1 pre-existing `App.tsx` error; no new errors. (Note: `signInWithOtp` is no longer referenced here but still exists on the context, so this compiles.)

- [ ] **Step 3: Lint**

Run: `npx eslint src/screens/LoginScreen.tsx`
Expected: 0 errors. (Remove any now-unused imports/vars flagged.)

- [ ] **Step 4: Verify the screen builds**

Run: `npx expo export --platform web`
Expected: exit 0 (bundles successfully).

- [ ] **Step 5: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat(student): parent password login + OTP-to-reset flow in LoginScreen"
```

---

### Task 4: Cleanup — remove legacy OTP-sign-in path, rename to spec

**Files:**
- Modify: `src/services/types.ts` (`AuthService`: drop `verifyOtp`, rename `verifyOtpForReset` → `verifyOtp`)
- Modify: `src/services/mock/auth.mock.ts` (drop legacy `verifyOtp`, rename `verifyOtpForReset` → `verifyOtp`)
- Modify: `src/services/http/index.ts` (drop legacy `verifyOtp`, rename `verifyOtpForReset` → `verifyOtp`)
- Modify: `src/providers/AuthProvider.tsx` (remove `signInWithOtp`; `verifyResetCode` now calls `verifyOtp`)
- Modify: `src/services/mock/auth.mock.test.ts` (drop obsolete `verifyOtp` sign-in tests; rename reset-flow calls)

**Interfaces:**
- Produces: final `AuthService.verifyOtp(identifier, code): Promise<{ resetToken: string; expiresIn: number }>`; `useAuth()` no longer exposes `signInWithOtp`.

- [ ] **Step 1: Confirm `signInWithOtp` has no remaining callers**

Run: `git grep -n "signInWithOtp" -- src` (PowerShell: `Select-String -Path src -Pattern signInWithOtp -Recurse`).
Expected: only `src/providers/AuthProvider.tsx`. If `LoginScreen` still references it, Task 3 is incomplete — stop and fix.

- [ ] **Step 2: Collapse `verifyOtpForReset` into `verifyOtp` in the type**

In `src/services/types.ts`, remove the old `verifyOtp(...): Promise<Session>` line and rename `verifyOtpForReset` to `verifyOtp`:

```ts
  verifyOtp(identifier: string, code: string): Promise<{ resetToken: string; expiresIn: number }>;
```

(Delete the now-duplicate/legacy `verifyOtp` returning `Session`; ensure only one `verifyOtp` remains.)

- [ ] **Step 3: Collapse in the mock**

In `src/services/mock/auth.mock.ts`, delete the legacy `verifyOtp:` property (the one returning a token/`Session`) and rename the `verifyOtpForReset:` property to `verifyOtp:`.

- [ ] **Step 4: Collapse in the HTTP layer**

In `src/services/http/index.ts`, delete the legacy `verifyOtp:` (the one doing `persistSession` → `toSession`) and rename `verifyOtpForReset:` to `verifyOtp:`.

- [ ] **Step 5: Remove `signInWithOtp` and repoint `verifyResetCode`**

In `src/providers/AuthProvider.tsx`:
- Delete the `signInWithOtp` line from `AuthContextValue`.
- Delete the `signInWithOtp: async (identifier, code) => {...}` block from the value.
- Change `verifyResetCode` to call the renamed method:

```ts
      verifyResetCode: (identifier, code) => services.auth.verifyOtp(identifier, code),
```

- [ ] **Step 6: Update the mock tests**

In `src/services/mock/auth.mock.test.ts`:
- Delete the `describe('authMock.verifyOtp', ...)` block that asserts a `Session`/sign-in (the legacy behavior).
- In the block added in Task 1, rename every `auth.verifyOtpForReset(` / `inst.verifyOtpForReset(` / `fresh.verifyOtpForReset(` call to `verifyOtp(`, and rename the `describe('authMock.verifyOtpForReset', ...)` title to `describe('authMock.verifyOtp', ...)`.

- [ ] **Step 7: Type-check, lint, and run the full suite**

Run: `npx tsc --noEmit`
Expected: only the 1 pre-existing `App.tsx` error; no new errors.
Run: `npx eslint src`
Expected: 0 errors.
Run: `npx jest`
Expected: PASS (live-smoke tests remain skipped without `LIVE_API`).

- [ ] **Step 8: Verify the web bundle**

Run: `npx expo export --platform web`
Expected: exit 0.

- [ ] **Step 9: Commit**

```bash
git add src/services/types.ts src/services/mock/auth.mock.ts src/services/http/index.ts src/providers/AuthProvider.tsx src/services/mock/auth.mock.test.ts
git commit -m "refactor(student): retire OTP sign-in path; verifyOtp returns reset token"
```

---

## Self-Review

**Spec coverage:**
- Returning login (identifier + password) → Task 1 (mock parent `signIn`, http login body) + Task 3 (password step). ✓
- OTP-to-reset flow (request → verify → set password → back to login) → Task 1 (service), Task 2 (`verifyResetCode`), Task 3 (UI). ✓
- Not-registered 404 copy → Task 1 (mock 404) + Task 3 (`mapAuthError`). ✓
- OTP authorizes set, not session → Task 1 (`verifyOtpForReset` returns token) + Task 4 (legacy `verifyOtp` removed). ✓
- No auto sign-in after set-password → Task 3 (`submitNewPassword` routes back to `password`). ✓
- Production endpoint contract + VERIFY-LIVE flags → Task 1 (http). ✓
- Mock works today (admin-provisioned, password-less accounts) → Task 1 (per-instance store). ✓
- Password policy (min 8, letters+digits, confirm, secure, never logged) → Task 1 (`isStrongPassword`) + Task 3 (confirm + secureTextEntry). ✓
- Error mapping (404/401/409/410) → Task 3 (`mapAuthError`). ✓
- Testing (requestOtp, verify, setPassword, parent signIn) → Task 1 tests. ✓
- Student login unchanged → mock `signIn` keeps the non-parent branch; Student JSX branch untouched. ✓
- Resend cooldown — **deferred**: spec lists a 30s client cooldown as a "blunt OTP spam" nicety; not implemented in these tasks to keep scope tight (Resend is present without a timer). Flagged here so it isn't mistaken for covered. Add a follow-up task if desired.

**Placeholder scan:** No TBD/TODO; every code step shows full code. ✓

**Type consistency:** `verifyOtpForReset`/`verifyOtp` return `{ resetToken, expiresIn }` consistently across types/mock/http/provider; `setPassword` takes `{ token, password }` everywhere; `signIn(identifier, password, role)` consistent. ✓

## Out of Scope

Student login, real SMS/email gateway, server-side rate-limiting/lockout/audit, admin panel account creation, the 30s resend cooldown (see self-review note).
