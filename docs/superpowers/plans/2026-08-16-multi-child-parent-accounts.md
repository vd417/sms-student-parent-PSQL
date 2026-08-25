# Multi-Child Parent Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A parent with more than one enrolled child sees all of them via a real `GET /v1/parents/me/children` endpoint, backed by a `ParentStudentLinks` table that stays correct as new siblings enroll — replacing the client's current hardcoded single-child stub.

**Architecture:** New `ParentStudentLinks` table (`ParentUserId` × `StudentAdmissionNo`, one row per link, one flagged `IsPrimary`) is the source of truth for "which students does this parent see." A one-time migration backfills it from every existing `Users.StudentId`. The already-shipped `Parent_EnsureLogin` stored proc (which resolves/creates a parent's login on every admission-id-based login/OTP flow, matching siblings via `Students.GuardianEmail`) is extended to also upsert a link row each time it runs, so newly enrolled siblings are captured automatically going forward — not just at backfill time. A new `IParentService`/`ParentController` resolves the caller's own links and returns the matching `Students` rows via the existing `StudentResponse` contract (no new response shape). The client's `parent.children()` swaps its `/students/me`-only call for this endpoint; `toChild`, the mock layer, `ChildProvider`, and `KidSwitcher` already handle N children generically today and need no changes.

**Tech Stack:** ASP.NET Core (.NET 10 preview), Dapper + raw SQL (`BaseRepository`), FluentMigrator migrations, SQL Server row-level security; React Native/Expo client, React Query, Jest.

**Spec:** `docs/superpowers/specs/2026-08-05-multi-child-parent-and-reset-fallback-design.md` — only the "Data model" / "New DAO" / "Endpoint" sections apply; the password-reset-fallback section is already shipped separately via `Students.GuardianEmail`/`GuardianPhone` in `AuthService.ResolveOtpDeliveryAsync`, not the link table, and is out of scope here.

## Global Constraints

- Every new tenant-scoped table gets an RLS security policy (`rls.fn_tenant_predicate`) in the same migration that creates it — no exceptions, per the established convention (`LeaveRequests`, `PeriodAttendanceRecords`, etc.).
- Repositories: stored procedures for writes/complex multi-step logic; `QueryInlineAsync`/`ExecuteInlineAsync` (parameterized only, never string-concatenated) for simple single-table reads — per `BaseRepository`'s own doc comment.
- Before running `dotnet build`/`dotnet run` on `sms-backend`, check `netstat -ano | grep :5162` and stop any running instance first — the build fails to copy DLLs otherwise (file lock).
- Migrations are numbered sequentially; **re-check the current highest `M0###` file under `db/Sms.Migrations/` at execution time** — do not assume `M0141` is free, more may have landed since this plan was written (current highest at plan-writing time was `M0140`).
- `.sql` files under `db/Sms.Migrations/procs/**/*.sql` are compiled in as embedded resources and read at migration-run time via `M0003_Procs_Auth.EmbeddedProcs(namespaceFragment)` — to change a proc's behavior, edit the physical `.sql` file directly, then add a migration that re-executes `EmbeddedProcs("procs.<folder>.<ProcName>")`. Do not inline the proc body as a C# string literal for procs that already exist as embedded files (only do that for brand-new procs, e.g. `Leave_Create`'s existing precedent).

---

## Task 1: `ParentStudentLinks` table + backfill + `Parent_EnsureLogin` upkeep

**Files:**
- Modify: `db/Sms.Migrations/procs/identityparent/Parent_EnsureLogin.sql`
- Create: `db/Sms.Migrations/M0141_ParentStudentLinks.cs` (renumber if `M0141` is taken by the time you run this — see Global Constraints)

**Interfaces:**
- Produces: table `dbo.ParentStudentLinks(Id uniqueidentifier PK, TenantId uniqueidentifier, ParentUserId uniqueidentifier, StudentAdmissionNo nvarchar(64), IsPrimary bit, CreatedAt datetime2)`, unique on `(ParentUserId, StudentAdmissionNo)`. Task 2's `ParentStudentLinkRepository` reads this table by exact name/columns.

- [ ] **Step 1: Edit `Parent_EnsureLogin.sql` to upsert a link row before commit**

Open `db/Sms.Migrations/procs/identityparent/Parent_EnsureLogin.sql`. Find the line `COMMIT TRAN;` (it appears once, right before the final `SELECT TOP 1 u.Id, ...` at the end of the proc). Replace that single line with:

```sql
    IF NOT EXISTS (
        SELECT 1 FROM dbo.ParentStudentLinks
        WHERE ParentUserId = @UserId AND StudentAdmissionNo = @AdmissionNo
    )
        INSERT dbo.ParentStudentLinks (Id, TenantId, ParentUserId, StudentAdmissionNo, IsPrimary, CreatedAt)
        VALUES (
            NEWID(), @TenantId, @UserId, @AdmissionNo,
            CASE WHEN NOT EXISTS (
                SELECT 1 FROM dbo.ParentStudentLinks WHERE ParentUserId = @UserId
            ) THEN 1 ELSE 0 END,
            SYSUTCDATETIME()
        );

    COMMIT TRAN;
```

This runs every time the proc resolves or creates a parent login for an admission id — both the first child and every sibling match via `GuardianEmail` — so the link table stays live as new children enroll, not just at one-time backfill.

- [ ] **Step 2: Write the migration**

Create `db/Sms.Migrations/M0141_ParentStudentLinks.cs`:

```csharp
using FluentMigrator;

namespace Sms.Migrations;

[Migration(141, "ParentStudentLinks: multi-child parent accounts + Parent_EnsureLogin upkeep")]
public sealed class M0141_ParentStudentLinks : Migration
{
    public override void Up()
    {
        Create.Table("ParentStudentLinks")
            .WithColumn("Id").AsGuid().PrimaryKey().WithDefault(SystemMethods.NewSequentialId)
            .WithColumn("TenantId").AsGuid().NotNullable()
            .WithColumn("ParentUserId").AsGuid().NotNullable()
            .WithColumn("StudentAdmissionNo").AsString(64).NotNullable()
            .WithColumn("IsPrimary").AsBoolean().NotNullable().WithDefaultValue(false)
            .WithColumn("CreatedAt").AsDateTime2().NotNullable().WithDefault(SystemMethods.CurrentUTCDateTime);

        Create.Index("UX_ParentStudentLinks_Parent_Admission").OnTable("ParentStudentLinks")
            .OnColumn("ParentUserId").Ascending().OnColumn("StudentAdmissionNo").Ascending()
            .WithOptions().Unique();
        Create.Index("IX_ParentStudentLinks_Tenant_Parent").OnTable("ParentStudentLinks")
            .OnColumn("TenantId").Ascending().OnColumn("ParentUserId").Ascending();

        Execute.Sql(@"
CREATE SECURITY POLICY rls.ParentStudentLinksTenantPolicy
ADD FILTER PREDICATE rls.fn_tenant_predicate(TenantId) ON dbo.ParentStudentLinks,
ADD BLOCK PREDICATE rls.fn_tenant_predicate(TenantId) ON dbo.ParentStudentLinks AFTER INSERT
WITH (STATE = ON);");

        // One-time backfill: every existing parent (Users.StudentId already set) becomes
        // that child's primary link. Rows whose StudentId doesn't match any real
        // Students.AdmissionNo in the same tenant are skipped (not fatal) via the INNER JOIN.
        Execute.Sql(@"
INSERT dbo.ParentStudentLinks (Id, TenantId, ParentUserId, StudentAdmissionNo, IsPrimary, CreatedAt)
SELECT NEWID(), u.TenantId, u.Id, s.AdmissionNo, 1, SYSUTCDATETIME()
FROM dbo.Users u
INNER JOIN dbo.Students s
    ON LOWER(LTRIM(RTRIM(s.AdmissionNo))) = LOWER(LTRIM(RTRIM(u.StudentId)))
   AND s.TenantId = u.TenantId
WHERE u.StudentId IS NOT NULL
  AND NOT EXISTS (
        SELECT 1 FROM dbo.ParentStudentLinks pl
        WHERE pl.ParentUserId = u.Id AND pl.StudentAdmissionNo = s.AdmissionNo
  );");

        // Re-deploy Parent_EnsureLogin now that Step 1's edit is in the embedded .sql file —
        // the table above must exist first since the proc body now references it.
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.identityparent.Parent_EnsureLogin"))
            Execute.Sql(sql);
    }

    public override void Down()
    {
        Execute.Sql("DROP SECURITY POLICY IF EXISTS rls.ParentStudentLinksTenantPolicy;");
        Delete.Table("ParentStudentLinks");
        // Re-deploy again so the proc goes back to matching whatever Parent_EnsureLogin.sql
        // contains after this migration's Down() — if Step 1's edit is reverted separately,
        // this keeps the two in sync; if not, the proc will simply fail its next INSERT until
        // the table is recreated, matching an intentionally-reverted migration's tradeoffs.
        foreach (var sql in M0003_Procs_Auth.EmbeddedProcs("procs.identityparent.Parent_EnsureLogin"))
            Execute.Sql(sql);
    }
}
```

- [ ] **Step 3: Build and run to apply the migration**

```bash
netstat -ano | grep :5162  # if a PID is listed, `taskkill //F //PID <pid>` first
cd sms-backend && dotnet build src/Sms.Api
cd src/Sms.Api && dotnet run --no-build
```

Watch the startup log for `MigrationRunner` output — confirm no errors and that migration 141 is listed as applied. Leave the server running for Task 3's manual verification.

- [ ] **Step 4: Manually verify the backfill**

With the server running against the real dev database, in a new terminal:

```bash
TOKEN=$(curl -s -X POST http://localhost:5162/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vaibhavvk@yopmail.com","password":"vaibhav@123","role":"parent"}' \
  --max-time 10 | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
curl -s "http://localhost:5162/v1/auth/me" -H "Authorization: Bearer $TOKEN" | grep -o '"id":"[^"]*"'
```

Note the returned `id` (the `Users.Id`), then query the table directly (via whatever SQL client/connection string this environment uses) with `SELECT * FROM dbo.ParentStudentLinks WHERE ParentUserId = '<that id>'` — expect exactly one row, `IsPrimary = 1`, `StudentAdmissionNo` matching this account's known admission number (`sccrdtb/STU/26/0001`).

- [ ] **Step 5: Commit**

```bash
git add db/Sms.Migrations/procs/identityparent/Parent_EnsureLogin.sql db/Sms.Migrations/M0141_ParentStudentLinks.cs
git commit -m "feat(parent): add ParentStudentLinks table with backfill and live upkeep"
```

---

## Task 2: `ParentStudentLinkRepository` + `StudentRepository.ListByAdmissionNosAsync`

**Files:**
- Create: `src/Sms.Modules.Sis/Data/ParentStudentLinkRepository.cs`
- Modify: `src/Sms.Modules.Sis/Data/StudentRepository.cs` (add one method)
- Modify: `src/Sms.Modules.Sis/SisModule.cs` (register the new repository)

**Interfaces:**
- Consumes: Task 1's `dbo.ParentStudentLinks` table.
- Produces: `ParentStudentLinkRepository.ListAdmissionNosForParentAsync(Guid parentUserId, CancellationToken ct = default): Task<IReadOnlyList<string>>` and `StudentRepository.ListByAdmissionNosAsync(IReadOnlyList<string> admissionNos, CancellationToken ct = default): Task<IReadOnlyList<StudentResponse>>` — Task 3's `ParentService` calls both by these exact names.

No repository-level test in this task: this codebase has no precedent for unit-testing a `BaseRepository` subclass directly (every existing example, e.g. `AchievementRepository`, is only exercised through its controller's HTTP-level integration test — see `AchievementTests.cs`). Task 3's integration test is where these two methods get their real test coverage, end-to-end through the controller.

- [ ] **Step 1: Write `ParentStudentLinkRepository`**

Create `src/Sms.Modules.Sis/Data/ParentStudentLinkRepository.cs`:

```csharp
using Sms.Shared.Kernel.Data;

namespace Sms.Modules.Sis.Data;

public sealed class ParentStudentLinkRepository(IDbConnectionFactory factory) : BaseRepository(factory)
{
    public Task<IReadOnlyList<string>> ListAdmissionNosForParentAsync(
        Guid parentUserId, CancellationToken ct = default) =>
        QueryInlineAsync<string>(
            "SELECT StudentAdmissionNo FROM dbo.ParentStudentLinks " +
            "WHERE ParentUserId = @parentUserId ORDER BY IsPrimary DESC, CreatedAt ASC",
            new { parentUserId }, ct);
}
```

- [ ] **Step 2: Add `StudentRepository.ListByAdmissionNosAsync`**

In `src/Sms.Modules.Sis/Data/StudentRepository.cs`, add this method right after `GetByAdmissionNoAsync` (reuses the existing private `ColsWithLivePct` constant already defined in this class):

```csharp
    public Task<IReadOnlyList<StudentResponse>> ListByAdmissionNosAsync(
        IReadOnlyList<string> admissionNos, CancellationToken ct = default) =>
        admissionNos.Count == 0
            ? Task.FromResult<IReadOnlyList<StudentResponse>>(Array.Empty<StudentResponse>())
            : QueryInlineAsync<StudentResponse>(
                $"SELECT {ColsWithLivePct} WHERE s.AdmissionNo IN @admissionNos ORDER BY s.Name",
                new { admissionNos }, ct);
```

- [ ] **Step 3: Register the new repository**

In `src/Sms.Modules.Sis/SisModule.cs`, add a line next to the existing `services.AddScoped<StudentRepository>();`:

```csharp
services.AddScoped<ParentStudentLinkRepository>();
```

- [ ] **Step 4: Build to verify it compiles**

```bash
netstat -ano | grep :5162  # stop any running instance first (see Global Constraints)
cd sms-backend && dotnet build src/Sms.Api
```

Expected: `Build succeeded. 0 Error(s)`.

- [ ] **Step 5: Commit**

```bash
git add src/Sms.Modules.Sis/Data/ParentStudentLinkRepository.cs src/Sms.Modules.Sis/Data/StudentRepository.cs src/Sms.Modules.Sis/SisModule.cs
git commit -m "feat(parent): add repository methods for listing a parent's linked children"
```

---

## Task 3: `IParentService` + `ParentController` (`GET /v1/parents/me/children`)

**Files:**
- Create: `src/Sms.Application/Services/Parents/ParentService.cs` (interface + implementation, same file — matches the `ISisService`/`SisService` convention of interface-and-impl co-located)
- Create: `src/Sms.Api/Controllers/ParentController.cs`
- Modify: `src/Sms.Application/DependencyInjection.cs` (register `IParentService`)
- Test: `tests/Sms.Tests.Integration/Parents/ParentChildrenTests.cs`

**Interfaces:**
- Consumes: Task 2's `ParentStudentLinkRepository.ListAdmissionNosForParentAsync`, `StudentRepository.ListByAdmissionNosAsync`; existing `ITenantContext.UserId`.
- Produces: `GET /v1/parents/me/children` → `200` with `{ "data": [StudentResponse, ...] }` (empty array, never an error, when the caller has no linked children).

- [ ] **Step 1: Write the failing integration test**

Create `tests/Sms.Tests.Integration/Parents/ParentChildrenTests.cs`. This mirrors `tests/Sms.Tests.Integration/Academics/AchievementTests.cs`'s exact structure (self-contained `App()`/`Data()` helpers, raw `SqlConnection` + `sp_set_session_context` for RLS-protected inserts), with one addition: a `Client()` variant that takes an explicit `userId` so the JWT's `sub` claim (→ `ITenantContext.UserId` → `ParentService`'s lookup) matches the `ParentUserId` seeded below — `AchievementTests.cs`'s own `Client()` always mints a random, undiscoverable user id, which doesn't work here since this endpoint's whole job is "resolve rows for *this* caller's id":

```csharp
using System.Net;
using System.Text.Json;
using Dapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Sms.Shared.Kernel.Auth;
using Sms.Shared.Kernel.Authz;
using Sms.Shared.Kernel.Time;
using Xunit;

namespace Sms.Tests.Integration.Parents;

[Collection("sql")]
public class ParentChildrenTests(SqlServerFixture fx)
{
    private const string Key = "integration-test-signing-key-32-bytes-min!!";

    private WebApplicationFactory<Program> App() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("environment", "Production");
            b.UseSetting("ConnectionStrings:Sql", fx.ConnectionString);
            b.UseSetting("Jwt:SigningKey", Key);
        });

    private static HttpClient Client(WebApplicationFactory<Program> app, Guid tenantId, Guid userId, params string[] roles)
    {
        var jwt = new JwtTokenService(
            new JwtOptions { Issuer = "sms", Audience = "sms-apps", SigningKey = Key, AccessTokenMinutes = 15 },
            new SystemClock());
        var token = jwt.IssueAccess(userId, tenantId, roles, isPlatform: false);
        var c = app.CreateClient();
        c.DefaultRequestHeaders.Authorization = new("Bearer", token);
        return c;
    }

    private static async Task<JsonElement> Data(HttpResponseMessage res, HttpStatusCode expected)
    {
        var body = await res.Content.ReadAsStringAsync();
        res.StatusCode.Should().Be(expected, body);
        using var doc = JsonDocument.Parse(body);
        return doc.RootElement.GetProperty("data").Clone();
    }

    [Fact]
    public async Task Returns_all_linked_children_primary_first()
    {
        var tenantId = Guid.NewGuid();
        var parentId = Guid.NewGuid();
        var childOneId = Guid.NewGuid();
        var childTwoId = Guid.NewGuid();
        const string childOneAdmission = "SIB-001";
        const string childTwoAdmission = "SIB-002";

        await using (var conn = new Microsoft.Data.SqlClient.SqlConnection(fx.ConnectionString))
        {
            await conn.OpenAsync();
            await conn.ExecuteAsync("EXEC sp_set_session_context @key=N'TenantId', @value=@tenantId", new { tenantId });
            await conn.ExecuteAsync(
                "INSERT dbo.Students (Id, TenantId, AdmissionNo, Name, Status) VALUES " +
                "(@childOneId, @tenantId, @childOneAdmission, 'Sibling One', 'active'), " +
                "(@childTwoId, @tenantId, @childTwoAdmission, 'Sibling Two', 'active')",
                new { childOneId, childTwoId, tenantId, childOneAdmission, childTwoAdmission });
            await conn.ExecuteAsync(
                "INSERT dbo.ParentStudentLinks (Id, TenantId, ParentUserId, StudentAdmissionNo, IsPrimary, CreatedAt) VALUES " +
                "(@link1, @tenantId, @parentId, @childOneAdmission, 1, SYSUTCDATETIME()), " +
                "(@link2, @tenantId, @parentId, @childTwoAdmission, 0, SYSUTCDATETIME())",
                new { link1 = Guid.NewGuid(), link2 = Guid.NewGuid(), tenantId, parentId, childOneAdmission, childTwoAdmission });
        }

        await using var app = App();
        var client = Client(app, tenantId, parentId, Policies.StudentOrParent);

        var data = await Data(await client.GetAsync("/v1/parents/me/children"), HttpStatusCode.OK);

        var names = data.EnumerateArray().Select(e => e.GetProperty("name").GetString()).ToList();
        names.Should().Equal("Sibling One", "Sibling Two");
    }

    [Fact]
    public async Task Returns_empty_array_for_parent_with_no_linked_children()
    {
        var tenantId = Guid.NewGuid();
        await using var app = App();
        var client = Client(app, tenantId, Guid.NewGuid(), Policies.StudentOrParent);

        var data = await Data(await client.GetAsync("/v1/parents/me/children"), HttpStatusCode.OK);

        data.GetArrayLength().Should().Be(0);
    }
}
```

- [ ] **Step 2: Run it to verify it fails**

```bash
cd sms-backend && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~ParentChildrenTests"
```

Expected: 404 (no such route yet) or compile error.

- [ ] **Step 3: Write `IParentService`/`ParentService`**

Create `src/Sms.Application/Services/Parents/ParentService.cs`:

```csharp
using Sms.Modules.Sis.Contracts;
using Sms.Modules.Sis.Data;
using Sms.Shared.Kernel.Results;
using Sms.Shared.Kernel.Tenancy;

namespace Sms.Application.Services.Parents;

public interface IParentService
{
    Task<ApiResult<IReadOnlyList<StudentResponse>>> GetMyChildrenAsync(CancellationToken ct = default);
}

public sealed class ParentService(
    ParentStudentLinkRepository links,
    StudentRepository students,
    ITenantContext tenant) : IParentService
{
    public async Task<ApiResult<IReadOnlyList<StudentResponse>>> GetMyChildrenAsync(CancellationToken ct = default)
    {
        if (tenant.UserId is not { } uid)
            return ApiResult<IReadOnlyList<StudentResponse>>.Fail(new Error("unauthorized", "unauthorized"), 401);

        var admissionNos = await links.ListAdmissionNosForParentAsync(uid, ct);
        var kids = await students.ListByAdmissionNosAsync(admissionNos, ct);
        return ApiResult<IReadOnlyList<StudentResponse>>.Ok(kids);
    }
}
```

- [ ] **Step 4: Write `ParentController`**

Create `src/Sms.Api/Controllers/ParentController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.Services.Parents;

namespace Sms.Api.Controllers;

[Route("v1")]
[Authorize]
public sealed class ParentController(IParentService parent) : ApiControllerBase
{
    [HttpGet("parents/me/children")]
    public async Task<IActionResult> GetMyChildren(CancellationToken ct) =>
        FromResult(await parent.GetMyChildrenAsync(ct));
}
```

- [ ] **Step 5: Register `IParentService`**

In `src/Sms.Application/DependencyInjection.cs`, add this line next to the existing `services.AddScoped<ISisService, SisService>();`:

```csharp
services.AddScoped<IParentService, ParentService>();
```

- [ ] **Step 6: Run the test to verify it passes**

```bash
cd sms-backend && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~ParentChildrenTests"
```

Expected: both tests PASS.

- [ ] **Step 7: Full backend test suite + manual live check**

```bash
cd sms-backend && dotnet test
```

Expected: no new failures beyond any pre-existing unrelated ones (Reporting/Finance/Auth areas were already failing before this plan per prior session verification — confirm the failure list is unchanged, not grown).

Then, with the dev server running (restart it first if it's stale — see Global Constraints), hit the real endpoint:

```bash
TOKEN=$(curl -s -X POST http://localhost:5162/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"vaibhavvk@yopmail.com","password":"vaibhav@123","role":"parent"}' \
  --max-time 10 | sed -n 's/.*"access_token":"\([^"]*\)".*/\1/p')
curl -s "http://localhost:5162/v1/parents/me/children" -H "Authorization: Bearer $TOKEN" -w "\nSTATUS:%{http_code}\n"
```

Expected: `200`, one row (Rahul Sharma), matching Task 1 Step 4's backfill verification.

- [ ] **Step 8: Commit**

```bash
git add src/Sms.Application/Services/Parents/ParentService.cs src/Sms.Api/Controllers/ParentController.cs src/Sms.Application/DependencyInjection.cs tests/Sms.Tests.Integration/Parents/ParentChildrenTests.cs
git commit -m "feat(parent): add GET /v1/parents/me/children endpoint"
```

---

## Task 4: Wire the client to the real endpoint

**Files:**
- Modify: `src/services/http/index.ts:352-368` (the `parent: { ... }` block)
- Modify: `src/services/http/__tests__/httpServices.test.ts:197-213` (the two existing `parent.children` tests)

**Interfaces:**
- Consumes: `GET /v1/parents/me/children` (Task 3), returning a JSON array shaped like `StudentDTO` (snake_case: `id`, `name`, `class_label`, `grade`, `section`, `attendance_pct`, etc. — same shape the client's `toChild` mapper already reads via its `StudentDTO` branch, per `src/services/http/mappers.ts:394-412`). No mapper changes needed.
- Produces: `services.parent.children(): Promise<Child[]>` — same signature as today; `useChildren()`, `ChildProvider`, `KidSwitcher` consume this unchanged.

- [ ] **Step 1: Update the two existing tests to expect the new endpoint**

In `src/services/http/__tests__/httpServices.test.ts`, replace the two tests at lines 197-213:

```typescript
it('parent.children resolves the caller\'s own linked student via /students/me', async () => {
  clearSisStudentCache();
  const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce({ id: 'sis-1', name: 'Kid One' } as any);
  const kids = await httpServices.parent.children();
  expect(spy.mock.calls[0][0]).toBe('/students/me');
  expect(kids).toHaveLength(1);
  expect(kids[0]).toMatchObject({ id: 'sis-1', name: 'Kid One' });
});

it('parent.children returns [] when the account has no linked student', async () => {
  clearSisStudentCache();
  jest.spyOn(client, 'apiFetch').mockRejectedValue(new Error('not_found'));
  const kids = await httpServices.parent.children();
  expect(kids).toEqual([]);
});
```

with:

```typescript
it('parent.children lists every linked child via /parents/me/children', async () => {
  const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce([
    { id: 'sis-1', name: 'Kid One' },
    { id: 'sis-2', name: 'Kid Two' },
  ] as any);
  const kids = await httpServices.parent.children();
  expect(spy.mock.calls[0][0]).toBe('/parents/me/children');
  expect(kids).toHaveLength(2);
  expect(kids.map((k) => k.name)).toEqual(['Kid One', 'Kid Two']);
});

it('parent.children returns [] when the endpoint call fails', async () => {
  jest.spyOn(client, 'apiFetch').mockRejectedValue(new Error('network'));
  const kids = await httpServices.parent.children();
  expect(kids).toEqual([]);
});
```

Remove the now-unused `clearSisStudentCache` import from this test file if it has no other callers remaining in the file — check with `grep -n clearSisStudentCache src/services/http/__tests__/httpServices.test.ts` before deleting the import.

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd sms-student && npx jest httpServices --silent
```

Expected: the two new/changed tests FAIL (client still calls `/students/me`, and `mockResolvedValueOnce` now returns an array where the current code expects a single object).

- [ ] **Step 3: Update `services.parent.children()`**

In `src/services/http/index.ts`, find:

```typescript
  children: () => emptyOnError(async () => [toChild(await loadMyStudent())], []),
```

Replace with:

```typescript
  children: () =>
    emptyOnError(async () => (await getJson<StudentDTO[]>('/parents/me/children')).map(toChild), []),
```

`StudentDTO` and `toChild` are already imported in this file (used elsewhere for `toStudent`/`toChild` respectively) — confirm both imports are present; if `StudentDTO` isn't already imported here, add it to the existing `import type { ... } from './dtos'` block.

- [ ] **Step 4: Run the tests to verify they pass**

```bash
cd sms-student && npx jest httpServices --silent
```

Expected: PASS.

- [ ] **Step 5: Run the full frontend suite**

```bash
cd sms-student && npx tsc --noEmit && npx jest --silent
```

Expected: `tsc` shows no new errors beyond the pre-existing unrelated ones (`App.tsx`, `reportCard.test.ts`, `dtos.test.ts`, three lines in `httpServices.test.ts` around lines 287/303/328/407 — all already present before this plan). All test suites PASS.

- [ ] **Step 6: Manual live check**

With both the backend (Task 3 Step 7) and the frontend dev server running, log into the app as the parent test account (`vaibhavvk@yopmail.com` / `vaibhav@123`) and open the Class tab / Me tab — confirm the `KidSwitcher` chip row appears showing the linked child(ren) with no code changes needed there (it already iterates `useChildren()` generically). Since this account currently has exactly one linked child, this is mainly a smoke check that nothing broke — the meaningful multi-child check requires a second enrolled sibling sharing the same `GuardianEmail`, which is out of scope to fabricate here (real enrollment is a school-admin action).

- [ ] **Step 7: Commit**

```bash
git add src/services/http/index.ts src/services/http/__tests__/httpServices.test.ts
git commit -m "feat(parent): list all linked children via the real multi-child endpoint"
```

---

## Out of scope (per spec)

- Parent self-service linking/unlinking of children — admin/school-office operation only.
- Sending anything to *all* linked parents — primary-parent-only, and that logic already ships separately.
- Any UI redesign of `KidSwitcher`/`ChildProvider` — both already handle N children correctly today.
