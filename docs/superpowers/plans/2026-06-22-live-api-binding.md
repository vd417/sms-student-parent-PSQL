# Live API Binding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bind the Student & Parent app to the live `/v1` backend as the default data source — production-grade auth (refresh, secure persistence, launch bootstrap), real endpoints for every backed domain, and the 7 endpoint-less features kept on flagged mock — with zero visual UI changes.

**Architecture:** All work lives behind the existing `Services` interface, the `apiFetch` HTTP client, and `AuthProvider`. Screens/components are untouched. The HTTP client gains error normalization, timeout, and single-flight 401→refresh→retry. A cross-platform token store persists the session. `buildServices` composes live + flagged-mock services into one `Services` object, mixing at method level for the partially-backed `student`/`parent` domains.

**Tech Stack:** React Native + Expo (managed), `react-native-web`, TypeScript, `@tanstack/react-query`, Jest (`jest-expo`), Zod. New dependency: `expo-secure-store`.

## Global Constraints

- **No visual UI changes.** Edits are confined to `src/api`, `src/services`, `src/providers`, `src/screens/LoginScreen.tsx` (error-copy mapping only, reusing the existing `styles.error`), and config (`app.json`, `src/api/config.ts`). The `src/models` UI-facing types stay byte-for-byte stable. Screen layout/markup is unchanged; only loading/error/empty *states* (existing components) may newly trigger.
- **`Session` model is frozen:** `{ token: string; role: Role; email: string }`. Refresh token / tenant are persisted in the token store, never added to `Session`.
- **Base URL carries the version:** `API_BASE_URL` ends in `/v1`. Service paths stay version-less (e.g. `/auth/login`), so the `/v1` prefix is applied once in config, not per call.
- **Cross-platform:** every storage/platform API must work on native *and* web (`react-native-web`). Token store branches on `Platform.OS`.
- **Never log tokens.** Any logging hook redacts `access`/`refresh`/`Authorization`.
- **Mock fallback stays honest:** endpoint-less features render on mock and are listed in one startup `console.info`; never presented as live.
- Run tests with `npm test`. If `jest`/`expo-secure-store` resolution fails, run `npx expo install expo-secure-store` and re-run (per project build notes).

---

## File Structure

- `src/services/errors.ts` — **modify**: `ApiError` carries parsed `body`; add `normalizeError`.
- `src/api/config.ts` — **modify**: `/v1` base URL default + `MOCK_BACKED` flag list.
- `src/services/auth/tokenStore.ts` — **create**: cross-platform persisted-session store.
- `src/api/client.ts` — **modify**: timeout, error normalization, single-flight refresh+retry, session-expired + refresh handler registration.
- `src/services/types.ts` — **modify**: extend `AuthService` (`refresh`, `setPassword`, `getMe`).
- `src/services/mock/auth.mock.ts` — **modify**: implement the 3 new methods.
- `src/services/http/index.ts` — **modify**: implement new auth methods + persist tokens; correct endpoint paths for derived/changed domains.
- `src/providers/authReducer.ts` — **modify**: add `restoring` status + `RESTORING_DONE`/`RESTORE_FAILED`.
- `src/providers/AuthProvider.tsx` — **modify**: bootstrap effect, session-expired wiring, expose `setPassword`, `restoring` status.
- `src/screens/LoginScreen.tsx` — **modify**: map 404 → friendly inline copy on the student-password path too (existing `styles.error`).
- `src/services/http/__tests__/smoke.test.ts` — **modify**: opt-in live integration smoke gated by env var.

---

## Task 1: `ApiError` carries response body + `normalizeError`

**Files:**
- Modify: `src/services/errors.ts`
- Test: `src/services/__tests__/errors.test.ts` (create)

**Interfaces:**
- Produces: `class ApiError extends Error { status?: number; body?: unknown; constructor(message, status?, body?) }`; `function normalizeError(status: number, rawBody: unknown): ApiError` — reads RFC7807 `{type,title,detail}` or `{message}` to build the message, attaches `status` + `body`.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/__tests__/errors.test.ts
import { ApiError, normalizeError } from '@/services/errors';

describe('normalizeError', () => {
  it('uses RFC7807 detail for the message', () => {
    const e = normalizeError(404, { type: 'about:blank', title: 'Not Found', detail: 'not_registered' });
    expect(e).toBeInstanceOf(ApiError);
    expect(e.status).toBe(404);
    expect(e.message).toBe('not_registered');
    expect(e.body).toEqual({ type: 'about:blank', title: 'Not Found', detail: 'not_registered' });
  });

  it('falls back to {message}', () => {
    expect(normalizeError(400, { message: 'bad input' }).message).toBe('bad input');
  });

  it('falls back to a status string when body is empty', () => {
    expect(normalizeError(500, null).message).toBe('Request failed (500)');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- errors.test`
Expected: FAIL — `normalizeError is not a function`.

- [ ] **Step 3: Write minimal implementation**

```ts
// src/services/errors.ts  (append below the existing ApiError; replace ApiError as shown)
export class NotImplementedError extends Error {
  constructor(what: string) {
    super(`Not implemented: ${what}. Provide an HTTP implementation.`);
    this.name = 'NotImplementedError';
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function normalizeError(status: number, rawBody: unknown): ApiError {
  let message = `Request failed (${status})`;
  if (rawBody && typeof rawBody === 'object') {
    const b = rawBody as Record<string, unknown>;
    if (typeof b.detail === 'string') message = b.detail;
    else if (typeof b.message === 'string') message = b.message;
    else if (typeof b.title === 'string') message = b.title;
  }
  return new ApiError(message, status, rawBody);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- errors.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/errors.ts src/services/__tests__/errors.test.ts
git commit -m "feat(student): ApiError carries body + normalizeError helper"
```

---

## Task 2: Config — `/v1` base URL + mock-backed flag list

**Files:**
- Modify: `src/api/config.ts`
- Modify: `app.json` (set `expo.extra.apiBaseUrl` + `expo.extra.dataSource`)

**Interfaces:**
- Produces: `API_BASE_URL` (ends in `/v1`), `DATA_SOURCE` default `'http'`, and `MOCK_BACKED: readonly string[]` listing endpoint-less feature keys for the startup log.

- [ ] **Step 1: Edit `app.json` `extra`**

Add `apiBaseUrl` + `dataSource` alongside the existing `eas` key:

```json
    "extra": {
      "eas": {
        "projectId": "789277f1-7308-4b88-8b93-12fed225b44e"
      },
      "dataSource": "http",
      "apiBaseUrl": "https://api.schooldesk.example/v1"
    },
```

> Replace the host with the real backend origin from the Swagger server URL before running against live. Per-environment values come from EAS env at build time; this is the dev default.

- [ ] **Step 2: Edit `src/api/config.ts`**

```ts
import Constants from 'expo-constants';

export type DataSource = 'mock' | 'http';

const extra = (Constants.expoConfig?.extra ?? {}) as {
  dataSource?: DataSource;
  apiBaseUrl?: string;
};

// Global default. Per-domain/method composition lives in services/index.ts.
export const DATA_SOURCE: DataSource = extra.dataSource ?? 'http';
export const API_BASE_URL: string = extra.apiBaseUrl ?? '';

// Network tuning.
export const REQUEST_TIMEOUT_MS = 15000;

// Mock tuning.
export const MOCK_LATENCY_MS = 350;
export const MOCK_ERROR_RATE = 0; // 0..1, set >0 to exercise error UI

// Features with no backing endpoint — served by mock, surfaced in the startup log.
export const MOCK_BACKED: readonly string[] = [
  'school.getCurrent',
  'student.getToday',
  'student.getPeers',
  'student.getAchievements',
  'parent.childToday',
  'ptm',
  'transport',
  'attendance',
];
```

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc --noEmit`
Expected: No *new* errors (one pre-existing error may remain per project notes).

- [ ] **Step 4: Commit**

```bash
git add src/api/config.ts app.json
git commit -m "feat(student): default DATA_SOURCE=http, /v1 base url, mock-backed flags"
```

---

## Task 3: Cross-platform token store

**Files:**
- Create: `src/services/auth/tokenStore.ts`
- Test: `src/services/auth/__tests__/tokenStore.test.ts`

**Interfaces:**
- Consumes: `Role` from `@/models`.
- Produces:
  ```ts
  interface PersistedSession { access: string; refresh: string | null; role: Role; email: string; tenantId: string | null; }
  const tokenStore: { save(s: PersistedSession): Promise<void>; load(): Promise<PersistedSession | null>; clear(): Promise<void>; };
  ```
  Web uses `localStorage`; native uses `expo-secure-store`. Single key `schooldesk.session`.

- [ ] **Step 1: Install the native dependency**

Run: `npx expo install expo-secure-store`
Expected: adds `expo-secure-store` to `package.json` dependencies.

- [ ] **Step 2: Write the failing test (web path)**

```ts
// src/services/auth/__tests__/tokenStore.test.ts
import { tokenStore, type PersistedSession } from '@/services/auth/tokenStore';

// Force the web branch: jest-expo sets Platform.OS, override to 'web'.
jest.mock('react-native/Libraries/Utilities/Platform', () => ({ OS: 'web', select: (o: any) => o.web }));

beforeEach(() => {
  (global as any).localStorage = (() => {
    let s: Record<string, string> = {};
    return {
      getItem: (k: string) => (k in s ? s[k] : null),
      setItem: (k: string, v: string) => { s[k] = v; },
      removeItem: (k: string) => { delete s[k]; },
    };
  })();
});

const sample: PersistedSession = { access: 'a', refresh: 'r', role: 'student', email: 'x@y.z', tenantId: 't1' };

it('round-trips a session', async () => {
  await tokenStore.save(sample);
  expect(await tokenStore.load()).toEqual(sample);
});

it('returns null when empty', async () => {
  expect(await tokenStore.load()).toBeNull();
});

it('clears the session', async () => {
  await tokenStore.save(sample);
  await tokenStore.clear();
  expect(await tokenStore.load()).toBeNull();
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npm test -- tokenStore.test`
Expected: FAIL — cannot find module `@/services/auth/tokenStore`.

- [ ] **Step 4: Write the implementation**

```ts
// src/services/auth/tokenStore.ts
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import type { Role } from '@/models';

export interface PersistedSession {
  access: string;
  refresh: string | null;
  role: Role;
  email: string;
  tenantId: string | null;
}

const KEY = 'schooldesk.session';
const isWeb = Platform.OS === 'web';

async function setRaw(value: string): Promise<void> {
  if (isWeb) localStorage.setItem(KEY, value);
  else await SecureStore.setItemAsync(KEY, value);
}
async function getRaw(): Promise<string | null> {
  if (isWeb) return localStorage.getItem(KEY);
  return SecureStore.getItemAsync(KEY);
}
async function delRaw(): Promise<void> {
  if (isWeb) localStorage.removeItem(KEY);
  else await SecureStore.deleteItemAsync(KEY);
}

export const tokenStore = {
  async save(s: PersistedSession): Promise<void> {
    await setRaw(JSON.stringify(s));
  },
  async load(): Promise<PersistedSession | null> {
    const raw = await getRaw();
    if (!raw) return null;
    try {
      return JSON.parse(raw) as PersistedSession;
    } catch {
      await delRaw();
      return null;
    }
  },
  async clear(): Promise<void> {
    await delRaw();
  },
};
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- tokenStore.test`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/services/auth/tokenStore.ts src/services/auth/__tests__/tokenStore.test.ts package.json package-lock.json
git commit -m "feat(student): cross-platform persisted token store"
```

---

## Task 4: HTTP client — timeout, error normalization, single-flight refresh + retry

**Files:**
- Modify: `src/api/client.ts`
- Test: `src/api/__tests__/client.test.ts`

**Interfaces:**
- Consumes: `API_BASE_URL`, `REQUEST_TIMEOUT_MS` (config); `normalizeError`, `ApiError` (errors).
- Produces (unchanged + new):
  ```ts
  function setAuthToken(token: string | null): void;
  function apiFetch<T>(path: string, init?: RequestInit): Promise<T>;
  function setRefreshHandler(fn: (() => Promise<string | null>) | null): void; // returns new access token or null
  function setSessionExpiredHandler(fn: (() => void) | null): void;
  function pingHealth(): Promise<boolean>;
  ```
  On `401`: call the registered refresh handler (single-flight — concurrent 401s await one promise), set the new token, retry the original request once. If refresh yields null/throws → clear token, invoke session-expired handler, throw the original `ApiError`.

- [ ] **Step 1: Write the failing test**

```ts
// src/api/__tests__/client.test.ts
import { apiFetch, setAuthToken, setRefreshHandler, setSessionExpiredHandler } from '@/api/client';
import { ApiError } from '@/services/errors';

const okJson = (body: unknown) =>
  ({ ok: true, status: 200, json: async () => body } as Response);
const errJson = (status: number, body: unknown) =>
  ({ ok: false, status, json: async () => body } as Response);

afterEach(() => {
  setAuthToken(null);
  setRefreshHandler(null);
  setSessionExpiredHandler(null);
  jest.restoreAllMocks();
});

it('returns parsed json on success', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(okJson({ id: 1 }));
  await expect(apiFetch('/x')).resolves.toEqual({ id: 1 });
});

it('throws a normalized ApiError on non-2xx', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(errJson(404, { detail: 'not_registered' }));
  await expect(apiFetch('/x')).rejects.toMatchObject({ status: 404, message: 'not_registered' });
});

it('refreshes once on 401 then retries', async () => {
  const fetchMock = jest
    .spyOn(global, 'fetch')
    .mockResolvedValueOnce(errJson(401, {}))
    .mockResolvedValueOnce(okJson({ ok: true }));
  setRefreshHandler(async () => 'new-token');
  await expect(apiFetch('/x')).resolves.toEqual({ ok: true });
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('shares one refresh across concurrent 401s', async () => {
  jest.spyOn(global, 'fetch')
    .mockResolvedValueOnce(errJson(401, {}))
    .mockResolvedValueOnce(errJson(401, {}))
    .mockResolvedValue(okJson({ ok: true }));
  const refresh = jest.fn(async () => 'new-token');
  setRefreshHandler(refresh);
  await Promise.all([apiFetch('/a'), apiFetch('/b')]);
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('fires session-expired when refresh fails', async () => {
  jest.spyOn(global, 'fetch').mockResolvedValue(errJson(401, {}));
  setRefreshHandler(async () => null);
  const onExpired = jest.fn();
  setSessionExpiredHandler(onExpired);
  await expect(apiFetch('/x')).rejects.toBeInstanceOf(ApiError);
  expect(onExpired).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- client.test`
Expected: FAIL — `setRefreshHandler is not a function`.

- [ ] **Step 3: Write the implementation**

```ts
// src/api/client.ts
import { API_BASE_URL, REQUEST_TIMEOUT_MS } from './config';
import { ApiError, normalizeError } from '@/services/errors';

let authToken: string | null = null;
export function setAuthToken(token: string | null) {
  authToken = token;
}

let refreshHandler: (() => Promise<string | null>) | null = null;
export function setRefreshHandler(fn: (() => Promise<string | null>) | null) {
  refreshHandler = fn;
}

let sessionExpiredHandler: (() => void) | null = null;
export function setSessionExpiredHandler(fn: (() => void) | null) {
  sessionExpiredHandler = fn;
}

// Single-flight refresh: concurrent 401s await one in-flight promise.
let refreshing: Promise<string | null> | null = null;
function refreshOnce(): Promise<string | null> {
  if (!refreshHandler) return Promise.resolve(null);
  if (!refreshing) {
    refreshing = refreshHandler()
      .catch(() => null)
      .finally(() => {
        refreshing = null;
      });
  }
  return refreshing;
}

async function rawFetch(path: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        ...(init.headers ?? {}),
      },
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new ApiError(`Request timed out: ${path}`, 0);
    }
    throw new ApiError(`Network error: ${path}`, 0);
  } finally {
    clearTimeout(timer);
  }
}

async function toResult<T>(res: Response, path: string): Promise<T> {
  if (res.ok) return (await res.json()) as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    /* non-JSON error body */
  }
  throw normalizeError(res.status, body);
}

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await rawFetch(path, init);
  if (res.status !== 401) return toResult<T>(res, path);

  // 401 → attempt a single shared refresh, then retry once.
  const newToken = await refreshOnce();
  if (!newToken) {
    setAuthToken(null);
    sessionExpiredHandler?.();
    return toResult<T>(res, path); // throws the normalized 401
  }
  setAuthToken(newToken);
  const retry = await rawFetch(path, init);
  return toResult<T>(retry, path);
}

// Health ping against the server root (strip the trailing /v1).
export async function pingHealth(): Promise<boolean> {
  try {
    const origin = API_BASE_URL.replace(/\/v1\/?$/, '');
    const res = await fetch(`${origin}/health`);
    return res.ok;
  } catch {
    return false;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- client.test`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/api/client.ts src/api/__tests__/client.test.ts
git commit -m "feat(student): harden HTTP client — timeout, error normalize, single-flight refresh"
```

---

## Task 5: Extend `AuthService` + mock implementation

**Files:**
- Modify: `src/services/types.ts`
- Modify: `src/services/mock/auth.mock.ts`
- Test: `src/services/mock/__tests__/auth.mock.test.ts` (extend; create if absent)

**Interfaces:**
- Consumes: `ApiError`, `Role`, `Session`.
- Produces — `AuthService` gains:
  ```ts
  refresh(refreshToken: string): Promise<{ access: string; refresh: string | null }>;
  setPassword(args: { token: string; password: string }): Promise<void>;
  getMe(): Promise<{ role: Role; email: string }>;
  ```

- [ ] **Step 1: Write the failing test**

```ts
// src/services/mock/__tests__/auth.mock.test.ts  (add these; keep any existing tests)
import { authMock } from '@/services/mock/auth.mock';

const auth = authMock({ ms: 0 });

it('refresh returns a fresh access token', async () => {
  const r = await auth.refresh('any');
  expect(typeof r.access).toBe('string');
  expect(r.access.length).toBeGreaterThan(0);
});

it('setPassword resolves for a non-empty password', async () => {
  await expect(auth.setPassword({ token: 't', password: 'secret12' })).resolves.toBeUndefined();
});

it('getMe returns the demo identity', async () => {
  const me = await auth.getMe();
  expect(me).toHaveProperty('role');
  expect(me).toHaveProperty('email');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- auth.mock.test`
Expected: FAIL — `auth.refresh is not a function`.

- [ ] **Step 3: Extend the `AuthService` interface**

```ts
// src/services/types.ts  — replace the AuthService block
export interface AuthService {
  signIn(email: string, password: string, role: Role): Promise<Session>;
  signOut(): Promise<void>;
  requestOtp(identifier: string): Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  verifyOtp(identifier: string, code: string): Promise<Session>;
  refresh(refreshToken: string): Promise<{ access: string; refresh: string | null }>;
  setPassword(args: { token: string; password: string }): Promise<void>;
  getMe(): Promise<{ role: Role; email: string }>;
}
```

- [ ] **Step 4: Implement in the mock**

```ts
// src/services/mock/auth.mock.ts — add to the returned object (inside authMock's return {...})
    refresh: () =>
      delayed(() => ({ access: `mock-token-refreshed-${Date.now()}`, refresh: `mock-refresh-${Date.now()}` })),
    setPassword: ({ password }) =>
      delayed(() => {
        if (!password || password.length < 4) throw new ApiError('Password is too short', 400);
        return undefined;
      }),
    getMe: () =>
      delayed(() => ({ role: db.student ? ('student' as const) : ('parent' as const), email: db.student.email })),
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npm test -- auth.mock.test`
Expected: PASS (existing + 3 new).

- [ ] **Step 6: Commit**

```bash
git add src/services/types.ts src/services/mock/auth.mock.ts src/services/mock/__tests__/auth.mock.test.ts
git commit -m "feat(student): extend AuthService with refresh/setPassword/getMe (mock)"
```

---

## Task 6: HTTP auth implementation + token persistence

**Files:**
- Modify: `src/services/http/index.ts`
- Test: `src/services/http/__tests__/httpServices.test.ts` (extend)

**Interfaces:**
- Consumes: `apiFetch`, `setAuthToken` (client); `tokenStore` (Task 3); `SessionDTO`, `SessionUserDTO` (dtos); `toSession` (mappers).
- Produces: `httpServices.auth` implementing all 7 `AuthService` methods. `signIn`/`verifyOtp` persist `{access,refresh,role,email,tenantId}` to `tokenStore` and set the in-memory access token *before* returning the mapped `Session`.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/http/__tests__/httpServices.test.ts  (add; keep existing)
import { httpServices } from '@/services/http';
import * as client from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';

jest.mock('@/services/auth/tokenStore', () => ({
  tokenStore: { save: jest.fn(async () => undefined), load: jest.fn(), clear: jest.fn() },
}));

const sessionDto = {
  access_token: 'ACC', refresh_token: 'REF',
  user: { id: 'u1', name: 'Asha', email: 'asha@school.edu', role: 'student' as const },
  tenant: { id: 'sch1', name: 'WBA' },
};

afterEach(() => jest.restoreAllMocks());

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

it('refresh maps token fields', async () => {
  jest.spyOn(client, 'apiFetch').mockResolvedValue({ access_token: 'A2', refresh_token: 'R2' } as any);
  await expect(httpServices.auth.refresh('REF')).resolves.toEqual({ access: 'A2', refresh: 'R2' });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- httpServices.test`
Expected: FAIL — auth methods missing / not persisting.

- [ ] **Step 3: Implement the HTTP auth block**

Add imports at the top of `src/services/http/index.ts`:

```ts
import { apiFetch, setAuthToken } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
```

(Keep the existing `apiFetch` import if already present — do not duplicate; add only `setAuthToken`.)

Replace the `auth: { ... }` block with:

```ts
  auth: {
    signIn: async (email, password, role) => {
      const dto = await post<SessionDTO>('/auth/login', { email, password, role });
      await persistSession(dto);
      return toSession(dto);
    },
    signOut: async () => {
      await post<void>('/auth/logout', {}).catch(() => undefined);
      await tokenStore.clear();
      setAuthToken(null);
    },
    requestOtp: (identifier) =>
      post<{ channel: 'sms' | 'email'; sent: boolean }>('/auth/otp/request', { identifier }),
    verifyOtp: async (identifier, code) => {
      const dto = await post<SessionDTO>('/auth/otp/verify', { identifier, code });
      await persistSession(dto);
      return toSession(dto);
    },
    refresh: async (refreshToken) => {
      const dto = await post<{ access_token: string; refresh_token: string }>('/auth/refresh', {
        refresh_token: refreshToken,
      });
      return { access: dto.access_token, refresh: dto.refresh_token ?? null };
    },
    setPassword: async ({ token, password }) => {
      await post<void>('/auth/set-password', { token, password });
    },
    getMe: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      return { role: me.role, email: me.email };
    },
  },
```

Add the `persistSession` helper near the top of the file (after the `post`/`patch` helpers) and the `SessionUserDTO` import:

```ts
// add SessionUserDTO to the existing dtos import list
async function persistSession(dto: SessionDTO): Promise<void> {
  setAuthToken(dto.access_token);
  await tokenStore.save({
    access: dto.access_token,
    refresh: dto.refresh_token ?? null,
    role: dto.user.role,
    email: dto.user.email,
    tenantId: dto.tenant?.id ?? null,
  });
}
```

> **Verify against live:** confirm `/auth/refresh`, `/auth/set-password`, and `/auth/me` paths + field names match the Swagger. Adjust the literal paths/fields here if the live contract differs; everything else stays.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- httpServices.test`
Expected: PASS (existing + 2 new).

- [ ] **Step 5: Commit**

```bash
git add src/services/http/index.ts src/services/http/__tests__/httpServices.test.ts
git commit -m "feat(student): live auth impl + secure token persistence"
```

---

## Task 7: Correct derived/changed endpoint paths

**Files:**
- Modify: `src/services/http/index.ts`
- Test: `src/services/http/__tests__/httpServices.test.ts` (extend)

**Interfaces:**
- Consumes: `getJson`, `post`, mappers, DTOs (existing).
- Produces: corrected paths for `student.getProfile`, `grades.listGrades`, `parent.children`, `fees`, `leave.list` per the spec gap analysis.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/http/__tests__/httpServices.test.ts  (add)
import { httpServices } from '@/services/http';
import * as client from '@/api/client';

afterEach(() => jest.restoreAllMocks());

it('getProfile resolves student via /auth/me then /students/{id}', async () => {
  const spy = jest.spyOn(client, 'apiFetch')
    .mockResolvedValueOnce({ id: 's7', name: 'Asha', email: 'a@s.edu', role: 'student' } as any)
    .mockResolvedValueOnce({
      id: 's7', admission_no: 'WBA-1', name: 'Asha', initials: 'A', grade: '7', school: 'WBA',
      email: 'a@s.edu', class_label: '7B', house: 'Blue', overall_avg: 88,
      attendance_pct: 96, rank: 3, rank_of: 40,
    } as any);
  const s = await httpServices.student.getProfile();
  expect(spy.mock.calls[0][0]).toBe('/auth/me');
  expect(spy.mock.calls[1][0]).toBe('/students/s7');
  expect(s.studentId).toBe('WBA-1');
});

it('listGrades aggregates grades across exam papers', async () => {
  jest.spyOn(client, 'apiFetch')
    .mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }] as any)
    .mockResolvedValueOnce([{ subject: 'Math', score: 90 }] as any)
    .mockResolvedValueOnce([{ subject: 'Sci', score: 80 }] as any);
  const grades = await httpServices.grades.listGrades();
  expect(grades).toHaveLength(2);
});
```

> If `toGrade`/`toStudent` require more DTO fields than the fixtures above, copy the missing fields from a real response — the test only asserts paths + counts, so fixtures need just enough to satisfy the mapper without throwing.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- httpServices.test`
Expected: FAIL — `getProfile` hits `/students/me`, not `/auth/me`.

- [ ] **Step 3: Apply path corrections**

In `src/services/http/index.ts`:

```ts
  student: {
    getProfile: async () => {
      const me = await getJson<SessionUserDTO>('/auth/me');
      return toStudent(await getJson<StudentDTO>(`/students/${me.id}`));
    },
    getToday: () => getJson<TodayBlockDTO[]>('/students/me/today').then((a) => a.map(toTodayBlock)),
    getPeers: () => getJson<PeerDTO[]>('/students/me/peers').then((a) => a.map(toPeer)),
    getAchievements: () => getJson<AchievementDTO[]>('/students/me/achievements').then((a) => a.map(toAchievement)),
  },
```

(`getToday`/`getPeers`/`getAchievements` are gap methods — left as-is here but overridden to mock in Task 8.)

```ts
  grades: {
    listGrades: async () => {
      const papers = await getJson<ExamPaperDTO[]>('/exam-papers');
      const perPaper = await Promise.all(
        papers.map((p) => getJson<GradeDTO[]>(`/exam-papers/${p.id}/grades`)),
      );
      return perPaper.flat().map(toGrade);
    },
    listExams: () => getJson<ExamPaperDTO[]>('/exam-papers').then((a) => a.map(toExam)),
  },
```

```ts
  parent: {
    getProfile: () => getJson<ParentDTO>('/parents/me').then(toParent),
    children: () => getJson<ChildDTO[]>('/students').then((a) => a.map(toChild)),
    childToday: (childId) => getJson<ChildTodayDTO>(`/children/${childId}/today`).then(toChildToday),
  },
  fees: {
    list: (childId) => getJson<FeeInvoiceDTO[]>(`/fees/invoices?student_id=${childId}`).then((a) => a.map(toFee)),
    pay: (feeId) => post<FeeInvoiceDTO>(`/fees/invoices/${feeId}/pay`, {}).then(toFee),
  },
```

```ts
  leave: {
    list: (childId) => getJson<LeaveRequestDTO[]>(`/leave?student_id=${childId}`).then((a) => a.map(toLeaveRequest)),
    submit: (req) =>
      post<LeaveRequestDTO>('/leave', {
        child_id: req.childId, from_date: req.from, to_date: req.to, reason: req.reason, note: req.note,
      }).then(toLeaveRequest),
  },
```

> **Verify against live:** `GET /students` is *assumed* guardian-scoped (returns the authenticated parent's children). If the live response is not guardian-scoped, move `parent.children` to mock (Task 8 list) and flag it until a guardian endpoint exists. Confirm the `student_id` query-param name for fees/leave.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- httpServices.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/http/index.ts src/services/http/__tests__/httpServices.test.ts
git commit -m "feat(student): correct derived endpoint paths (me/student, grades, children, fees, leave)"
```

---

## Task 8: Per-method source composition + startup log

**Files:**
- Modify: `src/services/index.ts`
- Test: `src/services/__tests__/buildServices.test.ts` (create)

**Interfaces:**
- Consumes: `httpServices`, the mock factories, `MOCK_BACKED` (config).
- Produces: `buildServices()` returns a `Services` where endpoint-less domains/methods resolve to mock and everything else to HTTP, plus one `console.info` listing the mock-backed features.

- [ ] **Step 1: Write the failing test**

```ts
// src/services/__tests__/buildServices.test.ts
import { buildServices } from '@/services';
import { httpServices } from '@/services/http';

it('routes gap domains to mock and backed domains to http', () => {
  const s = buildServices('http');
  // backed → identical reference to the http impl
  expect(s.auth).toBe(httpServices.auth);
  expect(s.homework).toBe(httpServices.homework);
  // student.getProfile is live, but the gap methods are NOT the http ones
  expect(s.student.getProfile).toBe(httpServices.student.getProfile);
  expect(s.student.getToday).not.toBe(httpServices.student.getToday);
  // fully-gap domains are not the http impls
  expect(s.ptm).not.toBe(httpServices.ptm);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- buildServices.test`
Expected: FAIL — `buildServices('http')` currently returns raw `httpServices`.

- [ ] **Step 3: Rewrite `buildServices`**

```ts
// src/services/index.ts  — replace buildServices + the `services` export
import { MOCK_BACKED } from '@/api/config';

export function buildServices(source: DataSource = DATA_SOURCE): Services {
  if (source === 'mock') return mockServices();

  const http = httpServices;
  const mock = mockServices();

  const composed: Services = {
    // backed domains → live
    auth: http.auth,
    subjects: http.subjects,
    homework: http.homework,
    grades: http.grades,
    announcements: http.announcements,
    messaging: http.messaging,
    directory: http.directory,
    fees: http.fees,
    leave: http.leave,
    // mixed: live profile/children, mock for endpoint-less methods
    student: {
      getProfile: http.student.getProfile,
      getToday: mock.student.getToday,
      getPeers: mock.student.getPeers,
      getAchievements: mock.student.getAchievements,
    },
    parent: {
      getProfile: http.parent.getProfile,
      children: http.parent.children,
      childToday: mock.parent.childToday,
    },
    // fully endpoint-less → mock
    school: mock.school,
    ptm: mock.ptm,
    transport: mock.transport,
    attendance: mock.attendance,
  };

  if (MOCK_BACKED.length) {
    // eslint-disable-next-line no-console
    console.info(`[data] live /v1 backend; mock-backed (no endpoint yet): ${MOCK_BACKED.join(', ')}`);
  }
  return composed;
}

export const services: Services = buildServices();
```

> This composes at method level because `student`/`parent` are partially backed — honoring the spec's intent (gap features on mock, listed at startup) more precisely than a whole-domain map could.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- buildServices.test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/services/index.ts src/services/__tests__/buildServices.test.ts
git commit -m "feat(student): compose live + flagged-mock services; startup log"
```

---

## Task 9: AuthProvider — bootstrap, restoring status, refresh + session-expired wiring

**Files:**
- Modify: `src/providers/authReducer.ts`
- Modify: `src/providers/AuthProvider.tsx`
- Test: `src/providers/__tests__/authReducer.test.ts` (create)

**Interfaces:**
- Consumes: `tokenStore`, `services.auth.{getMe,refresh}`, `setAuthToken`, `setRefreshHandler`, `setSessionExpiredHandler`.
- Produces: `AuthState.status` adds `'restoring'`; reducer handles `RESTORED`/`RESTORE_FAILED`. `AuthContextValue.status` widens to include `'restoring'`; `setPassword` added to context.

- [ ] **Step 1: Write the failing reducer test**

```ts
// src/providers/__tests__/authReducer.test.ts
import { authReducer, initialAuthState } from '@/providers/authReducer';

it('starts in restoring', () => {
  expect(initialAuthState.status).toBe('restoring');
});

it('RESTORE_FAILED → unauthenticated', () => {
  expect(authReducer(initialAuthState, { type: 'RESTORE_FAILED' }).status).toBe('unauthenticated');
});

it('SIGNED_IN sets session + authenticated', () => {
  const s = authReducer(initialAuthState, {
    type: 'SIGNED_IN', session: { token: 't', role: 'student', email: 'a@b.c' },
  });
  expect(s.status).toBe('authenticated');
  expect(s.session?.token).toBe('t');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- authReducer.test`
Expected: FAIL — `initialAuthState.status` is `'unauthenticated'`.

- [ ] **Step 3: Update the reducer**

```ts
// src/providers/authReducer.ts
import type { Session } from '@/models';

export interface AuthState {
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  session: Session | null;
}

export const initialAuthState: AuthState = { status: 'restoring', session: null };

export type AuthAction =
  | { type: 'SIGNED_IN'; session: Session }
  | { type: 'SIGNED_OUT' }
  | { type: 'RESTORE_FAILED' };

export function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'SIGNED_IN':
      return { status: 'authenticated', session: action.session };
    case 'SIGNED_OUT':
    case 'RESTORE_FAILED':
      return { status: 'unauthenticated', session: null };
    default:
      return state;
  }
}
```

- [ ] **Step 4: Run reducer test to verify it passes**

Run: `npm test -- authReducer.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Update `AuthProvider`**

```tsx
// src/providers/AuthProvider.tsx
import { createContext, ReactNode, useContext, useEffect, useMemo, useReducer } from 'react';
import type { Role, Session } from '@/models';
import { services } from '@/services';
import { setAuthToken, setRefreshHandler, setSessionExpiredHandler } from '@/api/client';
import { tokenStore } from '@/services/auth/tokenStore';
import { authReducer, initialAuthState } from './authReducer';

interface AuthContextValue {
  session: Session | null;
  role: Role | null;
  status: 'restoring' | 'unauthenticated' | 'authenticated';
  signIn: (email: string, password: string, role: Role) => Promise<void>;
  requestOtp: (identifier: string) => Promise<{ channel: 'sms' | 'email'; sent: boolean }>;
  signInWithOtp: (identifier: string, code: string) => Promise<void>;
  setPassword: (args: { token: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialAuthState);

  // Wire client refresh + session-expired handlers once.
  useEffect(() => {
    setRefreshHandler(async () => {
      const persisted = await tokenStore.load();
      if (!persisted?.refresh) return null;
      try {
        const { access, refresh } = await services.auth.refresh(persisted.refresh);
        await tokenStore.save({ ...persisted, access, refresh: refresh ?? persisted.refresh });
        return access;
      } catch {
        return null;
      }
    });
    setSessionExpiredHandler(() => {
      void tokenStore.clear();
      dispatch({ type: 'SIGNED_OUT' });
    });
    return () => {
      setRefreshHandler(null);
      setSessionExpiredHandler(null);
    };
  }, []);

  // Launch bootstrap: restore persisted session, validate via /me.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const persisted = await tokenStore.load();
      if (!persisted?.access) {
        if (!cancelled) dispatch({ type: 'RESTORE_FAILED' });
        return;
      }
      setAuthToken(persisted.access);
      try {
        const me = await services.auth.getMe();
        if (!cancelled) {
          dispatch({ type: 'SIGNED_IN', session: { token: persisted.access, role: me.role, email: me.email } });
        }
      } catch {
        await tokenStore.clear();
        setAuthToken(null);
        if (!cancelled) dispatch({ type: 'RESTORE_FAILED' });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session: state.session,
      role: state.session?.role ?? null,
      status: state.status,
      signIn: async (email, password, role) => {
        const session = await services.auth.signIn(email, password, role);
        setAuthToken(session.token);
        dispatch({ type: 'SIGNED_IN', session });
      },
      requestOtp: (identifier) => services.auth.requestOtp(identifier),
      signInWithOtp: async (identifier, code) => {
        const session = await services.auth.verifyOtp(identifier, code);
        setAuthToken(session.token);
        dispatch({ type: 'SIGNED_IN', session });
      },
      setPassword: (args) => services.auth.setPassword(args),
      signOut: async () => {
        await services.auth.signOut();
        setAuthToken(null);
        dispatch({ type: 'SIGNED_OUT' });
      },
    }),
    [state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
```

- [ ] **Step 6: Verify the navigator already handles `restoring`**

Run: `npx tsc --noEmit`
Then check the root navigator's use of `status`/`useAuth`:

Run: `npm test -- authReducer` and inspect: `grep -rn "status ===\|useAuth()" src/navigation src/App.tsx 2>/dev/null`
- If a consumer does `status === 'authenticated' ? <App/> : <Auth/>`, the new `'restoring'` value falls through to the Auth branch — acceptable (login won't flash because bootstrap is synchronous-fast), but **preferred**: render the existing splash/loading view while `status === 'restoring'`. If a `Loading` component exists, gate on it:
  ```tsx
  if (status === 'restoring') return <Loading />;
  ```
  Use the existing loading component only — do not create a new one. If none exists, leave the binary branch (no UI change) and note it.

- [ ] **Step 7: Commit**

```bash
git add src/providers/authReducer.ts src/providers/AuthProvider.tsx src/providers/__tests__/authReducer.test.ts
git commit -m "feat(student): auth bootstrap, restoring status, refresh + session-expired wiring"
```

---

## Task 10: Standardize not-registered 404 copy on the password path

**Files:**
- Modify: `src/screens/LoginScreen.tsx`
- Test: none (UI copy mapping; verified manually — no logic branch worth a unit test beyond the existing `mapOtpError`)

**Interfaces:**
- Consumes: `ApiError` (already imported).
- Produces: the student-password `submit` handler catches errors and renders the not-registered message via the existing `styles.error`, matching the parent-OTP behavior.

- [ ] **Step 1: Add a shared error mapper + form error state**

In `LoginScreen.tsx`, update the existing `mapOtpError` to the standardized copy and reuse it for both paths:

```tsx
  const mapAuthError = (err: unknown): string => {
    if (err instanceof ApiError) {
      if (err.status === 404) return 'No account is registered for this email/mobile. Contact your school to get set up.';
      if (err.status === 401) return 'Incorrect or expired code. Try again.';
    }
    return 'Something went wrong. Please try again.';
  };
```

Replace remaining `mapOtpError(...)` calls with `mapAuthError(...)`. For the OTP 401 path the copy is code-specific; keep a 401 override inline where it currently reads "Incorrect or expired code" (already covered above).

- [ ] **Step 2: Add password-path error state + display**

Add state near the other `useState` calls:

```tsx
  const [loginError, setLoginError] = useState<string | null>(null);
```

Update `submit`:

```tsx
  const submit = handleSubmit(async (data) => {
    setLoginError(null);
    try {
      await signIn(data.studentId, data.password, role);
    } catch (err) {
      setLoginError(mapAuthError(err));
    }
  });
```

Render the message above the student "Sign in" button, reusing the existing error style (no new style added):

```tsx
                {loginError ? <Text style={styles.error}>{loginError}</Text> : null}
                <Button
                  variant="primary"
                  size="lg"
                  full
                  loading={formState.isSubmitting}
                  onPress={submit}
                >
                  Sign in
                </Button>
```

- [ ] **Step 3: Verify typecheck + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: no new errors; `mapOtpError` fully replaced (no unused-symbol warning).

- [ ] **Step 4: Commit**

```bash
git add src/screens/LoginScreen.tsx
git commit -m "feat(student): standardize not-registered 404 copy across login paths"
```

---

## Task 11: Verification — opt-in live integration smoke + manual pass

**Files:**
- Modify: `src/services/http/__tests__/smoke.test.ts`

**Interfaces:**
- Consumes: `pingHealth`, `buildServices`, real backend env (`LIVE_API` + token).
- Produces: an integration suite that is skipped unless `process.env.LIVE_API` is set, so CI without a backend stays green.

- [ ] **Step 1: Replace the placeholder smoke test**

```ts
// src/services/http/__tests__/smoke.test.ts
import { pingHealth } from '@/api/client';
import { buildServices } from '@/services';
import { setAuthToken } from '@/api/client';

const live = process.env.LIVE_API ? describe : describe.skip;

describe('jest runner', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});

live('live /v1 smoke', () => {
  beforeAll(() => {
    if (process.env.LIVE_TOKEN) setAuthToken(process.env.LIVE_TOKEN);
  });

  it('health responds', async () => {
    expect(await pingHealth()).toBe(true);
  });

  it('subjects map to valid models', async () => {
    const s = buildServices('http');
    const subjects = await s.subjects.list();
    expect(Array.isArray(subjects)).toBe(true);
    if (subjects.length) expect(typeof subjects[0].name).toBe('string');
  });

  it('homework maps to valid models', async () => {
    const s = buildServices('http');
    const hw = await s.homework.list();
    expect(Array.isArray(hw)).toBe(true);
  });
});
```

- [ ] **Step 2: Confirm CI-safe (no backend)**

Run: `npm test -- smoke.test`
Expected: PASS — the `live(...)` block is skipped; only the runner test executes.

- [ ] **Step 3: Run the full suite**

Run: `npm test`
Expected: all suites PASS.

- [ ] **Step 4: Manual live pass (documented, not automated)**

With the dev backend reachable and `app.json` `apiBaseUrl` pointed at it:
- Run: `npm run web`
- Verify: no login flash on launch (restoring → login), student password login succeeds, parent OTP login succeeds.
- Verify each tab/screen renders live data with working loading/error/empty states (existing components).
- Verify: an unknown identifier shows *"No account is registered for this email/mobile…"* and stays on step 1.
- Verify: the startup `console.info` lists exactly the 8 mock-backed features.
- Force a 401 (expire/clear the token) and confirm one silent refresh+retry, then session-expired → login on refresh failure.

- [ ] **Step 5: Commit**

```bash
git add src/services/http/__tests__/smoke.test.ts
git commit -m "test(student): opt-in live integration smoke gated by LIVE_API"
```

---

## Self-Review

**Spec coverage:**
- Client hardening (refresh single-flight, error model, timeout, redaction) → Tasks 1, 4. *(Token redaction: client never logs the token; the only `console.info` is the mock-backed list, which contains no tokens — satisfied by omission.)*
- Token persistence + auth completion (`refresh`/`setPassword`/`getMe`) + bootstrap + `restoring` → Tasks 3, 5, 6, 9.
- Per-domain source switch + default `http` + startup log → Tasks 2, 8.
- Rebind real endpoints (9 direct + derived) → Tasks 6, 7. *(Direct domains subjects/homework/announcements/messaging/directory already use correct version-less paths; the `/v1` prefix is supplied by `API_BASE_URL` — no per-line change needed, verified live in Task 11.)*
- Gap flagging (7 features mock + startup log) → Task 8 (method-level for student/parent).
- 404 not-registered decision → Task 10.
- Verification (`/health`, opt-in smoke, manual) → Task 11.

**Placeholder scan:** No TBD/TODO. Every code step shows full code. "Verify against live" notes are explicit contract-confirmation instructions (the spec mandates live responses as source of truth), not deferred work — each names the exact path/field to confirm and the fallback.

**Type consistency:** `PersistedSession` (Task 3) used identically in Tasks 6 & 9. `AuthService.{refresh,setPassword,getMe}` signatures (Task 5) match the mock (Task 5), http (Task 6), and provider (Task 9) call sites. `refresh` returns `{access, refresh}` everywhere. `AuthState.status` union (`restoring|unauthenticated|authenticated`) matches `AuthContextValue.status`. `setRefreshHandler`/`setSessionExpiredHandler`/`pingHealth` defined in Task 4, consumed in Tasks 9 & 11.

**Known live-contract assumptions to confirm during Task 7/11 (flagged, with fallbacks):** `GET /students` is guardian-scoped; fees/leave filter param is `student_id`; `/auth/refresh`, `/auth/set-password`, `/auth/me` paths/fields. Each has a stated fallback (move to mock / adjust literal).
