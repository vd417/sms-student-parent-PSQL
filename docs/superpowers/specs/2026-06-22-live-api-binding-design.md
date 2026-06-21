# Live API Binding — Student & Parent App

**Date:** 2026-06-22
**Status:** Approved (design)
**Branch context:** `field-alignment-canonical`

## Summary

Bind the Student & Parent app to the live `/v1` backend (Swagger: `/swagger/student/swagger.json`) as the default data source, replacing mock data for every feature that has a real endpoint. Auth is brought to production grade (token refresh, secure persistence, launch bootstrap). The seven features with no backing endpoint stay on mock behind an explicit per-domain flag — never presented as live data.

## Goal & success criteria

- App runs with `DATA_SOURCE='http'` as the default; live data flows end to end.
- Every domain with a real endpoint is bound and verified against the running backend.
- Auth supports refresh, `set-password`, `GET /me` bootstrap, and secure persisted sessions.
- The 7 endpoint-less features remain functional on mock, clearly flagged (code comment + startup log), with stub HTTP impls ready to flip on.
- **Hard constraint: no UI changes.** All work happens behind the existing `Services` interface and React Query hooks. Screens and components are untouched. Gap features keep rendering (on mock) rather than being hidden.

## Constraints

- **No UI changes** — binding is confined to `src/api`, `src/services`, `src/providers/AuthProvider.tsx`, and config. The `Services` interface in `src/services/types.ts` and all hook signatures stay stable so screens require zero edits.
- Live backend with full schema is available; real response JSON is the source of truth. Where existing canonical DTOs differ from live responses, fix the DTO/mapper to match live (UI-facing model in `src/models` stays stable to honor the no-UI-change rule).
- Cross-platform (native + web via `react-native-web`): storage and any platform APIs must work on both.

## Gap analysis (app domain → real API)

**Direct map (need `/v1` prefix + DTO check) — 9 domains:**
`auth` (login/otp/logout), `subjects`, `homework`, `exam-papers`→exams, `announcements`, `threads`→messaging, `teachers`→directory, `leave`, `fees`→`/v1/fees/invoices` (+ `/invoices/{id}/pay`, `/payments`).

**Derivable (endpoint exists; app currently calls a non-existent path):**
- `student.getProfile` → `GET /v1/auth/me` → `GET /v1/students/{id}`
- `grades` read → `GET /v1/exam-papers/{id}/grades` (aggregate across papers)
- `parent.children` → `GET /v1/students` (assumed guardian-scoped — verify live)
- per-child `fees` / `leave` → list endpoints filtered by student id

**No backing endpoint — 7 features (stay mock, flagged):**
`school.getCurrent`, `student.getToday`, `student.getPeers`, `student.getAchievements`, `parent.childToday` (meals/pickup), `ptm`, `transport`, `attendance`.

**New endpoints not used by current screens (out of scope):** `notifications`, `calendar`, `assignments`, and all create-side `POST/PATCH/DELETE` not already consumed.

## Architecture

### 1. HTTP client hardening — `src/api/client.ts`, `src/api/config.ts`
- `API_BASE_URL` ends in `/v1`; sourced from `app.json` `extra.apiBaseUrl` + EAS env per environment (dev/staging/prod). Add a `/health` ping helper.
- Keep Bearer header injection.
- **Token refresh:** on `401`, call `POST /v1/auth/refresh` with the refresh token and retry the original request once. **Single-flight:** concurrent 401s share one in-flight refresh promise and queue behind it. On refresh failure → clear session → emit a "session-expired" event that `AuthProvider` subscribes to.
- **Error model:** normalize non-2xx into `ApiError` carrying `status` + parsed body (tolerant of RFC7807 `{type,title,detail}` and `{message}`). Network/timeout → typed error. Add `AbortController`-based timeout.
- Never log tokens; redact in any logging hook.

### 2. Token persistence & auth flow
- **Storage adapter** `src/services/auth/tokenStore.ts`: `expo-secure-store` on native, `localStorage` on web (new dependency: `expo-secure-store`). Persists `{access, refresh, user, role, tenant}`.
- **Complete `AuthService`:** add `refresh`, `setPassword`, `getMe`. `signIn`/`verifyOtp` persist tokens on success.
- **Bootstrap:** on launch, `AuthProvider` loads persisted tokens → `GET /v1/auth/me` to validate → resolves `authenticated`/`unauthenticated`. Add a `restoring` status so the login screen does not flash before restore completes. `signOut` clears storage and calls `POST /v1/auth/logout`.
- `AuthProvider`'s public context shape is unchanged where consumed by UI; new methods (`setPassword`) are additive and only used by existing auth screens already calling the service.

### 3. Per-domain data-source switch — `config.ts` + `services/index.ts`
- `DATA_SOURCE` default flips to `'http'`.
- New `DOMAIN_SOURCE: Partial<Record<keyof Services, 'http' | 'mock'>>` overriding the global per domain. The 7 gap domains are pinned to `'mock'`; everything else resolves to `'http'`.
- `buildServices` composes per-domain so live and flagged-mock services coexist in one `Services` object.
- One startup `console.info` lists which domains are running on mock — honest and visible.

### 4. Rebind real endpoints — `services/http/index.ts`
- Apply `/v1` prefix and correct paths for the 9 direct domains.
- Implement derived domains as described in the gap analysis.
- DTOs/mappers already exist and are canonical; adjust paths and reconcile field drift **against live responses** per domain. Keep `src/models` (UI-facing types) stable.

### 5. Gap domains (mock, flagged) — `services/index.ts`
- Each keeps its mock impl, registered as `'mock'` in `DOMAIN_SOURCE` with a code comment.
- Write stub HTTP impls behind the flag so flipping to live is a one-line change once the backend ships them.

### 6. Verification
- `/health` reachability check.
- Per-domain live smoke: hit each bound endpoint with a real token and assert the mapper yields a valid model. Extend existing `src/services/http/__tests__/smoke.test.ts` into an opt-in integration suite gated by an env var, so CI without a backend still passes.
- Manual: log in (password + OTP), navigate every screen, confirm live data plus loading/error/empty states (existing `Loading`, `ErrorState`, `Empty` components — no new UI).

## Implementation order (phased)

1. **Foundation** — client hardening + token store + auth completion + bootstrap.
2. **Switch + direct domains** — per-domain config, flip the 9 direct domains, verify each live.
3. **Derived domains** — me→student, grades, parent/children, filtered fees/leave.
4. **Gap flagging** — pin 7 domains to mock, add stub HTTP impls, startup log.
5. **Verify** — integration smoke + manual pass.

## Key assumption to verify against live API

There is no parent→children endpoint. We assume `GET /v1/students` returns the authenticated guardian's children. If the live response does not behave that way, parent-mode child list becomes a gap domain (mock + flag) until the backend provides a guardian-scoped endpoint.

## Out of scope (YAGNI)

`notifications`, `calendar`, `assignments`, all create-side write endpoints not consumed by current screens, and any UI/screen changes.
