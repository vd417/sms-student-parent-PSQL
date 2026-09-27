# Postgres `sms-api` End-to-End Wiring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prove the existing student/parent app works end to end against the Postgres-backed `sms-api` and real `sms_dev` data, fixing only confirmed breaks and adding the minimum PTM backend.

**Architecture:** A contract-check suite in the app repo logs in as a real student and a real parent, calls every endpoint the app uses, validates each response against the app's own DTO interfaces (required keys parsed from `src/services/http/dtos.ts`) and mappers, and prints a pass/warn/fail table. PTM gets a new Postgres table plus `GET /v1/ptm` and `PATCH /v1/ptm/{id}`. Everything else the check flags is triaged and fixed on the wrong side, one test-first fix at a time.

**Tech Stack:** App: Expo 54 / React Native 0.81 / TypeScript 5.9 / Jest (jest-expo) / `@microsoft/signalr`. Backend: .NET 10, ASP.NET Core, Dapper + Npgsql, PostgreSQL 18 with row-level security, xUnit + FluentAssertions integration tests against a real Postgres (`PostgresFixture`).

**Spec:** `docs/superpowers/specs/2026-09-26-psql-backend-e2e-wiring-design.md`

## Global Constraints

- Scope is strictly proving the existing apps work against `sms-api` + PostgreSQL.
- PTM: only `GET /v1/ptm` and `PATCH /v1/ptm/{id}`. No create endpoint, no wider PTM feature. Test rows go into `sms_dev` with SQL.
- Verify every assumed problem against current code and `sms_dev` before changing anything; drop what isn't confirmed.
- The contract check uses the real API and real PostgreSQL data only. No mocks, no fabricated responses.
- The check is read-only by default. Writes only with `CONTRACT_WRITES=1`, and it never calls a payment endpoint.
- Wire format is snake_case, success is `{data}`, errors are `{error:{code,message,details}}`.
- Test logins and raw responses (`scripts/contract-check/.env`, `scripts/contract-check/out/`) are never committed.
- Work happens on branch `feat/psql-e2e-wiring` in both repos. Commit, but **never push** until the user explicitly approves.
- Backend DB access runs as `sms_app` (RLS enforced); new tables need RLS policies and grants.

## Verification already done (no code change)

These spec items were checked against the code while writing this plan and are **not** broken. Task 2's live run re-confirms them against the server.

| Spec item | Finding | Evidence |
|---|---|---|
| Health ping | Works: `GET /health` returns `{status:"ok"}` | `sms-api/src/Sms.Api/Controllers/HealthController.cs` |
| Staff-only `POST fees/invoices/{id}/pay` | No screen calls `fees.pay`; only the mock test does. Parents use Razorpay order/verify | `grep -rn "fees.pay" src` |
| Paging | `GET fees/invoices` returns `CursorOk(data)` with no cursor; no other endpoint the app uses is cursor-paged. The check fails if any ever sets `next_cursor` | `FeeController.cs:37-46`, `ApiControllerBase.cs:32` |
| Route geometry storage | Table and RLS exist in the baseline | `db/postgres/04_tables.sql`, `07_rls_policies.sql` (grep `geometr`) |

## Review Focus

1. **A parent with several children:** every child's data must be checked, not just the first. Task 2's parent flow loops over every child from `/parents/me/children`.
2. **A parent confirming a meeting for a child who isn't theirs:** this must return 404 and leave the row unchanged. Covered by the Task 3 test `Parent_cannot_update_unlinked_meeting`.
3. **A student login calling `PATCH /v1/ptm/{id}`:** must be refused (403), because PTM confirmation is a parent action. Covered by the Task 3 test `Student_cannot_update_meeting`.
4. **A date that isn't ISO in the PTM mapper** (old data or mocks, e.g. `"May 3, 2026"`): must show as-is instead of `Invalid Date`. Covered by Task 4's passthrough test.
5. **A 401 or 5xx on one endpoint:** must not stop the run. It becomes a FAIL row and the remaining endpoints still run. Covered by Task 1's `evaluate` tests for non-2xx and by `probe` never throwing.

---

### Task 0: Branches, dependencies, credentials (setup, no code)

**Files:** none

- [ ] **Step 1: Create the app branch (already done)**

Run: `git -C "D:/convert/SMS backend/sms-student-parent-app" branch --show-current`
Expected: `feat/psql-e2e-wiring`

- [ ] **Step 2: Create the backend branch from `postgres-migration`**

```bash
cd "D:/convert/SMS backend/sms-api"
git status --short          # must be empty; if not, stop and ask the user
git switch postgres-migration
git switch -c feat/psql-e2e-wiring
```

- [ ] **Step 3: Install app dependencies**

Run: `cd "D:/convert/SMS backend/sms-student-parent-app" && npm install`
Expected: completes; `npm test` then runs the existing suite green (baseline).

- [ ] **Step 4: Confirm the backend runs against `sms_dev`**

```bash
cd "D:/convert/SMS backend/sms-api"
dotnet run --project db/Sms.PgMigrator -- status     # connection per docs/runbooks/postgres-migrations.md
dotnet run --project src/Sms.Api                     # listens on http://0.0.0.0:5162
curl -s http://localhost:5162/health                 # {"status":"ok"}
```
Expected: `status` shows 0001-0004 applied and nothing pending; health returns ok. Leave the API running in the background for Task 2.

- [ ] **Step 5: Ask the user for test logins**

Ask the user for one student login and one parent login (the parent needs linked children) in `sms_dev`. Write `scripts/contract-check/.env` yourself only with values the user gives you. It is covered by the existing `.env*` rule in `.gitignore`; confirm with `git check-ignore scripts/contract-check/.env`.

---

### Task 1: Contract-check library (DTO keys, response evaluation, HTTP helpers)

**Files:**
- Create: `scripts/contract-check/lib/requiredKeys.ts`
- Create: `scripts/contract-check/lib/evaluate.ts`
- Create: `scripts/contract-check/lib/api.ts`
- Create: `scripts/contract-check/lib/report.ts`
- Create: `scripts/contract-check/.env.example`
- Test: `scripts/contract-check/lib/requiredKeys.test.ts`
- Test: `scripts/contract-check/lib/evaluate.test.ts`
- Test: `scripts/contract-check/lib/api.test.ts`

**Interfaces:**
- Produces:
  - `parseRequiredKeys(source: string): Map<string, string[]>` and `requiredKeys(dto: string): string[]` (throws on an unknown interface)
  - `type Status = 'PASS' | 'WARN' | 'FAIL'`
  - `interface Expect { kind: 'object' | 'list'; dto?: string; keys?: string[]; map?: (item: any) => unknown; allowEmpty?: boolean }`
  - `evaluate(httpStatus: number, raw: unknown, expect: Expect, required: string[]): { status: Status; notes: string[]; data: unknown }`
  - `loginBody(identifier: string, password: string, role: 'student' | 'parent'): Record<string, string>`
  - `login(base: string, identifier: string, password: string, role: 'student' | 'parent'): Promise<string>` (returns the access token)
  - `call(base: string, token: string, path: string, init?: RequestInit): Promise<{ status: number; raw: unknown }>`
  - `interface CheckResult { role: string; name: string; path: string; status: Status; notes: string[] }`
  - `saveRaw(role: string, name: string, raw: unknown): void` and `formatTable(results: CheckResult[]): string`

- [ ] **Step 1: Write the failing tests**

`scripts/contract-check/lib/requiredKeys.test.ts`:

```ts
import { parseRequiredKeys, requiredKeys } from './requiredKeys';

describe('parseRequiredKeys', () => {
  it('returns only non-optional property names per interface', () => {
    const map = parseRequiredKeys(`
      export interface ADTO { id: string; name?: string; 'quoted_key': number; n: string | null }
      interface BDTO { x: number }
    `);
    expect(map.get('ADTO')).toEqual(['id', 'quoted_key', 'n']);
    expect(map.get('BDTO')).toEqual(['x']);
  });
});

describe('requiredKeys', () => {
  it('reads the real app dtos.ts', () => {
    expect(requiredKeys('PTMMeetingDTO')).toEqual(
      ['id', 'date', 'time', 'teacher', 'subject', 'child', 'mode', 'status'],
    );
  });
  it('throws for an unknown interface', () => {
    expect(() => requiredKeys('NopeDTO')).toThrow('unknown DTO interface: NopeDTO');
  });
});
```

`scripts/contract-check/lib/evaluate.test.ts`:

```ts
import { evaluate } from './evaluate';

describe('evaluate', () => {
  it('fails a non-2xx with the error code and message', () => {
    const r = evaluate(404, { error: { code: 'not_found', message: 'resource not found' } }, { kind: 'list' }, []);
    expect(r.status).toBe('FAIL');
    expect(r.notes).toEqual(['HTTP 404: not_found resource not found']);
  });
  it('fails when the {data} envelope is missing', () => {
    expect(evaluate(200, [1, 2], { kind: 'list' }, []).status).toBe('FAIL');
  });
  it('fails a list whose data is not an array', () => {
    expect(evaluate(200, { data: {} }, { kind: 'list' }, []).notes).toContain('expected data to be an array');
  });
  it('fails when next_cursor is set because the app reads the first page only', () => {
    const r = evaluate(200, { data: [], next_cursor: 'abc' }, { kind: 'list', allowEmpty: true }, []);
    expect(r.status).toBe('FAIL');
    expect(r.notes).toContain('next_cursor is set; the app reads the first page only');
  });
  it('warns on an empty list unless allowEmpty', () => {
    expect(evaluate(200, { data: [] }, { kind: 'list' }, []).status).toBe('WARN');
    expect(evaluate(200, { data: [] }, { kind: 'list', allowEmpty: true }, []).status).toBe('PASS');
  });
  it('fails when a required key is absent on any item, allowing null values', () => {
    const r = evaluate(200, { data: [{ id: '1', name: null }, { id: '2' }] }, { kind: 'list' }, ['id', 'name']);
    expect(r.status).toBe('FAIL');
    expect(r.notes).toEqual(['missing required keys: name']);
  });
  it('fails a null object payload', () => {
    expect(evaluate(200, { data: null }, { kind: 'object' }, []).notes).toEqual(['data is null']);
  });
  it('fails when the mapper throws', () => {
    const r = evaluate(200, { data: { id: 1 } }, {
      kind: 'object',
      map: () => { throw new Error('boom'); },
    }, []);
    expect(r.notes).toEqual(['mapper threw: boom']);
  });
  it('passes a well-formed object and returns data', () => {
    const r = evaluate(200, { data: { id: 'x' } }, { kind: 'object', map: (d) => d }, ['id']);
    expect(r).toEqual({ status: 'PASS', notes: [], data: { id: 'x' } });
  });
  it('passes a 204 with no body for an object check only when no keys are required', () => {
    expect(evaluate(204, null, { kind: 'object' }, []).status).toBe('PASS');
  });
});
```

`scripts/contract-check/lib/api.test.ts`:

```ts
import { loginBody } from './api';

describe('loginBody', () => {
  it('uses email when the identifier contains @', () => {
    expect(loginBody('a@b.com', 'pw', 'parent')).toEqual({ email: 'a@b.com', password: 'pw', role: 'parent' });
  });
  it('uses phone for 7-15 digits', () => {
    expect(loginBody('9876543210', 'pw', 'parent')).toEqual({ phone: '9876543210', password: 'pw', role: 'parent' });
  });
  it('uses student_id otherwise', () => {
    expect(loginBody('ADM/2026/001', 'pw', 'student')).toEqual({ student_id: 'ADM/2026/001', password: 'pw', role: 'student' });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx jest scripts/contract-check/lib`
Expected: FAIL with "Cannot find module './requiredKeys'" (and the same for `./evaluate` and `./api`).

- [ ] **Step 3: Implement the library**

`scripts/contract-check/lib/requiredKeys.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

// Required (non-`?`) keys of every interface in the app's wire DTOs. This keeps the check in
// lock-step with what the app actually declares, with no hand-maintained schema. Keys inherited
// through `extends` are not followed.
const DTO_FILE = path.resolve(__dirname, '../../../src/services/http/dtos.ts');
let cache: Map<string, string[]> | null = null;

export function parseRequiredKeys(source: string): Map<string, string[]> {
  const sf = ts.createSourceFile('dtos.ts', source, ts.ScriptTarget.Latest, true);
  const out = new Map<string, string[]>();
  sf.forEachChild((node) => {
    if (!ts.isInterfaceDeclaration(node)) return;
    const keys = node.members
      .filter(ts.isPropertySignature)
      .filter((m) => !m.questionToken)
      .map((m) => m.name.getText(sf).replace(/^['"]|['"]$/g, ''));
    out.set(node.name.text, keys);
  });
  return out;
}

export function requiredKeys(dto: string): string[] {
  cache ??= parseRequiredKeys(fs.readFileSync(DTO_FILE, 'utf8'));
  const keys = cache.get(dto);
  if (!keys) throw new Error(`unknown DTO interface: ${dto}`);
  return keys;
}
```

`scripts/contract-check/lib/evaluate.ts`:

```ts
export type Status = 'PASS' | 'WARN' | 'FAIL';

export interface Expect {
  kind: 'object' | 'list';
  dto?: string;
  keys?: string[];
  map?: (item: any) => unknown;
  allowEmpty?: boolean;
}

type Outcome = { status: Status; notes: string[]; data: unknown };

const fail = (notes: string[], data: unknown = undefined): Outcome => ({ status: 'FAIL', notes, data });

export function evaluate(httpStatus: number, raw: unknown, expect: Expect, required: string[]): Outcome {
  if (httpStatus < 200 || httpStatus >= 300) {
    const err = (raw as { error?: { code?: string; message?: string } } | null)?.error;
    return fail([`HTTP ${httpStatus}: ${err?.code ?? '-'} ${err?.message ?? ''}`.trim()]);
  }
  if (httpStatus === 204 && expect.kind === 'object' && required.length === 0) {
    return { status: 'PASS', notes: [], data: null };
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || !('data' in raw)) {
    return fail(['missing {data} envelope']);
  }
  const env = raw as { data: unknown; next_cursor?: string | null };
  const data = env.data;

  let items: unknown[];
  if (expect.kind === 'list') {
    if (!Array.isArray(data)) return fail(['expected data to be an array']);
    if (env.next_cursor) return fail(['next_cursor is set; the app reads the first page only'], data);
    items = data;
  } else {
    if (data === null || data === undefined) return fail(['data is null']);
    items = [data];
  }

  const missing = new Set<string>();
  for (const item of items) {
    for (const key of required) {
      if (item === null || typeof item !== 'object' || !(key in item)) missing.add(key);
    }
  }
  if (missing.size > 0) return fail([`missing required keys: ${[...missing].join(', ')}`], data);

  if (expect.map) {
    try {
      items.forEach((item) => expect.map!(item));
    } catch (e) {
      return fail([`mapper threw: ${(e as Error).message}`], data);
    }
  }

  if (expect.kind === 'list' && items.length === 0 && !expect.allowEmpty) {
    return { status: 'WARN', notes: ['empty list'], data };
  }
  return { status: 'PASS', notes: [], data };
}
```

`scripts/contract-check/lib/api.ts`:

```ts
// Mirrors the app's identifier rule (docs/superpowers/specs/2026-07-24-admission-id-auth-design.md):
// contains '@' → email; 7–15 digits → phone; anything else → admission id.
export function loginBody(identifier: string, password: string, role: 'student' | 'parent'): Record<string, string> {
  const id = identifier.trim();
  if (id.includes('@')) return { email: id, password, role };
  if (/^\d{7,15}$/.test(id)) return { phone: id, password, role };
  return { student_id: id, password, role };
}

export async function call(
  base: string, token: string, path: string, init: RequestInit = {},
): Promise<{ status: number; raw: unknown }> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` };
  if (init.body) headers['Content-Type'] = 'application/json';
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...headers, ...(init.headers as object) } });
  const text = await res.text();
  let raw: unknown = null;
  if (text) {
    try { raw = JSON.parse(text); } catch { raw = { error: { code: 'non_json', message: text.slice(0, 200) } }; }
  }
  return { status: res.status, raw };
}

export async function login(
  base: string, identifier: string, password: string, role: 'student' | 'parent',
): Promise<string> {
  const res = await fetch(`${base}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(loginBody(identifier, password, role)),
  });
  const body = (await res.json()) as { data?: { access_token?: string }; error?: { code: string; message: string } };
  if (!res.ok || !body.data?.access_token) {
    throw new Error(`${role} login failed: HTTP ${res.status} ${body.error?.code ?? ''} ${body.error?.message ?? ''}`);
  }
  return body.data.access_token;
}
```

`scripts/contract-check/lib/report.ts`:

```ts
import * as fs from 'fs';
import * as path from 'path';
import type { Status } from './evaluate';

export interface CheckResult { role: string; name: string; path: string; status: Status; notes: string[] }

const OUT_DIR = path.resolve(__dirname, '../out');

// Raw responses hold real school data: out/ is git-ignored and stays on this machine.
export function saveRaw(role: string, name: string, raw: unknown): void {
  const dir = path.join(OUT_DIR, role);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${name}.json`), JSON.stringify(raw, null, 2));
}

export function formatTable(results: CheckResult[]): string {
  const rows = results.map((r) => `${r.status.padEnd(4)}  ${r.role.padEnd(7)}  ${r.name.padEnd(28)}  ${r.path}${r.notes.length ? `\n        ↳ ${r.notes.join('; ')}` : ''}`);
  const count = (s: Status) => results.filter((r) => r.status === s).length;
  return [...rows, '', `PASS ${count('PASS')}  WARN ${count('WARN')}  FAIL ${count('FAIL')}`].join('\n');
}
```

`scripts/contract-check/.env.example`:

```
# Copy to .env (git-ignored). Real sms_dev logins; never commit them.
API_BASE_URL=http://localhost:5162/v1
STUDENT_IDENTIFIER=
STUDENT_PASSWORD=
PARENT_IDENTIFIER=
PARENT_PASSWORD=
```

Add `scripts/contract-check/out/` to `.gitignore`:

```
# contract-check raw responses (real school data)
scripts/contract-check/out/
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest scripts/contract-check/lib`
Expected: PASS (3 suites). If `requiredKeys('PTMMeetingDTO')` differs, the DTO changed; update the expectation to match `dtos.ts:192`.

- [ ] **Step 5: Commit**

```bash
git add scripts/contract-check/lib scripts/contract-check/.env.example .gitignore
git commit -m "test(contract): DTO-driven response evaluation library for the live contract check"
```

---

### Task 2: Live contract run (catalog, SignalR, baseline findings)

**Files:**
- Create: `scripts/contract-check/jest.config.js`
- Create: `scripts/contract-check/live.contract.ts`
- Create: `scripts/contract-check/FINDINGS.md`
- Modify: `package.json` (scripts)

**Interfaces:**
- Consumes: everything Task 1 produces; the mappers `toStudent, toSubject, toAchievement, toTeacher, toHomework, toExam, toGrade, toAnnouncement, toNotice, toChatThread, toChatMessage, toChild, toFee, toPTM, toTransport, toLeaveRequest` from `src/services/http/mappers.ts` (all take a single DTO).
- Produces: `npm run contract-check` (exit 0 = no FAIL) and `FINDINGS.md`, the triage log Task 5 works through.

- [ ] **Step 1: Add the jest config and the npm script**

`scripts/contract-check/jest.config.js`:

```js
// Live contract suite: real API, real sms_dev data. Not part of `npm test`.
const base = require('../../jest.config');

module.exports = {
  ...base,
  rootDir: '../..',
  testEnvironment: 'node',
  testMatch: ['<rootDir>/scripts/contract-check/**/*.contract.ts'],
  testTimeout: 120000,
};
```

In `package.json` `scripts`, add:

```json
"contract-check": "jest --config scripts/contract-check/jest.config.js --runInBand"
```

- [ ] **Step 2: Write the live suite**

`scripts/contract-check/live.contract.ts`:

```ts
import * as path from 'path';
import * as signalR from '@microsoft/signalr';
import {
  toStudent, toSubject, toAchievement, toTeacher, toHomework, toExam, toGrade, toAnnouncement,
  toNotice, toChatThread, toChatMessage, toChild, toFee, toPTM, toTransport, toLeaveRequest,
} from '@/services/http/mappers';
import { call, login } from './lib/api';
import { evaluate, type Expect } from './lib/evaluate';
import { formatTable, saveRaw, type CheckResult } from './lib/report';
import { requiredKeys } from './lib/requiredKeys';

process.loadEnvFile(path.resolve(__dirname, '.env'));
const BASE = (process.env.API_BASE_URL ?? '').replace(/\/$/, '');
const WRITES = process.env.CONTRACT_WRITES === '1';
const results: CheckResult[] = [];

type Ctx = { role: string; token: string };
type Row = Record<string, any>;

const ymd = (d: Date) => d.toISOString().slice(0, 10);
const today = new Date();
const FROM = ymd(new Date(today.getTime() - 90 * 86400000));
const TO = ymd(today);

// Never throws: an HTTP or network failure becomes a FAIL row and the run continues.
async function probe(ctx: Ctx, name: string, p: string, expect: Expect, init?: RequestInit): Promise<any> {
  try {
    const { status, raw } = await call(BASE, ctx.token, p, init);
    saveRaw(ctx.role, name, raw);
    const required = expect.dto ? requiredKeys(expect.dto) : expect.keys ?? [];
    const r = evaluate(status, raw, expect, required);
    results.push({ role: ctx.role, name, path: p, status: r.status, notes: r.notes });
    return r.status === 'FAIL' ? undefined : r.data;
  } catch (e) {
    results.push({ role: ctx.role, name, path: p, status: 'FAIL', notes: [`request threw: ${(e as Error).message}`] });
    return undefined;
  }
}

async function perStudent(ctx: Ctx, sid: string, tag: string) {
  const q = `student_id=${encodeURIComponent(sid)}`;
  const s = encodeURIComponent(sid);
  await probe(ctx, `${tag}timetable`, `/students/${s}/timetable`, { kind: 'list', dto: 'TimetableSlotDTO' });
  const subjects: Row[] | undefined = await probe(ctx, `${tag}subjects`, `/subjects?${q}`, { kind: 'list', dto: 'SubjectDTO', map: toSubject });
  if (subjects?.[0]) await probe(ctx, `${tag}subject`, `/subjects/${subjects[0].id}`, { kind: 'object', dto: 'SubjectDTO', map: toSubject });
  await probe(ctx, `${tag}achievements`, `/achievements?${q}`, { kind: 'list', dto: 'AchievementDTO', map: toAchievement, allowEmpty: true });
  const hw: Row[] | undefined = await probe(ctx, `${tag}homework`, `/homework?${q}`, { kind: 'list', dto: 'HomeworkDTO', map: toHomework });
  if (hw?.[0]) await probe(ctx, `${tag}homework-one`, `/homework/${hw[0].id}`, { kind: 'object', dto: 'HomeworkDTO', map: toHomework });
  await probe(ctx, `${tag}grades`, `/grades?${q}`, { kind: 'list', dto: 'GradeDTO', map: toGrade });
  await probe(ctx, `${tag}exam-papers`, `/exam-papers?${q}`, { kind: 'list', dto: 'ExamPaperDTO', map: toExam });
  await probe(ctx, `${tag}attendance`, `/students/${s}/attendance?from=${FROM}&to=${TO}`, { kind: 'list', dto: 'AttendanceRecordDTO' });
  await probe(ctx, `${tag}attendance-periods`, `/students/${s}/attendance/periods?from=${FROM}&to=${TO}`, { kind: 'list', dto: 'AttendanceRecordDTO', allowEmpty: true });
  await probe(ctx, `${tag}attendance-summary`, `/students/${s}/attendance/summary?from=${FROM}&to=${TO}`, { kind: 'object' });
  await probe(ctx, `${tag}fees`, `/fees/invoices?${q}`, { kind: 'list', dto: 'FeeInvoiceDTO', map: toFee });
  await probe(ctx, `${tag}leave`, `/leave?${q}`, { kind: 'list', dto: 'LeaveRequestDTO', map: toLeaveRequest, allowEmpty: true });
}

async function common(ctx: Ctx, audience: 'student' | 'parent') {
  await probe(ctx, 'announcements', `/announcements?audience=${audience}`, { kind: 'list', dto: 'AnnouncementDTO', map: toAnnouncement });
  await probe(ctx, 'notifications', '/notifications', { kind: 'list', dto: 'NotificationDTO', map: toNotice, allowEmpty: true });
  await probe(ctx, 'settings', '/me/settings', { kind: 'object', dto: 'AppSettingsDTO' });
  const threads: Row[] | undefined = await probe(ctx, 'threads', '/threads', { kind: 'list', dto: 'ChatThreadDTO', map: toChatThread, allowEmpty: true });
  if (threads?.[0]) await probe(ctx, 'thread-messages', `/threads/${threads[0].id}/messages`, { kind: 'list', dto: 'ChatMessageDTO', map: toChatMessage, allowEmpty: true });
  await probe(ctx, 'teachers', '/teachers', { kind: 'list', dto: 'TeacherDTO', map: toTeacher });
  const buses: Row[] | undefined = await probe(ctx, 'bus', '/me/children/bus', { kind: 'list', dto: 'ChildBusPositionDTO', map: toTransport, allowEmpty: true });
  const routeId = buses?.find((b) => b.route_id)?.route_id;
  if (routeId) await probe(ctx, 'route-geometry', `/transport/routes/${routeId}/geometry`, { kind: 'object', keys: ['route_id', 'status'] });
  if (WRITES) await probe(ctx, 'notifications-read', '/notifications/read', { kind: 'object' }, { method: 'POST', body: '{}' });
}

async function hubCheck(ctx: Ctx, hub: string, invoke?: string) {
  const origin = BASE.replace(/\/v1$/, '');
  const conn = new signalR.HubConnectionBuilder()
    .withUrl(`${origin}${hub}`, { accessTokenFactory: () => ctx.token })
    .configureLogging(signalR.LogLevel.None)
    .build();
  try {
    await conn.start();
    if (invoke) await conn.invoke(invoke);
    results.push({ role: ctx.role, name: `hub${hub}`, path: hub, status: 'PASS', notes: [] });
  } catch (e) {
    results.push({ role: ctx.role, name: `hub${hub}`, path: hub, status: 'FAIL', notes: [(e as Error).message] });
  } finally {
    await conn.stop();
  }
}

describe('live contract: sms-api + sms_dev', () => {
  beforeAll(() => {
    if (!BASE) throw new Error('API_BASE_URL missing: copy scripts/contract-check/.env.example to .env');
    if (jest.isMockFunction(globalThis.fetch)) throw new Error('fetch is mocked; the live check needs real network');
  });

  test('student', async () => {
    const ctx = { role: 'student', token: await login(BASE, process.env.STUDENT_IDENTIFIER!, process.env.STUDENT_PASSWORD!, 'student') };
    await probe(ctx, 'auth-me', '/auth/me', { kind: 'object', dto: 'SessionUserDTO' });
    const me: Row | undefined = await probe(ctx, 'students-me', '/students/me', { kind: 'object', dto: 'StudentDTO', map: toStudent });
    await probe(ctx, 'timetable-own', '/timetable', { kind: 'list', dto: 'TimetableSlotDTO' });
    if (me?.id) await perStudent(ctx, me.id, '');
    else results.push({ role: 'student', name: 'per-student', path: '-', status: 'FAIL', notes: ['no student id from /students/me; per-student checks skipped'] });
    await common(ctx, 'student');
    await hubCheck(ctx, '/hubs/live');
  });

  test('parent', async () => {
    const ctx = { role: 'parent', token: await login(BASE, process.env.PARENT_IDENTIFIER!, process.env.PARENT_PASSWORD!, 'parent') };
    await probe(ctx, 'auth-me', '/auth/me', { kind: 'object', dto: 'SessionUserDTO' });
    const kids: Row[] | undefined = await probe(ctx, 'children', '/parents/me/children', { kind: 'list', dto: 'StudentDTO', map: toChild });
    for (const [i, kid] of (kids ?? []).entries()) await perStudent(ctx, kid.id, `child${i + 1}-`);
    const ptm: Row[] | undefined = await probe(ctx, 'ptm', '/ptm', { kind: 'list', dto: 'PTMMeetingDTO', map: toPTM });
    if (WRITES && ptm?.[0]) {
      // Re-send the current status: exercises the write path without changing data.
      await probe(ctx, 'ptm-set-status', `/ptm/${ptm[0].id}`, { kind: 'object', dto: 'PTMMeetingDTO', map: toPTM },
        { method: 'PATCH', body: JSON.stringify({ status: ptm[0].status }) });
    }
    await common(ctx, 'parent');
    await hubCheck(ctx, '/hubs/live');
    await hubCheck(ctx, '/hubs/transport-fleet', 'JoinMyChildrenBuses');
  });

  afterAll(() => {
    console.log(`\n${formatTable(results)}\n`);
    const failed = results.filter((r) => r.status === 'FAIL').map((r) => `${r.role}/${r.name}`);
    expect(failed).toEqual([]);
  });
});
```

- [ ] **Step 3: Run the baseline**

Run: `npm run contract-check` (API from Task 0 running, `.env` filled in)
Expected: the table prints. `parent/ptm` FAILs with `HTTP 404` until Task 3 lands. Other FAIL/WARN rows are real findings.

If the suite errors before any request is sent (preset or transform problem), set `preset: 'jest-expo/node'` in `scripts/contract-check/jest.config.js` and re-run. If `fetch is mocked` is thrown, remove `setupFiles` from the spread (`setupFiles: []`) and re-run.

- [ ] **Step 4: Record the findings**

Create `scripts/contract-check/FINDINGS.md` with one row per FAIL and per WARN from the table:

```markdown
# Contract-check findings

Run against sms-api `feat/psql-e2e-wiring` + `sms_dev` on 2026-09-26.

| # | Row | Result | Evidence (raw file in out/, not committed) | Verdict | Side | Fix commit |
|---|-----|--------|--------------------------------------------|---------|------|-----------|
| 1 | parent/ptm | FAIL HTTP 404 | out/parent/ptm.json | confirmed: route missing | backend | Task 3 |
```

Fill in the real rows. Leave the `Verdict`, `Side` and `Fix commit` columns empty for anything not yet triaged; Task 5 fills them.

- [ ] **Step 5: Commit**

```bash
git add scripts/contract-check/jest.config.js scripts/contract-check/live.contract.ts scripts/contract-check/FINDINGS.md package.json
git commit -m "test(contract): live student/parent contract check against sms-api + sms_dev"
```

---

### Task 3: Backend PTM: table, repository, service, endpoints (`sms-api`)

**Files:**
- Create: `db/postgres/migrations/0005_ptm_meetings.sql`
- Create: `src/Sms.Modules.Comms/Ptm.cs`
- Modify: `src/Sms.Modules.Comms/CommsModule.cs:543` (register `PtmRepository`)
- Create: `src/Sms.Application/Services/Comms/PtmService.cs`
- Modify: `src/Sms.Application/DependencyInjection.cs:66` (register `IPtmService`)
- Create: `src/Sms.Api/Controllers/PtmController.cs`
- Modify: `src/Sms.Api/Swagger/ApiAudienceMap.cs` (rule `("v1/ptm", [Student])` after `("v1/parents", [Student])`)
- Test: `tests/Sms.Tests.Integration/Comms/PtmTests.cs`

**Interfaces:**
- Produces (HTTP, consumed by the app's existing `ptm.list` / `ptm.setStatus` and Task 2):
  - `GET /v1/ptm` → `{data: [{id, date: "YYYY-MM-DD", time: "HH:MM", teacher, subject, child: <student uuid>, mode, status: "pending"|"confirmed"}]}`
  - `PATCH /v1/ptm/{id}` body `{status}` → `{data: <same item>}`; 403 `forbidden` for a non-parent, 404 `not_found` for a missing or unlinked meeting, 422 `invalid_status`.
- C#: `public sealed record PtmMeetingResponse(Guid Id, string Date, string Time, string Teacher, string? Subject, Guid Child, string Mode, string Status);`, `public sealed record SetPtmStatusRequest(string? Status);`, `IPtmService.ListAsync(CancellationToken)` and `IPtmService.SetStatusAsync(Guid id, string? status, ClaimsPrincipal caller, CancellationToken)`.

- [ ] **Step 1: Write the failing integration tests**

`tests/Sms.Tests.Integration/Comms/PtmTests.cs`:

```csharp
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Dapper;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Npgsql;
using Sms.Shared.Kernel.Auth;
using Sms.Shared.Kernel.Time;
using Xunit;

namespace Sms.Tests.Integration.Comms;

[Collection("sql")]
public class PtmTests(PostgresFixture fx)
{
    private const string Key = "integration-test-signing-key-32-bytes-min!!";

    private WebApplicationFactory<Program> App() =>
        new WebApplicationFactory<Program>().WithWebHostBuilder(b =>
        {
            b.UseSetting("environment", "Production");
            b.UseSetting("ConnectionStrings:Sql", fx.ConnectionString);
            b.UseSetting("Jwt:SigningKey", Key);
        });

    [Fact]
    public async Task Parent_lists_only_linked_childrens_meetings()
    {
        await using var app = App();
        var seed = await SeedAsync();
        var client = Client(app, seed.ParentUserId, seed.TenantId, "parent");

        var res = await client.GetAsync("/v1/ptm");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        var items = doc.RootElement.GetProperty("data").EnumerateArray().ToList();
        items.Should().ContainSingle();
        var m = items[0];
        m.GetProperty("id").GetGuid().Should().Be(seed.LinkedMeetingId);
        m.GetProperty("child").GetGuid().Should().Be(seed.LinkedStudentId);
        m.GetProperty("teacher").GetString().Should().Be("Ms. A. Krishnan");
        m.GetProperty("subject").GetString().Should().Be("Mathematics");
        m.GetProperty("date").GetString().Should().Be("2026-10-03");
        m.GetProperty("time").GetString().Should().Be("15:00");
        m.GetProperty("mode").GetString().Should().Be("Video call");
        m.GetProperty("status").GetString().Should().Be("pending");
    }

    [Fact]
    public async Task Student_lists_own_meetings()
    {
        await using var app = App();
        var seed = await SeedAsync();
        var client = Client(app, seed.StudentUserId, seed.TenantId, "student");

        var res = await client.GetAsync("/v1/ptm");

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("data").EnumerateArray()
            .Select(e => e.GetProperty("id").GetGuid()).Should().Equal(seed.LinkedMeetingId);
    }

    [Fact]
    public async Task Parent_confirms_linked_meeting()
    {
        await using var app = App();
        var seed = await SeedAsync();
        var client = Client(app, seed.ParentUserId, seed.TenantId, "parent");

        var res = await client.PatchAsJsonAsync($"/v1/ptm/{seed.LinkedMeetingId}", new { status = "confirmed" });

        res.StatusCode.Should().Be(HttpStatusCode.OK);
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        doc.RootElement.GetProperty("data").GetProperty("status").GetString().Should().Be("confirmed");
        (await StatusOfAsync(seed.TenantId, seed.LinkedMeetingId)).Should().Be("confirmed");
    }

    [Fact]
    public async Task Parent_cannot_update_unlinked_meeting()
    {
        await using var app = App();
        var seed = await SeedAsync();
        var client = Client(app, seed.ParentUserId, seed.TenantId, "parent");

        var res = await client.PatchAsJsonAsync($"/v1/ptm/{seed.OtherMeetingId}", new { status = "confirmed" });

        res.StatusCode.Should().Be(HttpStatusCode.NotFound);
        (await ErrorCodeAsync(res)).Should().Be("not_found");
        (await StatusOfAsync(seed.TenantId, seed.OtherMeetingId)).Should().Be("pending");
    }

    [Fact]
    public async Task Invalid_status_is_rejected()
    {
        await using var app = App();
        var seed = await SeedAsync();
        var client = Client(app, seed.ParentUserId, seed.TenantId, "parent");

        var res = await client.PatchAsJsonAsync($"/v1/ptm/{seed.LinkedMeetingId}", new { status = "cancelled" });

        res.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        (await ErrorCodeAsync(res)).Should().Be("invalid_status");
    }

    [Fact]
    public async Task Student_cannot_update_meeting()
    {
        await using var app = App();
        var seed = await SeedAsync();
        var client = Client(app, seed.StudentUserId, seed.TenantId, "student");

        var res = await client.PatchAsJsonAsync($"/v1/ptm/{seed.LinkedMeetingId}", new { status = "confirmed" });

        res.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        (await StatusOfAsync(seed.TenantId, seed.LinkedMeetingId)).Should().Be("pending");
    }

    private static async Task<string?> ErrorCodeAsync(HttpResponseMessage res)
    {
        using var doc = JsonDocument.Parse(await res.Content.ReadAsStringAsync());
        return doc.RootElement.GetProperty("error").GetProperty("code").GetString();
    }

    private async Task<string> StatusOfAsync(Guid tenantId, Guid meetingId)
    {
        await using var conn = new NpgsqlConnection(fx.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("SELECT set_config('app.tenant_id', @tenantId::text, false)", new { tenantId });
        return await conn.ExecuteScalarAsync<string>(
            "SELECT \"Status\" FROM \"dbo\".\"PtmMeetings\" WHERE \"Id\" = @meetingId", new { meetingId }) ?? "";
    }

    private static HttpClient Client(WebApplicationFactory<Program> app, Guid userId, Guid tenantId, string role)
    {
        var jwt = new JwtTokenService(
            new JwtOptions { Issuer = "sms", Audience = "sms-apps", SigningKey = Key, AccessTokenMinutes = 15 },
            new SystemClock());
        var client = app.CreateClient();
        client.DefaultRequestHeaders.Authorization = new("Bearer", jwt.IssueAccess(userId, tenantId, [role], isPlatform: false));
        return client;
    }

    private async Task<PtmSeed> SeedAsync()
    {
        var s = new PtmSeed(Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid(),
            Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid());
        var admissionNo = $"PTM/{s.LinkedStudentId.ToString()[..8]}";
        await using var conn = new NpgsqlConnection(fx.ConnectionString);
        await conn.OpenAsync();
        await conn.ExecuteAsync("SELECT set_config('app.tenant_id', @TenantId::text, false)", new { s.TenantId });
        await conn.ExecuteAsync(@"
INSERT INTO ""dbo"".""Users"" (""Id"", ""TenantId"", ""StudentId"", ""IsPlatform"", ""Status"") VALUES
    (@ParentUserId, @TenantId, NULL, false, 'active'),
    (@StudentUserId, @TenantId, @admissionNo, false, 'active');
INSERT INTO ""dbo"".""Students"" (""Id"", ""TenantId"", ""AdmissionNo"", ""Name"", ""Status"") VALUES
    (@LinkedStudentId, @TenantId, @admissionNo, 'Linked Student', 'active'),
    (@OtherStudentId, @TenantId, @otherAdmissionNo, 'Other Student', 'active');
INSERT INTO ""dbo"".""ParentStudentLinks"" (""ParentUserId"", ""StudentId"", ""TenantId"")
VALUES (@ParentUserId, @LinkedStudentId, @TenantId);
INSERT INTO ""dbo"".""Teachers"" (""Id"", ""TenantId"", ""Name"") VALUES (@TeacherId, @TenantId, 'Ms. A. Krishnan');
INSERT INTO ""dbo"".""PtmMeetings""
    (""Id"", ""TenantId"", ""StudentId"", ""TeacherId"", ""Subject"", ""MeetingDate"", ""MeetingTime"", ""Mode"") VALUES
    (@LinkedMeetingId, @TenantId, @LinkedStudentId, @TeacherId, 'Mathematics', '2026-10-03', '15:00', 'Video call'),
    (@OtherMeetingId, @TenantId, @OtherStudentId, @TeacherId, 'Physics', '2026-10-04', '09:30', 'In-person · Room C-214');",
            new
            {
                s.TenantId, s.ParentUserId, s.StudentUserId, s.LinkedStudentId, s.OtherStudentId, s.TeacherId,
                s.LinkedMeetingId, s.OtherMeetingId, admissionNo,
                otherAdmissionNo = $"PTM/{s.OtherStudentId.ToString()[..8]}",
            });
        return s;
    }

    private sealed record PtmSeed(
        Guid TenantId, Guid ParentUserId, Guid StudentUserId, Guid LinkedStudentId, Guid OtherStudentId,
        Guid TeacherId, Guid LinkedMeetingId, Guid OtherMeetingId);
}
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd "D:/convert/SMS backend/sms-api" && dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~PtmTests"`
Expected: FAIL. Seeding throws `relation "dbo.PtmMeetings" does not exist`.

- [ ] **Step 3: Write the migration**

`db/postgres/migrations/0005_ptm_meetings.sql`:

```sql
-- 0005: dbo.PtmMeetings, the minimum storage behind GET /v1/ptm and PATCH /v1/ptm/{id}
-- (parent/student app PTM screen). Additive only: a new table, index, RLS policies and grants.
-- Rollback: DROP TABLE "dbo"."PtmMeetings";

CREATE TABLE "dbo"."PtmMeetings" (
    "Id" uuid DEFAULT gen_random_uuid() NOT NULL,
    "TenantId" uuid NOT NULL,
    "StudentId" uuid NOT NULL,
    "TeacherId" uuid,
    "Subject" varchar(120),
    "MeetingDate" date NOT NULL,
    "MeetingTime" time NOT NULL,
    "Mode" varchar(120) NOT NULL,
    "Status" varchar(20) DEFAULT 'pending' NOT NULL,
    "CreatedAt" timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT "PK_PtmMeetings" PRIMARY KEY ("Id"),
    CONSTRAINT "CK_PtmMeetings_Status" CHECK ("Status" IN ('pending', 'confirmed'))
);

CREATE INDEX "IX_PtmMeetings_Tenant_Student_Date"
    ON "dbo"."PtmMeetings" ("TenantId", "StudentId", "MeetingDate");

ALTER TABLE "dbo"."PtmMeetings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "dbo"."PtmMeetings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "PtmMeetingsTenantPolicy_select" ON "dbo"."PtmMeetings" FOR SELECT USING (rls.is_platform() OR "TenantId" = rls.current_tenant_id());
CREATE POLICY "PtmMeetingsTenantPolicy_update" ON "dbo"."PtmMeetings" FOR UPDATE USING (rls.is_platform() OR "TenantId" = rls.current_tenant_id()) WITH CHECK (rls.is_platform() OR "TenantId" = rls.current_tenant_id());
CREATE POLICY "PtmMeetingsTenantPolicy_delete" ON "dbo"."PtmMeetings" FOR DELETE USING (rls.is_platform() OR "TenantId" = rls.current_tenant_id());
CREATE POLICY "PtmMeetingsTenantPolicy_insert" ON "dbo"."PtmMeetings" FOR INSERT WITH CHECK (rls.is_platform() OR "TenantId" = rls.current_tenant_id());

-- 99_app_role_grants.sql ran before this table existed.
GRANT SELECT, INSERT, UPDATE, DELETE ON "dbo"."PtmMeetings" TO sms_app;
```

- [ ] **Step 4: Write the repository and contracts**

`src/Sms.Modules.Comms/Ptm.cs`:

```csharp
using Sms.Shared.Kernel.Data;

namespace Sms.Modules.Comms;

/// Wire shape the student/parent app already consumes (PTMMeetingDTO): date is YYYY-MM-DD,
/// time is HH:MM, child is the student id.
public sealed record PtmMeetingResponse(
    Guid Id, string Date, string Time, string Teacher, string? Subject, Guid Child, string Mode, string Status);
public sealed record SetPtmStatusRequest(string? Status);

public sealed class PtmRepository(IDbConnectionFactory factory) : BaseRepository(factory)
{
    private const string Select =
        "SELECT m.\"Id\", to_char(m.\"MeetingDate\", 'YYYY-MM-DD') AS \"Date\", " +
        "to_char(m.\"MeetingTime\", 'HH24:MI') AS \"Time\", COALESCE(t.\"Name\", '') AS \"Teacher\", " +
        "m.\"Subject\", m.\"StudentId\" AS \"Child\", m.\"Mode\", m.\"Status\" " +
        "FROM \"dbo\".\"PtmMeetings\" m " +
        "LEFT JOIN \"dbo\".\"Teachers\" t ON t.\"Id\" = m.\"TeacherId\" AND t.\"TenantId\" = m.\"TenantId\" ";

    public Task<IReadOnlyList<PtmMeetingResponse>> ListForStudentsAsync(
        Guid tenantId, Guid[] studentIds, CancellationToken ct = default) =>
        QueryInlineAsync<PtmMeetingResponse>(
            Select + "WHERE m.\"TenantId\" = @tenantId AND m.\"StudentId\" = ANY(@studentIds) " +
            "ORDER BY m.\"MeetingDate\", m.\"MeetingTime\"",
            new { tenantId, studentIds }, ct);

    public async Task<PtmMeetingResponse?> GetAsync(Guid id, Guid tenantId, CancellationToken ct = default) =>
        (await QueryInlineAsync<PtmMeetingResponse>(
            Select + "WHERE m.\"Id\" = @id AND m.\"TenantId\" = @tenantId", new { id, tenantId }, ct))
        .FirstOrDefault();

    public Task<int> SetStatusAsync(Guid id, Guid tenantId, string status, CancellationToken ct = default) =>
        ExecuteInlineAsync(
            "UPDATE \"dbo\".\"PtmMeetings\" SET \"Status\" = @status WHERE \"Id\" = @id AND \"TenantId\" = @tenantId",
            new { id, tenantId, status }, ct);
}
```

In `src/Sms.Modules.Comms/CommsModule.cs`, inside `AddCommsModule`, after `services.AddScoped<CommsRepository>();`:

```csharp
        services.AddScoped<PtmRepository>();
```

- [ ] **Step 5: Write the service**

`src/Sms.Application/Services/Comms/PtmService.cs`:

```csharp
using System.Security.Claims;
using Sms.Application.Services.Auth;
using Sms.Application.Services.Sis;
using Sms.Modules.Comms;
using Sms.Shared.Kernel.Results;
using Sms.Shared.Kernel.Tenancy;

namespace Sms.Application.Services.Comms;

public interface IPtmService
{
    Task<ApiResult<IReadOnlyList<PtmMeetingResponse>>> ListAsync(CancellationToken ct = default);
    Task<ApiResult<PtmMeetingResponse>> SetStatusAsync(
        Guid id, string? status, ClaimsPrincipal caller, CancellationToken ct = default);
}

public sealed class PtmService(PtmRepository repo, ISisService sis, ITenantContext tenant) : IPtmService
{
    private static readonly string[] Statuses = ["pending", "confirmed"];

    public async Task<ApiResult<IReadOnlyList<PtmMeetingResponse>>> ListAsync(CancellationToken ct = default)
    {
        if (tenant.TenantId is not { } tid)
            return ApiResult<IReadOnlyList<PtmMeetingResponse>>.Fail(new Error("forbidden", "no tenant context"), 403);

        // The caller's own roster row (student login) plus every linked child (parent login).
        var ids = new List<Guid>();
        var mine = await sis.GetMyStudentAsync(ct);
        if (mine.IsSuccess) ids.Add(mine.Data!.Id);
        var kids = await sis.ListMyChildrenAsync(ct);
        if (kids.IsSuccess) ids.AddRange(kids.Data!.Select(k => k.Id));
        if (ids.Count == 0) return ApiResult<IReadOnlyList<PtmMeetingResponse>>.Ok([]);

        return ApiResult<IReadOnlyList<PtmMeetingResponse>>.Ok(
            await repo.ListForStudentsAsync(tid, ids.Distinct().ToArray(), ct));
    }

    public async Task<ApiResult<PtmMeetingResponse>> SetStatusAsync(
        Guid id, string? status, ClaimsPrincipal caller, CancellationToken ct = default)
    {
        if (tenant.TenantId is not { } tid)
            return ApiResult<PtmMeetingResponse>.Fail(new Error("forbidden", "no tenant context"), 403);
        if (status is null || !Statuses.Contains(status))
            return ApiResult<PtmMeetingResponse>.Fail(
                new Error("invalid_status", "status must be 'pending' or 'confirmed'"), 422);
        if (!AppLoginRole.IsParent(caller.FindAll("role").Select(c => c.Value)))
            return ApiResult<PtmMeetingResponse>.Fail(new Error("forbidden", "parent only"), 403);

        // Unlinked and missing meetings look the same, so ids of other families' meetings don't leak.
        var meeting = await repo.GetAsync(id, tid, ct);
        if (meeting is null || !await sis.IsLinkedToCallerAsync(meeting.Child, ct))
            return ApiResult<PtmMeetingResponse>.Fail(new Error("not_found", "resource not found"), 404);

        await repo.SetStatusAsync(id, tid, status, ct);
        return ApiResult<PtmMeetingResponse>.Ok((await repo.GetAsync(id, tid, ct))!);
    }
}
```

Before relying on `caller.FindAll("role")`, check how `src/Sms.Api/Controllers/ParentTransportController.cs` (around line 20-25) reads roles, and use the same claim type. JWT inbound claim mapping is off (`MapInboundClaims=false`), so the type is `role`.

In `src/Sms.Application/DependencyInjection.cs`, after `services.AddScoped<IComplaintService, ComplaintService>();`:

```csharp
        services.AddScoped<IPtmService, PtmService>();
```

- [ ] **Step 6: Write the controller and Swagger rule**

`src/Sms.Api/Controllers/PtmController.cs`:

```csharp
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sms.Application.Services.Comms;
using Sms.Modules.Comms;
using Sms.Shared.Kernel.Authz;

namespace Sms.Api.Controllers;

[Route("v1")]
[Authorize(Policy = Policies.StudentOrParent)]
public sealed class PtmController(IPtmService ptm) : ApiControllerBase
{
    [HttpGet("ptm")]
    public async Task<IActionResult> List(CancellationToken ct) =>
        FromResult(await ptm.ListAsync(ct));

    [HttpPatch("ptm/{id:guid}")]
    public async Task<IActionResult> SetStatus(Guid id, [FromBody] SetPtmStatusRequest req, CancellationToken ct) =>
        FromResult(await ptm.SetStatusAsync(id, req.Status, User, ct));
}
```

In `src/Sms.Api/Swagger/ApiAudienceMap.cs` `Rules`, directly after `("v1/parents",       [Student]),`:

```csharp
        ("v1/ptm",           [Student]),                // parent app · parent-teacher meetings
```

- [ ] **Step 7: Run the tests to verify they pass**

Run: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~PtmTests"`
Expected: PASS (6 tests).

Then run: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~Migrations|FullyQualifiedName~Swagger"`
Expected: PASS. `RealMigrationsTests` checks that the applied versions equal the migration files, so 0005 is included automatically. If a Swagger test lists every route, `v1/ptm` is now mapped.

- [ ] **Step 8: Build with warnings as errors, then commit**

Run: `dotnet build` (the repo has TreatWarningsAsErrors)
Expected: `Build succeeded. 0 Warning(s)`

```bash
git add db/postgres/migrations/0005_ptm_meetings.sql src/Sms.Modules.Comms/Ptm.cs src/Sms.Modules.Comms/CommsModule.cs \
  src/Sms.Application/Services/Comms/PtmService.cs src/Sms.Application/DependencyInjection.cs \
  src/Sms.Api/Controllers/PtmController.cs src/Sms.Api/Swagger/ApiAudienceMap.cs tests/Sms.Tests.Integration/Comms/PtmTests.cs
git commit -m "feat(comms): minimal PTM storage and GET/PATCH /v1/ptm for the parent app"
```

- [ ] **Step 9: Apply 0005 to `sms_dev` and add test meetings**

```bash
dotnet run --project db/Sms.PgMigrator -- migrate    # owner connection per docs/runbooks/postgres-migrations.md
dotnet run --project db/Sms.PgMigrator -- status     # 0005 applied, nothing pending
```

Seed two meetings for the user's test parent's first child. Get the ids from `scripts/contract-check/out/parent/children.json` (field `id`) and `out/parent/teachers.json` (field `id`); the tenant id is `tenant_id` in `out/parent/auth-me.json`. Run this in psql (or any SQL client connected to `sms_dev` as `sms_app`), replacing the three values:

```sql
SELECT set_config('app.tenant_id', '<tenant_id>', false);
INSERT INTO "dbo"."PtmMeetings" ("TenantId", "StudentId", "TeacherId", "Subject", "MeetingDate", "MeetingTime", "Mode")
VALUES
  ('<tenant_id>', '<child_id>', '<teacher_id>', 'Mathematics', CURRENT_DATE + 7, '15:00', 'In-person · Room C-214'),
  ('<tenant_id>', '<child_id>', '<teacher_id>', 'Science',     CURRENT_DATE + 9, '16:30', 'Video call');
```

Restart the API (`dotnet run --project src/Sms.Api`) so it picks up the new code, then run `npm run contract-check` in the app repo.
Expected: `parent/ptm` is PASS. Update row 1 in `FINDINGS.md` with the commit hash.

---

### Task 4: App: show ISO PTM dates the way the screen expects

**Files:**
- Modify: `src/services/http/mappers.ts:562` (`toPTM`)
- Test: `src/services/http/__tests__/ptmMapper.test.ts`

**Interfaces:**
- Consumes: the Task 3 wire format (`date: "YYYY-MM-DD"`).
- Produces: `ptmDateLabel(date: string): string`, exported from `mappers.ts`; `toPTM` stays `(d: PTMMeetingDTO) => PTMMeeting`.

- [ ] **Step 1: Write the failing test**

`src/services/http/__tests__/ptmMapper.test.ts`:

```ts
import { ptmDateLabel, toPTM } from '../mappers';

describe('ptmDateLabel', () => {
  it('formats an ISO date like the rest of the PTM screen ("May 3, 2026")', () => {
    expect(ptmDateLabel('2026-05-03')).toBe('May 3, 2026');
  });
  it('passes a non-ISO value through unchanged', () => {
    expect(ptmDateLabel('May 3, 2026')).toBe('May 3, 2026');
  });
});

describe('toPTM', () => {
  it('maps the live /v1/ptm item', () => {
    expect(
      toPTM({
        id: 'm1', date: '2026-10-03', time: '15:00', teacher: 'Ms. A. Krishnan', subject: 'Mathematics',
        child: 's1', mode: 'Video call', status: 'pending',
      }),
    ).toEqual({
      id: 'm1', date: 'Oct 3, 2026', time: '15:00', teacher: 'Ms. A. Krishnan', subj: 'Mathematics',
      child: 's1', mode: 'Video call', status: 'pending',
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest src/services/http/__tests__/ptmMapper.test.ts`
Expected: FAIL. `ptmDateLabel` is not a function.

- [ ] **Step 3: Implement**

In `src/services/http/mappers.ts`, replace the `toPTM` line (562) with:

```ts
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
// The API sends PTM dates as YYYY-MM-DD; the screen shows "May 3, 2026". Built by hand so it
// doesn't depend on the device's Intl locale data.
export const ptmDateLabel = (date: string): string => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : date;
};
export const toPTM = (d: PTMMeetingDTO): PTMMeeting => ({ id: d.id, date: ptmDateLabel(d.date), time: d.time, teacher: d.teacher, subj: d.subject, child: d.child, mode: d.mode, status: d.status });
```

If `mappers.ts` already has a month-name table, reuse it instead of adding `MONTHS` (search the file for `'Jan'`).

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx jest src/services/http`
Expected: PASS, including the existing `httpServices.test.ts` PTM cases. If an existing test expects the raw ISO date from `ptm.list`, update that expectation to the formatted label.

- [ ] **Step 5: Commit**

```bash
git add src/services/http/mappers.ts src/services/http/__tests__/ptmMapper.test.ts
git commit -m "fix(ptm): show live ISO meeting dates as 'May 3, 2026'"
```

---

### Task 5: Triage and fix every remaining contract-check finding

Each untriaged row in `scripts/contract-check/FINDINGS.md` goes through this loop, **one finding per commit**.

**Files:** decided per finding. Allowed locations:
- App side: `src/services/http/dtos.ts`, `src/services/http/mappers.ts`, `src/services/http/index.ts` and their tests in `src/services/http/__tests__/`
- Backend side: the owning controller, service or repository, plus a test next to the related tests in `tests/Sms.Tests.Integration/<Area>/`

- [ ] **Step 1: Verify the finding**

Open the raw response (`scripts/contract-check/out/<role>/<name>.json`) and the code on both sides:
- the app's DTO in `dtos.ts`, its mapper, and the screen that renders the field;
- the backend's controller, response record and SQL.

Pick exactly one verdict:
- **app-wrong:** the backend returns correct data under a different name, shape or optionality. For example, the DTO marks a field required but the backend never has it for this role, and the mapper and screen already handle it being absent.
- **backend-wrong:** 4xx/5xx for a valid caller, data that contradicts `sms_dev`, or a field the screen needs that isn't returned.
- **not a defect:** for example, a WARN for an empty list where `sms_dev` genuinely has no rows. Confirm that with a query against `sms_dev`.
- **out of scope:** peers, meals, pickup, parent relation, calendar. Record it, don't fix.

Write the verdict and the one-line reason into the row.

- [ ] **Step 2: Write a failing test that reproduces it**

- **App-wrong:** add a case to `src/services/http/__tests__/` that feeds a trimmed copy of the real response into the mapper. Replace names and ids with dummy values; never commit real data. Assert the model field the screen reads.
- **Backend-wrong:** add an integration test in the style of `PtmTests` (seed, then call with a minted JWT) asserting the correct status or field.

Run it and confirm it fails for the reason in the verdict.

- [ ] **Step 3: Make the minimal fix and run the test to verify it passes**

App: `npx jest src/services/http`. Backend: `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~<TestClass>"` and `dotnet build`.

- [ ] **Step 4: Re-run the live check**

Run: `npm run contract-check` (restart the API first after a backend change)
Expected: that row is now PASS, and no row that passed before has regressed.

- [ ] **Step 5: Commit, and fill in the `Fix commit` cell**

```bash
git commit -am "fix(<area>): <what the finding was>"   # in the repo you changed
```

Repeat until `npm run contract-check` shows no FAIL rows. Every WARN left over must be marked "not a defect" or "out of scope" with its reason. Then commit `FINDINGS.md`:

```bash
git add scripts/contract-check/FINDINGS.md && git commit -m "docs(contract): triaged findings"
```

If a finding needs more than a small, contained change (a new table, or a new endpoint other than PTM), stop and ask the user. That is outside the agreed scope.

---

### Task 6: Phone on Wi-Fi: verify, then adjust config only if needed

**Files (only if verification shows a problem):**
- Modify: `eas.json` (preview `EXPO_PUBLIC_API_BASE_URL`)
- Modify: `sms-api/src/Sms.Api/appsettings.Development.json` (`Cors:AllowedOrigins`)
- Modify: `README.md` (how to point a phone at the dev API)

- [ ] **Step 1: Find the dev PC's current LAN IP**

Run (PowerShell): `Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.PrefixOrigin -eq 'Dhcp' } | Select-Object IPAddress, InterfaceAlias`
Record the Wi-Fi address, e.g. `192.168.0.103`.

- [ ] **Step 2: Check that the API is reachable on that IP**

Run: `curl -s http://<lan-ip>:5162/health`
Expected: `{"status":"ok"}`. If it times out, the Windows firewall is blocking port 5162. Ask the user to allow it; changing firewall rules is their call.

- [ ] **Step 3: Compare the config with the IP**

- `eas.json` preview profile: if its `EXPO_PUBLIC_API_BASE_URL` host equals the LAN IP, change nothing. If it differs, set it to `http://<lan-ip>:5162/v1`.
- CORS only matters for Expo **web** opened from another device, because native apps don't send `Origin`. Run:
  `curl -s -o NUL -w "%{http_code}" -H "Origin: http://<lan-ip>:8081" -X OPTIONS -H "Access-Control-Request-Method: GET" http://localhost:5162/v1/auth/me -D -`
  If there's no `Access-Control-Allow-Origin` header, add `http://<lan-ip>:8081` and `http://<lan-ip>:19006` to `Cors:AllowedOrigins` in `appsettings.Development.json`. Otherwise change nothing.

- [ ] **Step 4: Document how to run on a phone**

Add a short section to the app's `README.md`:

```markdown
## Run on a phone against the local API

1. Start the API on the dev PC: `dotnet run --project src/Sms.Api` (sms-api repo, listens on 0.0.0.0:5162).
2. Find the PC's Wi-Fi IP (`ipconfig`), and check `http://<ip>:5162/health` from the phone's browser.
3. Start the app pointed at it: `EXPO_PUBLIC_API_BASE_URL=http://<ip>:5162/v1 npx expo start` and open it in Expo Go.
```

- [ ] **Step 5: Commit whatever changed (in each repo)**

```bash
git add README.md eas.json && git commit -m "docs: run the app on a phone against the local sms-api"
# sms-api, only if CORS changed:
git add src/Sms.Api/appsettings.Development.json && git commit -m "chore(cors): allow the dev PC's LAN origin for Expo web"
```

---

### Task 7: Final verification (definition of done)

**Files:** none (a report to the user)

- [ ] **Step 1: Automated suites**

```bash
cd "D:/convert/SMS backend/sms-student-parent-app" && npm test && npx tsc --noEmit && npm run lint
cd "D:/convert/SMS backend/sms-api" && dotnet build && dotnet test
```
Expected: all green. Report any failure with its output; don't paper over it.

- [ ] **Step 2: Live contract check**

Run: `npm run contract-check`, then `CONTRACT_WRITES=1 npm run contract-check`
Expected: no FAIL rows in either run. Save the final table for the report.

- [ ] **Step 3: Manual click-through on Expo web**

Run `npm run web`, log in as the test student, then the test parent. Open each screen, confirm real data shows with no error toasts and no blank or `—` placeholders outside the agreed out-of-scope fields, and note the result:
- **Student:** Home, Homework (open one), Subjects (open one), Inbox (notices and a thread), Profile, Transport
- **Parent:** Home (switch child), Class, Fees (list and invoice detail; do not pay), Inbox, Me, PTM (confirm one meeting), Leave, Attendance, Transport (map loads, live connection)

- [ ] **Step 4: Phone check (user)**

Ask the user to open the app from their phone using the Task 6 README steps and confirm login plus one screen per role.

- [ ] **Step 5: Report and stop**

Report:
- the contract table;
- the test results;
- the click-through notes;
- `git log --oneline` of `feat/psql-e2e-wiring` in both repos.

Remind the user that nothing has been pushed, and wait for them to approve before pushing.

---

## Addendum (2026-09-27): staff PTM (spec addendum "PTM for staff")

These tasks run after Task 5 and before Task 7. Task 7's final verification also covers them:
the teacher app runs `npm test`, the admin runs `npx vitest run`, and the click-through includes
creating a meeting in each app and confirming it in the parent app.

### Task 8: Backend staff PTM endpoints (`sms-api`)

**Files:**
- Modify: `src/Sms.Modules.Comms/Ptm.cs` (response gains `StudentName`, `TeacherId`; staff list with filters; insert, update, delete)
- Modify: `src/Sms.Application/Services/Comms/PtmService.cs` (role-aware list; `CreateAsync`, `UpdateAsync`, `DeleteAsync`)
- Modify: `src/Sms.Api/Controllers/PtmController.cs`
- Modify: `src/Sms.Api/Swagger/ApiAudienceMap.cs` (`v1/ptm` → `[Student, Teacher, SchoolAdmin]`)
- Test: `tests/Sms.Tests.Integration/Comms/PtmStaffTests.cs`

**Interfaces:**
- `PtmMeetingResponse(Guid Id, string Date, string Time, string Teacher, string? Subject, Guid Child, string Mode, string Status, string StudentName, Guid? TeacherId)`. Keep the first eight params in order, because `PtmTests` asserts them.
- `CreatePtmRequest(Guid? StudentId, Guid? TeacherId, string? Subject, string? Date, string? Time, string? Mode)`
- `UpdatePtmRequest(string? Subject, string? Date, string? Time, string? Mode, string? Status)`. The parent path only reads `Status`; the staff path ignores `Status`.
- Controller:
  - Class-level policy becomes plain `[Authorize]`; role checks move into the service.
  - `GET ptm` takes `[FromQuery] status, from, to, teacher_id, student_id`.
  - `POST ptm` returns 201 (the service returns `Ok(item, 201)`).
  - `PATCH ptm/{id}` takes `UpdatePtmRequest`.
  - `DELETE ptm/{id}` returns 204.
- Caller classification in `PtmService`:
  1. manager: `RoleChecks.IsManagerTier(caller)`
  2. teacher: role `Policies.Teacher` (`school.teacher`), with a teacher row from `TeacherIdForUserAsync(userId)` (`src/Sms.Modules.Academics/Data/AcademicsRepositories.cs:68`; inject its repository)
  3. parent or student: `AppLoginRole.IsParent` / `IsStudent`
  4. anyone else: 403 `forbidden`

  A teacher login with no teacher row also gets 403 `forbidden` ("no teacher profile").
- Validation:
  - `Date` is `yyyy-MM-dd` (`DateOnly.TryParseExact`) and `Time` is `HH:mm` (`TimeOnly.TryParseExact`).
  - `Mode` is non-empty and at most 120 characters; `Subject` at most 120.
  - Failures return 422 `validation_failed` with a message naming the field.
- The student and teacher must exist in the caller's tenant; otherwise 404 `not_found`.
- A teacher's `teacher_id` is always forced to their own. An admin must supply `teacher_id` (else 422).
- On the staff update path, changing `Date` or `Time` sets `Status` to `pending`.

- [ ] **Step 1: Write the failing tests** in `PtmStaffTests.cs`, copying the seed and JWT helpers from `PtmTests.cs`. Seed:
  - two teachers, each with a login user (role `school.teacher`) linked the way `TeacherIdForUserAsync` expects (read its SQL first);
  - one admin user (role `school.admin`);
  - two students;
  - one parent linked to student 1.

  Tests:
  1. `Teacher_creates_meeting_for_self`: POST `{student_id: s1, subject: "Maths", date: "2026-10-10", time: "10:30", mode: "Video call"}` as teacher 1 → 201; `teacher_id` = teacher 1, `status` "pending", `student_name` = student 1's name.
  2. `Teacher_cannot_create_for_other_teacher`: teacher 1 sends `teacher_id` = teacher 2 → 201, and the stored `teacher_id` is teacher 1.
  3. `Admin_must_name_teacher`: admin without `teacher_id` → 422 `validation_failed`; with `teacher_id` = teacher 2 → 201.
  4. `Create_rejects_bad_date_and_unknown_student`: `date: "10/10/2026"` → 422; an unknown `student_id` → 404.
  5. `Teacher_lists_only_own_meetings`: create one meeting per teacher; GET as teacher 1 returns only theirs.
  6. `Admin_lists_all_and_filters_by_teacher`: GET as admin returns both; `?teacher_id=` returns one.
  7. `Teacher_reschedule_resets_status`: the parent confirms (PATCH `{status: "confirmed"}`), then teacher 1 PATCHes `{time: "11:00"}` → status "pending".
  8. `Teacher_cannot_edit_or_delete_other_teachers_meeting`: 404 for both.
  9. `Admin_deletes_meeting`: DELETE → 204; a later GET as admin doesn't include it.
  10. `Parent_cannot_create_or_delete`: POST → 403 and DELETE → 403.
  11. `Parent_list_still_has_original_keys`: GET as the parent has `id, date, time, teacher, subject, child, mode, status`.
- [ ] **Step 2: RED:** `dotnet test tests/Sms.Tests.Integration --filter "FullyQualifiedName~PtmStaffTests"`
- [ ] **Step 3: Implement** the repository, service and controller changes above. SQL is parameterised only, and every statement filters by tenant.
- [ ] **Step 4: GREEN:** run the `PtmStaffTests` and `PtmTests` filters (the existing 6 still pass), then the `Swagger` filter, then `dotnet build` (0 warnings).
- [ ] **Step 5: Commit** by explicit paths: `feat(comms): staff PTM — teachers and admins create, edit and cancel meetings`

### Task 9: Teacher app PTM screens (`sms-teacher-app`, branch `feat/ptm` from `main`)

**Files (read the named patterns first):**
- Modify: `src/data/domain/index.ts`. Add `PtmMeeting { id; date; time; teacher; teacherId: string | null; subject: string | null; studentId; studentName; mode; status: 'pending' | 'confirmed' }` and `NewPtmInput { studentId; subject?; date; time; mode }`.
- Modify: `src/data/http/mappers.ts`. Add a `ptmMeetingSchema` zod DTO (snake_case keys from Task 8; `subject` and `teacher_id` nullable), `toPtmMeeting` and `fromNewPtm`. Model: `leaveResponseSchema`, `toLeaveRequest`, `fromNewLeave`.
- Create: `src/data/http/ptm.repo.ts`, exporting `httpPtm(http)` with `list()` → `GET /ptm`, `create(input)` → `POST /ptm`, and `remove(id)` → `DELETE /ptm/{id}`. Model: `leave.repo.ts`, and `remove` in `exams.repo.ts`.
- Modify: `src/data/repositories/types.ts` (a `PtmRepository` interface plus a field on the repositories type) and `src/data/repositories/factory.ts` (wire `httpPtm`).
- Modify: `src/lib/queryClient.ts`. Add the key `ptm: (tenantId) => ['ptm', tenantId]`.
- Create: `src/features/ptm/hooks.ts`, with `usePtmMeetings()`, `useCreatePtm()` (invalidates on success) and `useDeletePtm()`. Model: `src/features/assignments/hooks.ts`, without optimistic insert.
- Create: `src/screens/PtmScreen.tsx`. A list sorted by date and time, showing the student name, subject, date, time, mode and a pending/confirmed pill. Cancel confirms first, then calls `useDeletePtm`. There's an empty state and a "New meeting" button. Model: `LeaveScreen`.
- Create: `src/screens/PtmNewScreen.tsx`. A react-hook-form + zod form:
  - class picker from `useClasses()`, then student picker from `useStudentsByClass(classId)`;
  - subject, a date and time from `@react-native-community/datetimepicker` sent as `yyyy-MM-dd` / `HH:mm`, and mode text;
  - submit calls `useCreatePtm`, then goes back.

  Model: `AssignmentNewScreen`.
- Modify: `src/navigation/MainTabNavigator.tsx` (register both screens in `HomeStack`), `src/navigation/types.ts` (params) and `src/screens/MoreScreen.tsx` (a "PTM" tile).
- Tests:
  - `src/data/http/__tests__/ptm.repo.test.ts` (model: `assignments.repo.test.ts`): records the URL, method and body for list, create and remove, and maps a snake_case envelope to the domain type.
  - `src/data/http/__tests__/mappers.test.ts`: a `toPtmMeeting` case with `subject: null`.

- [ ] **Step 1:** `git switch -c feat/ptm`. The repo is on `main`; another session's untracked plan file is there, so leave it alone.
- [ ] **Step 2:** Write the repo and mapper tests; RED: `npx jest src/data/http/__tests__/ptm.repo.test.ts`
- [ ] **Step 3:** Implement the data layer; GREEN.
- [ ] **Step 4:** Implement the hooks, screens and navigation. Run `npx tsc --noEmit` (no new errors in touched files) and `npm test`.
- [ ] **Step 5:** Commit by explicit paths: `feat(ptm): teacher PTM list and create screens`

### Task 10: SMS admin PTM page (`sms-admin`, branch `feat/ptm` from `main`)

**Files (read the named patterns first):**
- Create: `src/api/ptm.ts`, with `listPtm(filters)` → `GET /ptm` (`request`; the response has no cursor), `createPtm(input)` → `POST /ptm`, and `deletePtm(id)` → `DELETE /ptm/{id}`. Map with `snakeToCamel` / `camelToSnake`. Model: `src/api/complaints.ts`, and `src/api/calendarEvents.ts` for delete.
- Create: `src/api/hooks/usePtm.ts` (`usePtm(filters)`, `useCreatePtm`, `useDeletePtm`), plus a tenant-scoped key in `src/api/queryKeys.ts`. Model: `src/api/hooks/useComplaints.ts`.
- Create: `src/screens/school/ptm.tsx`, exporting `ptmScreens = { 'school.ptm': PtmScreen }`:
  - filters: status (all/pending/confirmed), teacher (`useTeachers()`), and from/to dates;
  - a table: date, time, student, teacher, subject, mode, status pill, delete (with confirmation);
  - a "Schedule meeting" modal: student picker (`useStudents({ q })`), teacher picker, date, time, mode, subject.

  Model the page on `src/screens/school/calendar.tsx`, and the form on the Complaints create form in `operations.tsx`.
- Modify: `src/screens/registry.tsx` (spread `ptmScreens`), `src/router.tsx` (a `VIEWS['school.ptm']` entry) and `src/components/shell/Sidebar.tsx` (a `{ label: 'PTM', view: 'school.ptm', icon: 'users' }` item next to Calendar in the Academic group).
- Tests:
  - `src/api/ptm.test.ts` (model: `calendarEvents.test.ts`): for list with filters, create and delete, assert the URL, method, body and `Authorization` / `X-Tenant-Id` headers.
  - `src/screens/school/ptm.test.tsx`: renders rows from mocked hooks, and a submitted modal calls create with the entered values.

- [ ] **Step 1:** `git switch -c feat/ptm` (the repo is on `main` and clean).
- [ ] **Step 2:** Write `ptm.test.ts`; RED: `npx vitest run src/api/ptm.test.ts`
- [ ] **Step 3:** Implement the API module and hooks; GREEN.
- [ ] **Step 4:** Implement the page, registry, router and sidebar entry, and the page test. Run `npx tsc --noEmit` and `npx vitest run`.
- [ ] **Step 5:** Commit by explicit paths: `feat(ptm): admin PTM page — list, filter, schedule, delete`
