# Admission-ID Login + Corrected Password-Reset Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let students log in with admission ID or email (parents stay email-only), and replace the client's broken 4-step OTP/set-password flow with the 3-step flow the real `sms-backend` actually implements — for both roles.

**Architecture:** Backend (`sms-backend`, .NET): extend the single private identifier-resolution method used by all auth actions to recognize admission IDs as a third identifier type, and thread it through `LoginRequest`. No new endpoints — `/auth/password/forgot` and `/auth/password/reset` already do what's needed; the client was just calling the wrong endpoints (`otp/request`/`otp/verify`/`set-password`) for this flow. Client (`sms-student`): extract identifier classification into a small testable module reused by both the login-request builder and the login screen; collapse the auth service surface from 5 reset-related methods to 2 (`requestPasswordReset`, `resetPassword`); unify the previously parent-only reset UI to serve both roles.

**Tech Stack:** Backend: C# / .NET, xUnit + FluentAssertions, Dapper, FluentMigrator. Client: TypeScript / React Native (Expo), Jest, react-hook-form + zod (being removed from LoginScreen — see Task 6).

## Global Constraints

- Backend JSON casing is **snake_case** globally (`SnakeCaseNamingPolicy`, `Sms.Api/Extensions/ServiceCollectionExtensions.cs:51-62`) with case-insensitive matching — case-insensitivity does NOT bridge `studentId` (camelCase) vs `student_id` (snake_case); the client must send the exact snake_case key.
- `Users.StudentId` already stores the admission number today (confirmed via `Sms.Application/Services/Transport/StudentBusService.cs:53` comment) — no new column or migration needed.
- No backend changes are needed for `/auth/password/forgot` or `/auth/password/reset` — both already accept a free-form `Identifier` string via the same resolution path Task 3 fixes.
- Do not touch `/auth/otp/request`, `/auth/otp/verify`, or `/auth/set-password` — after this plan, no client code calls them for the reset flow (`otp/verify` logs a user in directly; `set-password` requires an existing bearer token — neither fits "forgot/first-time password").
- Client screens are verified via `npx expo export --platform web --output-dir ._tmp` (exit 0, then delete the dir) per project convention — there is no screen-level unit test suite to extend.

---

### Task 1: Backend — `IdentifierClassifier` (email / phone / admission ID)

**Files:**
- Create: `src/Sms.Application/Services/Auth/IdentifierClassifier.cs`
- Test: `tests/Sms.Tests.Unit/Auth/IdentifierClassifierTests.cs`

**Interfaces:**
- Produces: `enum IdentifierKind { Email, Phone, AdmissionId }` and `static class IdentifierClassifier { static IdentifierKind Classify(string identifier); }` — consumed by Task 3.

- [ ] **Step 1: Write the failing tests**

```csharp
using FluentAssertions;
using Sms.Application.Services.Auth;
using Xunit;

namespace Sms.Tests.Unit.Auth;

public class IdentifierClassifierTests
{
    [Theory]
    [InlineData("maya@wba.edu")]
    [InlineData("priya.patel@home.com")]
    public void Classifies_email(string identifier) =>
        IdentifierClassifier.Classify(identifier).Should().Be(IdentifierKind.Email);

    [Theory]
    [InlineData("4155550142")]
    [InlineData("+91 98765 43210")]
    [InlineData("(415) 555-0142")]
    public void Classifies_phone(string identifier) =>
        IdentifierClassifier.Classify(identifier).Should().Be(IdentifierKind.Phone);

    [Theory]
    [InlineData("WBA-2024-1042")]
    [InlineData("STU2024001")]
    [InlineData("12A")]
    public void Classifies_admission_id(string identifier) =>
        IdentifierClassifier.Classify(identifier).Should().Be(IdentifierKind.AdmissionId);
}
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Sms.Tests.Unit/Sms.Tests.Unit.csproj --filter FullyQualifiedName~IdentifierClassifierTests`
Expected: FAIL — `IdentifierClassifier` / `IdentifierKind` do not exist (compile error).

- [ ] **Step 3: Write the implementation**

```csharp
namespace Sms.Application.Services.Auth;

public enum IdentifierKind { Email, Phone, AdmissionId }

public static class IdentifierClassifier
{
    public static IdentifierKind Classify(string identifier)
    {
        if (identifier.Contains('@')) return IdentifierKind.Email;

        var digits = new string(identifier.Where(char.IsDigit).ToArray());
        var hasOnlyPhonePunctuation = identifier.All(c =>
            char.IsDigit(c) || char.IsWhiteSpace(c) || c is '+' or '-' or '(' or ')');

        if (hasOnlyPhonePunctuation && digits.Length is >= 7 and <= 15)
            return IdentifierKind.Phone;

        return IdentifierKind.AdmissionId;
    }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test tests/Sms.Tests.Unit/Sms.Tests.Unit.csproj --filter FullyQualifiedName~IdentifierClassifierTests`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add src/Sms.Application/Services/Auth/IdentifierClassifier.cs tests/Sms.Tests.Unit/Auth/IdentifierClassifierTests.cs
git commit -m "feat(auth): add IdentifierClassifier for email/phone/admission-id"
```

---

### Task 2: Backend — `AuthDao.ListByAdmissionIdAsync`

**Files:**
- Modify: `src/Sms.Application/Interfaces/DAO/IAuthDao.cs`
- Modify: `src/Sms.Infrastructure/DAO/AuthDao.cs`
- Test: `tests/Sms.Tests.Integration/Auth/AuthRepositoryTests.cs` (append)

**Interfaces:**
- Consumes: nothing new.
- Produces: `Task<IReadOnlyList<UserRecord>> IAuthDao.ListByAdmissionIdAsync(string admissionId, CancellationToken ct = default)` — consumed by Task 3.

- [ ] **Step 1: Write the failing integration test**

Append to `tests/Sms.Tests.Integration/Auth/AuthRepositoryTests.cs` (inside the existing `AuthRepositoryTests` class, after `GetByEmail_returns_seeded_user`):

```csharp
    [Fact]
    public async Task ListByAdmissionId_returns_seeded_user()
    {
        var factory = PlatformFactory();
        var admissionId = $"WBA-{Guid.NewGuid():N}".Substring(0, 16);
        await using (var c = await factory.OpenAsync())
            await c.ExecuteAsync(
                "INSERT dbo.Users (Id, StudentId, PasswordHash, IsPlatform) VALUES (NEWID(),@sid,'h',1)",
                new { sid = admissionId });

        var dao = new Sms.Infrastructure.DAO.AuthDao(factory);
        var rows = await dao.ListByAdmissionIdAsync(admissionId);
        rows.Should().ContainSingle(u => u.StudentId == admissionId);
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Sms.Tests.Integration/Sms.Tests.Integration.csproj --filter FullyQualifiedName~ListByAdmissionId_returns_seeded_user`
Expected: FAIL — compile error, `ListByAdmissionIdAsync` does not exist on `AuthDao`.
(This requires a reachable SQL Server — set `SMS_TEST_SQL_CONNECTION` env var if the default `DESKTOP-TJL4SG6` trusted-connection server isn't available locally; this matches the existing integration-test setup, no new requirement.)

- [ ] **Step 3: Add the interface method**

In `src/Sms.Application/Interfaces/DAO/IAuthDao.cs`, add after `ListByPhoneAsync`:

```csharp
    Task<IReadOnlyList<UserRecord>> ListByAdmissionIdAsync(string admissionId, CancellationToken ct = default);
```

- [ ] **Step 4: Implement it in `AuthDao`**

In `src/Sms.Infrastructure/DAO/AuthDao.cs`, add after `ListByPhoneAsync`:

```csharp
    public Task<IReadOnlyList<UserRecord>> ListByAdmissionIdAsync(string admissionId, CancellationToken ct = default) =>
        QueryInlineAsync<UserRecord>(
            "SELECT Id, TenantId, Email, StudentId, Phone, PasswordHash, IsPlatform, Status " +
            "FROM dbo.Users WHERE StudentId = @AdmissionId " +
            "ORDER BY CASE WHEN IsPlatform = 1 THEN 0 ELSE 1 END, CreatedAt",
            new { AdmissionId = admissionId }, ct);
```

- [ ] **Step 5: Run test to verify it passes**

Run: `dotnet test tests/Sms.Tests.Integration/Sms.Tests.Integration.csproj --filter FullyQualifiedName~ListByAdmissionId_returns_seeded_user`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/Sms.Application/Interfaces/DAO/IAuthDao.cs src/Sms.Infrastructure/DAO/AuthDao.cs tests/Sms.Tests.Integration/Auth/AuthRepositoryTests.cs
git commit -m "feat(auth): add AuthDao.ListByAdmissionIdAsync"
```

---

### Task 3: Backend — wire `AuthService` to the 3-way identifier resolution

**Files:**
- Modify: `src/Sms.Application/Services/Auth/AuthService.cs:45-49` (`LoginAsync`), `:287-290` (`ListByIdentifierAsync`)
- Test: `tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs` (append)

**Interfaces:**
- Consumes: `IdentifierClassifier.Classify` (Task 1), `users.ListByAdmissionIdAsync` (Task 2).
- Produces: `/auth/login` now accepts `student_id` as a login field; no other endpoint's public contract changes.

- [ ] **Step 1: Write the failing integration test**

Append to `tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs` (inside `AuthFlowTests`, after `Login_with_mobile_number_returns_tokens`):

```csharp
    [Fact]
    public async Task Login_with_admission_id_returns_tokens()
    {
        var hasher = new PasswordHasher();
        var ctx = new TenantContext(); ctx.Set(null, Guid.NewGuid(), true);
        var factory = new SqlConnectionFactory(fx.ConnectionString, ctx);
        var admissionId = $"WBA-{Guid.NewGuid():N}".Substring(0, 16);
        await using (var c = await factory.OpenAsync())
            await c.ExecuteAsync(
                "INSERT dbo.Users (Id, StudentId, PasswordHash, IsPlatform) VALUES (NEWID(),@sid,@h,1)",
                new { sid = admissionId, h = hasher.Hash("Pass123!") });

        await using var app = AppWithDb();
        var client = app.CreateClient();

        // No '@' and not phone-shaped → backend resolves it as an admission ID.
        var login = await client.PostAsJsonAsync("/v1/auth/login", new { student_id = admissionId, password = "Pass123!" });
        login.StatusCode.Should().Be(HttpStatusCode.OK);

        var json = await login.Content.ReadAsStringAsync();
        using var doc = System.Text.Json.JsonDocument.Parse(json);
        doc.RootElement.GetProperty("data").GetProperty("access_token").GetString()
            .Should().NotBeNullOrEmpty();
    }
```

- [ ] **Step 2: Run test to verify it fails**

Run: `dotnet test tests/Sms.Tests.Integration/Sms.Tests.Integration.csproj --filter FullyQualifiedName~Login_with_admission_id_returns_tokens`
Expected: FAIL with 401/422 — `LoginAsync` doesn't read `req.StudentId` yet.

- [ ] **Step 3: Update `LoginAsync` and `ListByIdentifierAsync`**

In `src/Sms.Application/Services/Auth/AuthService.cs`, replace line 47:

```csharp
        var identifier = !string.IsNullOrWhiteSpace(req.Email) ? req.Email : req.Phone;
```

with:

```csharp
        var identifier = req.Email is { Length: > 0 } e ? e
            : req.StudentId is { Length: > 0 } sid ? sid
            : req.Phone;
```

Replace lines 287-290:

```csharp
    private Task<IReadOnlyList<UserRecord>> ListByIdentifierAsync(string identifier, CancellationToken ct) =>
        identifier.Contains('@')
            ? users.ListByEmailAsync(identifier, ct)
            : users.ListByPhoneAsync(identifier, ct);
```

with:

```csharp
    private Task<IReadOnlyList<UserRecord>> ListByIdentifierAsync(string identifier, CancellationToken ct) =>
        IdentifierClassifier.Classify(identifier) switch
        {
            IdentifierKind.Email => users.ListByEmailAsync(identifier, ct),
            IdentifierKind.Phone => users.ListByPhoneAsync(identifier, ct),
            _ => users.ListByAdmissionIdAsync(identifier, ct),
        };
```

- [ ] **Step 4: Run test to verify it passes**

Run: `dotnet test tests/Sms.Tests.Integration/Sms.Tests.Integration.csproj --filter FullyQualifiedName~AuthFlowTests`
Expected: PASS (all `AuthFlowTests`, including the two pre-existing ones — confirms no regression on email/phone login)

- [ ] **Step 5: Commit**

```bash
git add src/Sms.Application/Services/Auth/AuthService.cs tests/Sms.Tests.Integration/Auth/AuthFlowTests.cs
git commit -m "feat(auth): resolve login/OTP/reset identifiers by admission ID too"
```

---

### Task 4: Client — extract identifier classification/validation

**Files:**
- Create: `src/services/auth/identifier.ts`
- Test: `src/services/auth/__tests__/identifier.test.ts`
- Modify: `src/screens/LoginScreen.tsx` (remove local `isValidIdentifier`, import from new module — done fully in Task 6, not here, to keep this task's diff isolated to the new module)

**Interfaces:**
- Produces: `type IdentifierKind = 'email' | 'phone' | 'admissionId'`, `classifyIdentifier(value: string): IdentifierKind`, `isEmailOrPhone(value: string): boolean` — consumed by Task 6 (LoginScreen) and Task 7 (httpServices).

- [ ] **Step 1: Write the failing test**

Create `src/services/auth/__tests__/identifier.test.ts`:

```typescript
import { classifyIdentifier, isEmailOrPhone } from '@/services/auth/identifier';

describe('classifyIdentifier', () => {
  it('classifies emails', () => {
    expect(classifyIdentifier('maya@wba.edu')).toBe('email');
  });
  it('classifies phone numbers regardless of formatting', () => {
    expect(classifyIdentifier('415 555 0142')).toBe('phone');
    expect(classifyIdentifier('+91 98765 43210')).toBe('phone');
  });
  it('classifies everything else as admission ID', () => {
    expect(classifyIdentifier('WBA-2024-1042')).toBe('admissionId');
    expect(classifyIdentifier('STU2024001')).toBe('admissionId');
  });
});

describe('isEmailOrPhone', () => {
  it('accepts a valid email', () => {
    expect(isEmailOrPhone('maya@wba.edu')).toBe(true);
  });
  it('accepts a 7-15 digit phone number', () => {
    expect(isEmailOrPhone('4155550142')).toBe(true);
  });
  it('rejects an admission ID', () => {
    expect(isEmailOrPhone('WBA-2024-1042')).toBe(false);
  });
  it('rejects a malformed email', () => {
    expect(isEmailOrPhone('not-an-email@')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest src/services/auth/__tests__/identifier.test.ts`
Expected: FAIL — cannot find module `@/services/auth/identifier`.

- [ ] **Step 3: Write the implementation**

Create `src/services/auth/identifier.ts`:

```typescript
export type IdentifierKind = 'email' | 'phone' | 'admissionId';

// Mirrors the backend's Sms.Application.Services.Auth.IdentifierClassifier
// so client-side field selection and server-side lookup always agree.
export function classifyIdentifier(value: string): IdentifierKind {
  const v = value.trim();
  if (v.includes('@')) return 'email';

  const digits = v.replace(/\D/g, '');
  const hasOnlyPhonePunctuation = /^[\d\s+()-]+$/.test(v);
  if (hasOnlyPhonePunctuation && digits.length >= 7 && digits.length <= 15) return 'phone';

  return 'admissionId';
}

// Accepts an email or a 7-15 digit phone number (formatting characters allowed).
export function isEmailOrPhone(value: string): boolean {
  const v = value.trim();
  if (v.includes('@')) return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/auth/__tests__/identifier.test.ts`
Expected: PASS (8 tests)

- [ ] **Step 5: Commit**

```bash
git add src/services/auth/identifier.ts src/services/auth/__tests__/identifier.test.ts
git commit -m "feat(auth): add classifyIdentifier/isEmailOrPhone helpers"
```

---

### Task 5: Client — collapse auth service surface to `requestPasswordReset` + `resetPassword`

**Files:**
- Modify: `src/services/types.ts:29-37` (`AuthService` interface)
- Modify: `src/services/mock/auth.mock.ts`
- Modify: `src/services/mock/auth.mock.test.ts`
- Modify: `src/services/http/index.ts:37-73` (`httpServices.auth`)
- Modify: `src/services/http/__tests__/httpServices.test.ts`
- Modify: `src/providers/AuthProvider.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: `AuthService.requestPasswordReset(identifier): Promise<{ channel: 'sms'|'email'; sent: boolean }>`, `AuthService.resetPassword(identifier, code, password): Promise<void>`, and the matching `AuthContextValue.requestPasswordReset`/`resetPassword` — consumed by Task 6 (LoginScreen).
- Removes: `AuthService.requestOtp`, `AuthService.verifyOtp`, `AuthService.setPassword`, and `AuthContextValue.requestOtp`/`verifyResetCode`/`setPassword`.

- [ ] **Step 1: Update the `AuthService` interface**

In `src/services/types.ts`, replace lines 32-35:

```typescript
  requestOtp(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  verifyOtp(identifier: string, code: string): Promise<{ resetToken: string; expiresIn: number }>;
  refresh(refreshToken: string): Promise<{ access: string; refresh: string | null }>;
  setPassword(args: { token: string; password: string }): Promise<void>;
```

with:

```typescript
  requestPasswordReset(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  resetPassword(identifier: string, code: string, password: string): Promise<void>;
  refresh(refreshToken: string): Promise<{ access: string; refresh: string | null }>;
```

- [ ] **Step 2: Update the mock's failing tests first**

In `src/services/mock/auth.mock.test.ts`, replace the `describe('authMock.verifyOtp', ...)` block (and any `setPassword` tests near it — inspect the full file for all blocks referencing `verifyOtp`/`setPassword` and replace every one) with:

```typescript
describe('authMock.requestPasswordReset', () => {
  it('sends a code for a registered identifier', async () => {
    const res = await auth.requestPasswordReset('priya.patel@home.com');
    expect(res).toEqual({ channel: 'email', sent: true });
  });
  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.requestPasswordReset('nobody@nowhere.com')).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe('authMock.resetPassword', () => {
  it('sets a new password given the correct code, then signs in with it', async () => {
    await auth.requestPasswordReset('priya.patel@home.com');
    await auth.resetPassword('priya.patel@home.com', '123456', 'NewPass123');
    const session = await auth.signIn('priya.patel@home.com', 'NewPass123', 'parent');
    expect(session.role).toBe('parent');
  });
  it('throws 401 for an incorrect code', async () => {
    await auth.requestPasswordReset('priya.patel@home.com');
    await expect(auth.resetPassword('priya.patel@home.com', '000000', 'NewPass123')).rejects.toMatchObject({
      status: 401,
    });
  });
  it('throws 404 for an unknown identifier', async () => {
    await expect(auth.resetPassword('nobody@nowhere.com', '123456', 'NewPass123')).rejects.toMatchObject({
      status: 404,
    });
  });
  it('throws 400 for a weak password', async () => {
    await auth.requestPasswordReset('priya.patel@home.com');
    await expect(auth.resetPassword('priya.patel@home.com', '123456', 'weak')).rejects.toMatchObject({
      status: 400,
    });
  });
});
```

Run: `npx jest src/services/mock/auth.mock.test.ts`
Expected: FAIL — `auth.requestPasswordReset`/`auth.resetPassword` are not functions.

- [ ] **Step 3: Update `authMock`**

In `src/services/mock/auth.mock.ts`, replace lines 84-106 (`verifyOtp` and `setPassword`) with:

```typescript
    requestPasswordReset: (identifier) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        pendingCodes.set(match.email, MOCK_OTP_CODE);
        return { channel: match.channel, sent: true };
      }),
    resetPassword: (identifier, code, password) =>
      delayed(() => {
        const match = findAccount(identifier);
        if (!match) throw new ApiError('Not registered', 404);
        const activeCode = pendingCodes.get(match.email);
        if (!activeCode || activeCode !== code) throw new ApiError('Incorrect or expired code', 401);
        if (!isStrongPassword(password)) throw new ApiError('Password is too weak', 400);
        passwords.set(match.email, password);
        pendingCodes.delete(match.email);
        return undefined;
      }),
```

Also replace line 56 (`const resetTokens = new Map<string, string>(); // resetToken -> canonical email`) with:

```typescript
  const pendingCodes = new Map<string, string>(); // canonical email -> active code
```

(`resetTokens` is no longer referenced anywhere once `verifyOtp`/`setPassword` are removed — confirm with a repo-wide search before deleting, since it's the only remaining use.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest src/services/mock/auth.mock.test.ts`
Expected: PASS

- [ ] **Step 5: Update `httpServices.auth`'s failing tests first**

In `src/services/http/__tests__/httpServices.test.ts`, there's no existing `verifyOtp`/`setPassword` test to replace (the `describe('httpServices.auth', ...)` block only covers `signIn`/`refresh`/`getMe`) — add two new tests inside that block, after the `getMe` test:

```typescript
  it('requestPasswordReset posts to /auth/password/forgot', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue({ channel: 'email', sent: true } as any);
    const spy = jest.spyOn(client, 'apiFetch');
    await httpServices.auth.requestPasswordReset('maya@wba.edu');
    expect(spy.mock.calls[0][0]).toBe('/auth/password/forgot');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({ identifier: 'maya@wba.edu' });
  });

  it('resetPassword posts identifier+code+password to /auth/password/reset', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(undefined as any);
    await httpServices.auth.resetPassword('maya@wba.edu', '123456', 'NewPass123');
    expect(spy.mock.calls[0][0]).toBe('/auth/password/reset');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      identifier: 'maya@wba.edu', code: '123456', password: 'NewPass123',
    });
  });
```

Run: `npx jest src/services/http/__tests__/httpServices.test.ts`
Expected: FAIL — `httpServices.auth.requestPasswordReset` is not a function.

- [ ] **Step 6: Update `httpServices.auth`**

In `src/services/http/index.ts`, replace lines 49-58 (`requestOtp` and `verifyOtp`) with:

```typescript
    requestPasswordReset: (identifier) =>
      post<{ channel: 'sms' | 'email'; sent: boolean }>('/auth/password/forgot', { identifier }),
    resetPassword: (identifier, code, password) =>
      post<void>('/auth/password/reset', { identifier, code, password }),
```

Remove lines 65-68 (the old `setPassword`) entirely — it's replaced by `resetPassword` above.

- [ ] **Step 7: Run test to verify it passes**

Run: `npx jest src/services/http/__tests__/httpServices.test.ts`
Expected: PASS

- [ ] **Step 8: Update `AuthProvider`**

In `src/providers/AuthProvider.tsx`, replace lines 13-15:

```typescript
  requestOtp: (identifier: string) => Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  verifyResetCode: (identifier: string, code: string) => Promise<{ resetToken: string; expiresIn: number }>;
  setPassword: (args: { token: string; password: string }) => Promise<void>;
```

with:

```typescript
  requestPasswordReset: (identifier: string) => Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  resetPassword: (identifier: string, code: string, password: string) => Promise<void>;
```

Replace lines 87-89:

```typescript
      requestOtp: (identifier) => services.auth.requestOtp(identifier),
      verifyResetCode: (identifier, code) => services.auth.verifyOtp(identifier, code),
      setPassword: (args) => services.auth.setPassword(args),
```

with:

```typescript
      requestPasswordReset: (identifier) => services.auth.requestPasswordReset(identifier),
      resetPassword: (identifier, code, password) => services.auth.resetPassword(identifier, code, password),
```

- [ ] **Step 9: Run full client test suite and tsc to confirm no dangling references**

Run: `npx jest`
Expected: FAIL at this point — `src/screens/LoginScreen.tsx` still references the removed `requestOtp`/`verifyResetCode`/`setPassword` from `useAuth()`. This is expected; Task 6 fixes it. Confirm the *only* failures are TypeScript/compile errors inside `LoginScreen.tsx` (via `npx tsc --noEmit`), not new failures elsewhere.

- [ ] **Step 10: Commit**

```bash
git add src/services/types.ts src/services/mock/auth.mock.ts src/services/mock/auth.mock.test.ts src/services/http/index.ts src/services/http/__tests__/httpServices.test.ts src/providers/AuthProvider.tsx
git commit -m "refactor(auth): collapse requestOtp/verifyOtp/setPassword into requestPasswordReset/resetPassword"
```

---

### Task 6: Client — `httpServices.auth.signIn` sends the correct snake_case field

**Files:**
- Modify: `src/services/http/index.ts:37-43` (`signIn`)
- Modify: `src/services/http/__tests__/httpServices.test.ts:91-100` (`signIn` test)

**Interfaces:**
- Consumes: `classifyIdentifier` (Task 4).

- [ ] **Step 1: Update the failing test first**

In `src/services/http/__tests__/httpServices.test.ts`, replace the `signIn` test (lines 91-100):

```typescript
  it('signIn persists tokens and returns a mapped Session', async () => {
    jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    const setToken = jest.spyOn(client, 'setAuthToken');
    const session = await httpServices.auth.signIn('asha@school.edu', 'pw', 'student');
    expect(session).toEqual({ token: 'ACC', role: 'student', email: 'asha@school.edu' });
    expect(setToken).toHaveBeenCalledWith('ACC');
    expect(tokenStore.save).toHaveBeenCalledWith({
      access: 'ACC', refresh: 'REF', role: 'student', email: 'asha@school.edu', tenantId: 'sch1',
    });
  });

  it('signIn classifies an admission ID and sends it as student_id', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    await httpServices.auth.signIn('WBA-2024-1042', 'pw', 'student');
    expect(spy.mock.calls[0][0]).toBe('/auth/login');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      student_id: 'WBA-2024-1042', password: 'pw', role: 'student',
    });
  });

  it('signIn classifies a phone number and sends it as phone', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValue(sessionDto as any);
    await httpServices.auth.signIn('415 555 0142', 'pw', 'parent');
    expect(JSON.parse((spy.mock.calls[0][1] as any).body)).toEqual({
      phone: '415 555 0142', password: 'pw', role: 'parent',
    });
  });
```

Run: `npx jest src/services/http/__tests__/httpServices.test.ts`
Expected: FAIL on the two new tests — current `signIn` sends `{ identifier, password, role }`, not the classified field.

- [ ] **Step 2: Update `signIn`**

In `src/services/http/index.ts`, add the import (with the other `@/services/...` imports at the top):

```typescript
import { classifyIdentifier } from '@/services/auth/identifier';
```

Replace lines 38-43:

```typescript
    signIn: async (identifier, password, role) => {
      // VERIFY-LIVE: confirm login body field name (`identifier`) against Swagger.
      const dto = await post<SessionDTO>('/auth/login', { identifier, password, role });
      await persistSession(dto);
      return toSession(dto);
    },
```

with:

```typescript
    signIn: async (identifier, password, role) => {
      const kind = classifyIdentifier(identifier);
      const body =
        kind === 'email' ? { email: identifier, password, role }
        : kind === 'phone' ? { phone: identifier, password, role }
        : { student_id: identifier, password, role };
      const dto = await post<SessionDTO>('/auth/login', body);
      await persistSession(dto);
      return toSession(dto);
    },
```

- [ ] **Step 3: Run test to verify it passes**

Run: `npx jest src/services/http/__tests__/httpServices.test.ts`
Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/services/http/index.ts src/services/http/__tests__/httpServices.test.ts
git commit -m "fix(auth): signIn sends the backend's snake_case identifier field"
```

---

### Task 7: Client — unify LoginScreen for both roles, admission-ID support, remove demo hints

**Files:**
- Modify: `src/screens/LoginScreen.tsx` (full rewrite of the component body — the student/parent flows merge into one)

**Interfaces:**
- Consumes: `classifyIdentifier`, `isEmailOrPhone` (Task 4); `requestPasswordReset`, `resetPassword` (Task 5); `signIn` (unchanged signature).

- [ ] **Step 1: Replace `src/screens/LoginScreen.tsx` in full**

```typescript
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Button } from '@/components/ui';
import { colors, fontFamily, primaryGradient, radius, shadow, spacing } from '@/theme';
import type { Role } from '@/models';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/errors';
import type { AuthStackParamList } from '@/navigation/types';
import { isStrongPassword, PASSWORD_RULE_TEXT } from '@/services/auth/password';
import { isEmailOrPhone } from '@/services/auth/identifier';

type Nav = NativeStackNavigationProp<AuthStackParamList, 'Login'>;

const ROLE_COPY: Record<Role, { label: string; placeholder: string; autoCapitalize: 'none' | 'characters' }> = {
  student: { label: 'Student ID or email', placeholder: 'WBA-2024-1042 or you@school.edu', autoCapitalize: 'characters' },
  parent: { label: 'Parent email or number', placeholder: 'priya.patel@home.com or 415 555 0142', autoCapitalize: 'none' },
};

function isValidLoginIdentifier(value: string, role: Role): boolean {
  const v = value.trim();
  if (v.length === 0) return false;
  if (isEmailOrPhone(v)) return true;
  return role === 'student' && v.length >= 3;
}

export function LoginScreen() {
  const nav = useNavigation<Nav>();
  const { signIn, requestPasswordReset, resetPassword } = useAuth();
  const [role, setRole] = useState<Role>('student');

  type Step = 'password' | 'code-request' | 'code-and-password';
  const [step, setStep] = useState<Step>('password');
  const [identifier, setIdentifier] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentChannel, setSentChannel] = useState<'sms' | 'email' | null>(null);

  const mapAuthError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 404)
        return 'No account is registered for this ID/email/mobile. Contact your school to get set up.';
      if (err.status === 401) return 'Incorrect code or password. Try again.';
      if (err.status === 409)
        return 'No password yet — use "First time or forgot password?" below.';
      if (err.status === 410) return 'That code expired. Request a new one.';
    }
    return 'Something went wrong. Please try again.';
  };

  const resetFlow = () => {
    setStep('password');
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
    setSentChannel(null);
  };

  const switchRole = (next: Role) => {
    if (next === role) return;
    setRole(next);
    setIdentifier('');
    setPasswordInput('');
    resetFlow();
    setNotice(null);
  };

  const login = async () => {
    if (!isValidLoginIdentifier(identifier, role)) {
      setError(role === 'student' ? 'Enter your student ID or email.' : 'Enter a valid mobile number or email.');
      return;
    }
    if (passwordInput.length === 0) {
      setError('Enter your password.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await signIn(identifier.trim(), passwordInput, role);
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async () => {
    if (!isValidLoginIdentifier(identifier, role)) {
      setError(role === 'student' ? 'Enter your student ID or email.' : 'Enter a valid mobile number or email.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await requestPasswordReset(identifier.trim());
      setSentChannel(res.channel);
      setCode('');
      setNewPassword('');
      setConfirmPassword('');
      setStep('code-and-password');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const submitReset = async () => {
    if (code.trim().length < 6) {
      setError('Enter the 6-digit code we sent you.');
      return;
    }
    if (!isStrongPassword(newPassword)) {
      setError(PASSWORD_RULE_TEXT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await resetPassword(identifier.trim(), code.trim(), newPassword);
      setPasswordInput('');
      resetFlow();
      setNotice('Password set — please log in with your new password.');
    } catch (err) {
      setError(mapAuthError(err));
    } finally {
      setLoading(false);
    }
  };

  const copy = ROLE_COPY[role];

  return (
    <LinearGradient
      colors={
        [primaryGradient[0], primaryGradient[1], primaryGradient[2]] as [string, string, string]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.root}
    >
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.flow}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable
            onPress={() => nav.goBack()}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.6 }]}
          >
            <Ionicons name="chevron-back" size={26} color={colors.white} />
          </Pressable>
          <View style={styles.hero}>
            <View style={styles.appLogo}>
              <Ionicons name="school" size={28} color={colors.primary} />
            </View>
            <Text style={styles.appName}>Student Help Desk</Text>
            <Text style={styles.tagline}>Welcome! Let&apos;s get you signed in</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.roleToggle}>
              {(['student', 'parent'] as Role[]).map((r) => (
                <Pressable
                  key={r}
                  onPress={() => switchRole(r)}
                  style={[styles.roleChip, role === r && styles.roleChipActive]}
                >
                  <Text style={[styles.roleChipText, role === r && styles.roleChipTextActive]}>
                    {r === 'student' ? 'Student' : 'Parent'}
                  </Text>
                </Pressable>
              ))}
            </View>

            {step === 'password' ? (
              <View style={styles.otpBlock}>
                {notice ? <Text style={styles.notice}>{notice}</Text> : null}
                <Text style={styles.label}>{copy.label}</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (error) setError(null);
                  }}
                  placeholder={copy.placeholder}
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize={copy.autoCapitalize}
                  style={styles.input}
                />
                <Text style={styles.label}>Password</Text>
                <TextInput
                  value={passwordInput}
                  onChangeText={(t) => {
                    setPasswordInput(t);
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button variant="primary" size="lg" full loading={loading} onPress={login}>
                  Sign in
                </Button>
                <Pressable
                  onPress={() => {
                    setNotice(null);
                    setError(null);
                    setStep('code-request');
                  }}
                  hitSlop={8}
                >
                  <Text style={styles.otpLink}>First time or forgot password?</Text>
                </Pressable>
              </View>
            ) : step === 'code-request' ? (
              <View style={styles.otpBlock}>
                <Text style={styles.label}>{copy.label}</Text>
                <TextInput
                  value={identifier}
                  onChangeText={(t) => {
                    setIdentifier(t);
                    if (error) setError(null);
                  }}
                  placeholder={copy.placeholder}
                  placeholderTextColor={colors.inkMuted}
                  autoCapitalize={copy.autoCapitalize}
                  style={styles.input}
                />
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button variant="primary" size="lg" full loading={loading} onPress={sendCode}>
                  Send code
                </Button>
                <Pressable onPress={resetFlow} hitSlop={8}>
                  <Text style={styles.otpLink}>Back to login</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.otpBlock}>
                <Text style={styles.otpSentTo}>
                  Code sent via {sentChannel === 'sms' ? 'SMS' : 'email'} to{' '}
                  <Text style={styles.helpStrong}>{identifier.trim()}</Text>
                </Text>
                <Text style={styles.label}>Verification code</Text>
                <TextInput
                  value={code}
                  onChangeText={(t) => {
                    setCode(t.replace(/\D/g, ''));
                    if (error) setError(null);
                  }}
                  placeholder="6-digit code"
                  placeholderTextColor={colors.inkMuted}
                  keyboardType="number-pad"
                  maxLength={6}
                  style={styles.input}
                />
                <Text style={styles.label}>New password</Text>
                <TextInput
                  value={newPassword}
                  onChangeText={(t) => {
                    setNewPassword(t);
                    if (error) setError(null);
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
                    if (error) setError(null);
                  }}
                  placeholder="••••••••"
                  placeholderTextColor={colors.inkMuted}
                  secureTextEntry
                  style={styles.input}
                />
                <Text style={styles.devHint}>{PASSWORD_RULE_TEXT}</Text>
                {error ? <Text style={styles.error}>{error}</Text> : null}
                <Button variant="primary" size="lg" full loading={loading} onPress={submitReset}>
                  Set password
                </Button>
                <View style={styles.otpActions}>
                  <Pressable onPress={sendCode} disabled={loading} hitSlop={8}>
                    <Text style={styles.otpLink}>Resend code</Text>
                  </Pressable>
                  <Pressable onPress={resetFlow} disabled={loading} hitSlop={8}>
                    <Text style={styles.otpLink}>Back to login</Text>
                  </Pressable>
                </View>
              </View>
            )}

            <Text style={styles.help}>
              Need help? <Text style={styles.helpStrong}>Ask your class teacher</Text>
            </Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: spacing.xxl },
  back: {
    position: 'absolute',
    top: spacing.s,
    left: 0,
    zIndex: 2,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flow: { flex: 1, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: 10, marginBottom: spacing.xl },
  appLogo: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  appName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 24,
    color: colors.white,
  },
  tagline: {
    fontFamily: fontFamily.semiBold,
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
  },
  form: {
    gap: 14,
    backgroundColor: colors.white,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadow.pop,
  },
  roleToggle: {
    flexDirection: 'row',
    gap: 8,
    padding: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule,
  },
  roleChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  roleChipActive: { backgroundColor: colors.primary },
  roleChipText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.inkMuted,
  },
  roleChipTextActive: { color: colors.white },
  label: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    borderRadius: radius.lg,
    backgroundColor: colors.paper2,
    borderWidth: 1,
    borderColor: colors.rule,
    color: colors.ink,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
  },
  error: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.absent,
    marginTop: 4,
  },
  notice: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
    marginBottom: 2,
  },
  help: {
    textAlign: 'center',
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.inkMuted,
    marginTop: 4,
  },
  helpStrong: {
    fontFamily: fontFamily.bold,
    color: colors.primary,
  },
  otpBlock: { gap: 12 },
  otpSentTo: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.ink,
  },
  devHint: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.inkMuted,
  },
  otpActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  otpLink: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.primary,
  },
});
```

Note what this removes versus the prior file: the react-hook-form/zod student-only form, the hardcoded demo prefill (`'WBA-2024-1042'` as a default form value), and the `Text style={styles.devHint}>Demo code: 123456</Text>` hint — none of those appear anywhere in the code above.

- [ ] **Step 2: Run the full test suite and type check**

Run: `npx jest`
Expected: PASS (no test references the removed react-hook-form internals directly; all auth tests were fixed in Tasks 5-6)

Run: `npx tsc --noEmit`
Expected: exactly 1 error (the pre-existing `App.tsx` `@ts-expect-error` — see `sms-student-build-gotchas` memory). No new errors.

- [ ] **Step 3: Verify the screen bundles**

Run: `npx expo export --platform web --output-dir ._tmp_verify`
Expected: exit 0, "Exported:" message.

Run: `rmdir /s /q ._tmp_verify` (PowerShell: `Remove-Item -Recurse -Force ._tmp_verify`)

- [ ] **Step 4: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat(auth): unify student/parent login flow, support admission ID, drop demo hints"
```

---

### Task 8: Local end-to-end verification against the real backend

This task has no code changes — it's the proof that Tasks 1-7 actually interoperate, per the spec's testing requirement.

- [ ] **Step 1: Start the real backend**

```bash
cd /d/SMS/sms-project/sms-backend
docker-compose up --build
```

Expected: `db` and `api` containers start; `Program.cs` runs FluentMigrator migrations automatically on boot (no manual migrate step). Note the port the `api` service publishes (check `docker-compose.yml`/logs) — call it `<PORT>`.

- [ ] **Step 2: Seed a test student and parent**

Use the `api` container's connection to insert one student row (`StudentId` set to an admission number) and one parent row (`Email` set, no `PasswordHash` yet — simulating an admin-provisioned, first-time account), following the same raw-SQL insert shape used in Task 2/3's integration tests. (Exact seeding mechanism — direct SQL vs. an admin-provisioning endpoint — depends on what's already available in `sms-backend`'s admin app; if no seed endpoint exists yet, insert directly via `sqlcmd`/a DB client against the `db` container.)

- [ ] **Step 3: Point the client at the local backend**

In `sms-student/app.json`, temporarily set `extra.apiBaseUrl` to `http://localhost:<PORT>/v1` (do not commit this change — it's for local verification only; revert before committing anything else).

- [ ] **Step 4: Exercise every flow manually**

Run `npm run web` and, for both the seeded student and parent accounts:
- Log in with admission ID + password (student only) — expect success once a password has been set.
- Log in with email + password (both roles) — expect success once a password has been set.
- "First time or forgot password?" → enter identifier → receive a 6-digit code (check the `api` container logs or configured email sink for the code, since no real SMTP is wired in local dev) → enter code + new password together → expect success and a return to the login screen.
- Log in again with the newly set password — expect success.

- [ ] **Step 5: Revert the local-only config change**

```bash
git checkout -- app.json
```

(Confirms `apiBaseUrl` is back to the placeholder — pointing at a real deployed host is explicitly out of scope for this phase per the spec.)

---

## Self-Review Notes

- **Spec coverage:** Backend admission-ID resolution (Tasks 1-3), client field-name reconciliation (Task 6), demo-hint removal (Task 7), local docker-compose verification (Task 8) — all covered. The reset-flow amendment is covered by Tasks 5-7 together (service surface, then screen).
- **Placeholder scan:** none found — every step has runnable code or an exact command.
- **Type consistency:** `requestPasswordReset`/`resetPassword` signatures match verbatim across `types.ts` (Task 5), `auth.mock.ts` (Task 5), `http/index.ts` (Task 5), `AuthProvider.tsx` (Task 5), and their call sites in `LoginScreen.tsx` (Task 7). `classifyIdentifier`/`isEmailOrPhone` (Task 4) match their consumers in Tasks 6-7 exactly (module path `@/services/auth/identifier`).
