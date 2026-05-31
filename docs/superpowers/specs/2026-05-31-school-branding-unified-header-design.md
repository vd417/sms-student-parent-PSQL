# School Branding + Unified Header (SaaS-ready) — Design

**Date:** 2026-05-31
**Status:** Approved
**App:** `sms-student` (Expo / React Native — Student + Parent modules)

## Context

The app today ships both the Student and Parent experiences (23 screens) on a clean
`hooks → services → mock | http` data layer with a config-flag swap
(`app.json` → `expo.extra.dataSource`). Two gaps block it from feeling like a
production, multi-school SaaS product:

1. **Inconsistent header / back navigation.** A reusable `ScreenHeader`
   (`src/components/ui/ScreenHeader.tsx`) already supports an optional back button,
   but only pushed/detail screens use it; top-level tab screens roll their own
   header. Back affordance is therefore inconsistent across pages.
2. **No school identity.** "Westbrook Academy" is a hardcoded string on the
   Student/Child model; the Login screen shows a generic icon. There is no
   `School`/tenant concept, so the app cannot show *which* school a user belongs to,
   and there is no seam for that branding to come from a real backend.

This change adds a display-only **School branding domain** and a **unified header**
so that (a) every page has the right navigation affordance (back where it makes
sense, branding on top-level screens), and (b) the school logo + name are sourced
from the backend exactly like every other domain — mock now, real API later. The
school admin owns logo/name via the backend; the app only views them.

## Goals

- One header pattern across all 23 screens: **logo + name on top-level tab screens**,
  **back chevron + title on every pushed/detail screen**.
- A `School` domain (`{ id, name, logoUrl }`) fetched via a `useSchool()` hook that
  swaps mock → HTTP with the existing `DATA_SOURCE` flag. Tenant is resolved
  server-side from the auth token (no `schoolId` passed from the app).
- Logo rendered from a remote `logoUrl` with **graceful fallback** to a monogram /
  icon when empty or failed.
- Every page renders correctly with mock data (loading / error / empty states +
  working write actions) — no screen left broken.
- README documents the new domain and its API swap.

## Non-Goals (YAGNI)

- **No per-school theme colors** — branding is logo + name only; the Iceberg palette
  stays fixed.
- **No in-app editing** of logo/name — admin owns it via the backend.
- **No full `tenantId`-on-every-entity refactor** — multi-tenant data isolation is a
  server-side (API) responsibility; the client only fetches "my school".

## Architecture

### A. `School` branding domain (the SaaS seam)

Follows the existing domain pattern exactly, so the mock → real-API swap is identical
to every other service.

- **Model** — add to `src/models/index.ts`:
  ```ts
  export interface School {
    id: string;
    name: string;
    shortName?: string; // for the compact header variant
    logoUrl: string;    // remote URL; may be empty
  }
  ```
- **Service interface** — add to `src/services/types.ts`:
  ```ts
  export interface SchoolService {
    getCurrent(): Promise<School>; // tenant resolved server-side from auth token
  }
  ```
  Add `school: SchoolService` to the `Services` type.
- **Mock** — `src/services/mock/fixtures/school.ts` (Westbrook Academy + a
  placeholder `logoUrl`), seeded into `src/services/mock/db.ts` as `db.school`;
  `src/services/mock/school.mock.ts` returns it via the existing `withLatency` helper.
- **HTTP** — `src/services/http/school.http.ts` → `apiFetch<School>('/school')`
  (or the project's `NotImplementedError` stub style, consistent with siblings).
- **Registry** — wire `school` into both `mockServices()` and `httpServices` in
  `src/services/index.ts`.
- **Hook** — `src/hooks/useSchool.ts`: `useSchool()` → React Query
  `services.school.getCurrent()`; add a `school` key to `src/hooks/keys.ts`.

### B. `SchoolBadge` component

- `src/components/ui/SchoolBadge.tsx`, exported from `src/components/ui/index.ts`.
- Consumes `useSchool()`. Renders the logo `<Image source={{ uri: logoUrl }}>` + name.
- **Fallback chain:** empty `logoUrl` or image `onError` → monogram (initials derived
  from `name`, e.g. "WA") in a colored circle, or the Ionicons `school` icon.
- States: skeleton/placeholder while loading; name-only + fallback icon on error.
- Variants: full (logo + full name) and compact (logo + `shortName`) for tight headers.

### C. Unified header

- Extend `ScreenHeader` with a `brand?: boolean` prop. When `true`, the left/center
  region renders `SchoolBadge` instead of the back chevron (used by tab screens).
  Existing props (`title`, `kicker`, `onBack`, `right`) keep working unchanged.
- **Top-level tab screens (10: 5 student + 5 parent)** use the branded header.
  Migrate the screens that currently roll their own header row
  (`HomeScreen`, `SubjectsScreen`, `ScheduleScreen`, and `ProfileScreen`'s gradient
  hero) so all tab screens carry branding consistently. Profile works the logo + name
  into its existing hero rather than replacing it.
- **Login screen** swaps its generic icon for `SchoolBadge`.
- **Pushed/detail screens** keep the existing back-chevron + title header (no branding).

### D. Back-affordance audit

Verify each of the 12 pushed screens passes `onBack={() => nav.goBack()}` to
`ScreenHeader`, and add it where missing:

- Student: `Schedule`, `HomeworkDetail`, `SubjectDetail`, `Grades`, `ChatThread`,
  `Announcements`.
- Parent: `Attendance`, `PTM`, `Transport`, `Leave`, `Announcements`, `ChatThread`.

Android hardware back already works via react-navigation's native stack.

### E. All-pages-work pass

Walk all 23 screens for both roles via `npm run web` (and a real `expo export` bundle).
Confirm each renders with mock data, has loading / error / empty coverage, and that
write actions (pay fee, submit leave, set PTM status, send message, submit/clear
homework) still work. Fix anything broken.

### F. Docs

Update `README.md`: add the `School` domain to the data-layer/swap section, note that
logo/name are admin-owned (view-only in app), and that the tenant is resolved
server-side from the auth token.

## Data Flow

```
Login / Tab screen / Profile
        │  useSchool()
        ▼
  React Query hook  ──►  SchoolService.getCurrent()
                              │
                 ┌────────────┴────────────┐
                 ▼ today                    ▼ later
            mock (fixture +            http  GET /school
            db.school)                 (tenant from auth token)
```

`SchoolBadge` is the single consumer of `useSchool()`; every header that shows
branding renders `SchoolBadge`, so there is exactly one place that knows how to fetch
and fall back.

## Error / Edge Handling

- **No/blank logo:** monogram or icon fallback; name still shows.
- **`useSchool()` loading:** skeleton placeholder in the badge; header layout stable.
- **`useSchool()` error:** fallback icon + best-effort name (or app name) — header
  never blocks the screen.
- **Long names:** `numberOfLines={1}` + `shortName` in the compact variant.

## Testing / Verification

- **Unit:** mock `SchoolService.getCurrent()` returns the fixture; registry selects
  mock vs http for `school` (mirror the existing service-selection test).
- **Component:** `SchoolBadge` falls back to monogram/icon when `logoUrl` is empty.
- **End-to-end:** `npm run web` — log in as student and as parent; confirm logo + name
  appear on all tab screens + Login + Profile, and a back chevron appears (and works)
  on every pushed screen. Run `expo export --platform web` → exit 0.
- **Gates:** `npx tsc --noEmit` (no NEW errors beyond the 1 known pre-existing
  `App.tsx` one), `npx jest` green, `npm run lint` clean.

## Affected / New Files (representative)

- New: `src/services/mock/fixtures/school.ts`, `src/services/mock/school.mock.ts`,
  `src/services/http/school.http.ts`, `src/hooks/useSchool.ts`,
  `src/components/ui/SchoolBadge.tsx`.
- Edited: `src/models/index.ts`, `src/services/types.ts`, `src/services/index.ts`,
  `src/services/mock/db.ts`, `src/hooks/keys.ts`,
  `src/components/ui/ScreenHeader.tsx`, `src/components/ui/index.ts`,
  the 10 tab screens + `LoginScreen`, the 12 pushed screens (back audit),
  `README.md`.
