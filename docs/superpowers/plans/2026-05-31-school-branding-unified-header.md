# School Branding + Unified Header Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a display-only `School` branding domain (logo + name from the backend) and one unified header so every top-level screen shows the school logo/name and every pushed screen has a working back button, across all 23 student/parent screens.

**Architecture:** Mirror the existing `hooks → services → mock | http` data layer for a new `School` domain (tenant resolved server-side from the auth token; app never passes a `schoolId`). A `SchoolBadge` component consumes a `useSchool()` hook and is the single place that fetches branding and falls back gracefully. `ScreenHeader` gains a `brand` mode so tab screens render the badge while detail screens keep back + title.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript, React Navigation 7, TanStack Query 5, jest-expo, `@expo/vector-icons` (Ionicons).

**Conventions confirmed from the codebase (follow exactly):**
- Models: `export interface X {}` in `src/models/index.ts`, imported via `@/models`.
- Service interfaces in `src/services/types.ts`; the `Services` interface lists every domain. Adding a domain there REQUIRES adding it to both `mockServices()` (`src/services/index.ts`) and `httpServices` (`src/services/http/index.ts`) or `tsc` fails — do them in one task.
- Mock service = a factory `xMock(opts: Opts = {})` returning an object whose methods call `withLatency(() => db.<x>, opts)` — note `withLatency` takes a **thunk**, not a value (`src/services/mock/latency.ts`).
- Fixtures live in `src/services/mock/fixtures/*.ts`; `db.ts` deep-`clone()`s them into `db`.
- HTTP impls live in one literal `httpServices: Services` object in `src/services/http/index.ts`; each method is `() => ni('domain.method')` where `ni` throws `NotImplementedError` (the real `apiFetch` swap is a later dev's job — keep the stub style consistent).
- Hooks = thin `useQuery({ queryKey: qk.x, queryFn: () => services.x.method() })` (`src/hooks/`), keys in `src/hooks/keys.ts`.
- UI components in `src/components/ui/`, re-exported from `src/components/ui/index.ts`.
- Path alias `@/` → `src/`.

**Verification gates (run after each task that changes code):**
- `npx tsc --noEmit` — must report **only** the 1 known pre-existing error (`App.tsx` unused `@ts-expect-error`). No NEW errors.
- `npx jest` — all green.
- `npm run lint` — 0 errors (the 2 gesture-handler dup-import warnings in `App.tsx` are pre-existing).

---

## Task 1: `School` domain — model, service, fixture, mock, http stub, registry

**Files:**
- Modify: `src/models/index.ts`
- Modify: `src/services/types.ts`
- Create: `src/services/mock/fixtures/school.ts`
- Create: `src/services/mock/school.mock.ts`
- Modify: `src/services/mock/db.ts`
- Modify: `src/services/http/index.ts`
- Modify: `src/services/index.ts`
- Modify: `src/hooks/keys.ts`
- Test: `src/services/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing test**

Add these two cases to `src/services/__tests__/registry.test.ts`, inside the existing `describe('service registry', ...)` block:

```ts
  it('exposes a school service in the mock registry', () => {
    const mock = buildServices('mock');
    expect(mock.school).toBeDefined();
    expect(typeof mock.school.getCurrent).toBe('function');
  });

  it('mock school.getCurrent resolves to the seeded school', async () => {
    const mock = buildServices('mock');
    const school = await mock.school.getCurrent();
    expect(school.name).toBe('Westbrook Academy');
    expect(school.id).toBe('sch-001');
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest registry -t "school"`
Expected: FAIL — `mock.school` is undefined / `Property 'school' does not exist on type 'Services'`.

- [ ] **Step 3: Add the `School` model**

In `src/models/index.ts`, add (next to the other interfaces):

```ts
export interface School {
  id: string;
  name: string;
  shortName?: string;
  logoUrl: string;
}
```

- [ ] **Step 4: Add the `SchoolService` interface and register it on `Services`**

In `src/services/types.ts`:

Add `School` to the `import type { ... } from '@/models';` list (keep alphabetical: it goes between `Role`/`Session` region — placement is cosmetic, just include it).

Add the interface (next to the other service interfaces):

```ts
export interface SchoolService {
  getCurrent(): Promise<School>;
}
```

Add this line to the `Services` interface (top of the list is fine, e.g. right under `auth`):

```ts
  school: SchoolService;
```

- [ ] **Step 5: Create the fixture**

Create `src/services/mock/fixtures/school.ts`:

```ts
import type { School } from '@/models';

export const school: School = {
  id: 'sch-001',
  name: 'Westbrook Academy',
  shortName: 'Westbrook',
  // Placeholder remote logo — the real URL is supplied by the school admin via the backend.
  logoUrl: 'https://dummyimage.com/200x200/0C4A6E/ffffff.png&text=WA',
};
```

- [ ] **Step 6: Seed it into the mock db**

In `src/services/mock/db.ts`:

Add the model to the `import type { ... } from '@/models';` list:

```ts
  School,
```

Add the fixture import next to the existing fixture imports:

```ts
import * as schoolFx from './fixtures/school';
```

Add to the `MockDb` type:

```ts
  school: School;
```

Add to the `db` object literal:

```ts
  school: clone(schoolFx.school),
```

- [ ] **Step 7: Create the mock service**

Create `src/services/mock/school.mock.ts` (mirrors the `opts`/thunk shape of the other mocks, e.g. `studentMock`):

```ts
import type { SchoolService } from '../types';
import { db } from './db';
import { withLatency } from './latency';

interface Opts {
  ms?: number;
  errorRate?: number;
}

export function schoolMock(opts: Opts = {}): SchoolService {
  return {
    getCurrent: () => withLatency(() => db.school, opts),
  };
}
```

- [ ] **Step 8: Add the HTTP stub**

In `src/services/http/index.ts`, add to the `httpServices` object literal (matches the existing `() => ni('domain.method')` style):

```ts
  school: { getCurrent: () => ni('school.getCurrent') },
```

- [ ] **Step 9: Wire the mock into the registry**

In `src/services/index.ts`:

Add the import:

```ts
import { schoolMock } from './mock/school.mock';
```

Add to the object returned by `mockServices()`:

```ts
    school: schoolMock(),
```

- [ ] **Step 10: Add the query key**

In `src/hooks/keys.ts`, add inside the `qk` object:

```ts
  school: ['school'] as const,
```

- [ ] **Step 11: Run the test + gates to verify they pass**

Run: `npx jest registry`
Expected: PASS (all registry cases, including the two new `school` ones).
Run: `npx tsc --noEmit`
Expected: only the 1 known pre-existing `App.tsx` error.

- [ ] **Step 12: Commit**

```bash
git add src/models/index.ts src/services/types.ts src/services/mock/fixtures/school.ts src/services/mock/school.mock.ts src/services/mock/db.ts src/services/http/index.ts src/services/index.ts src/hooks/keys.ts src/services/__tests__/registry.test.ts
git commit -m "feat: add School branding domain (model, service, mock, registry)"
```

---

## Task 2: `useSchool()` hook

**Files:**
- Create: `src/hooks/useSchool.ts`

- [ ] **Step 1: Create the hook**

Create `src/hooks/useSchool.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import { services } from '@/services';
import { qk } from './keys';

export function useSchool() {
  return useQuery({
    queryKey: qk.school,
    queryFn: () => services.school.getCurrent(),
  });
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: only the 1 known pre-existing `App.tsx` error.

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useSchool.ts
git commit -m "feat: add useSchool query hook"
```

---

## Task 3: `monogramFromName` helper (TDD)

This pure helper powers the logo fallback and is unit-testable without RN render infra (matching the repo's service-only test style).

**Files:**
- Create: `src/components/ui/monogram.ts`
- Test: `src/components/ui/__tests__/monogram.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/ui/__tests__/monogram.test.ts`:

```ts
import { monogramFromName } from '../monogram';

describe('monogramFromName', () => {
  it('uses the first letter of the first two words', () => {
    expect(monogramFromName('Westbrook Academy')).toBe('WA');
  });
  it('uppercases a single-word name to its first letter', () => {
    expect(monogramFromName('westbrook')).toBe('W');
  });
  it('returns "?" for an empty/whitespace name', () => {
    expect(monogramFromName('   ')).toBe('?');
  });
  it('ignores extra whitespace between words', () => {
    expect(monogramFromName('a   b   c')).toBe('AB');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest monogram`
Expected: FAIL — `Cannot find module '../monogram'`.

- [ ] **Step 3: Implement the helper**

Create `src/components/ui/monogram.ts`:

```ts
export function monogramFromName(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0][0].toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest monogram`
Expected: PASS (4 cases).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/monogram.ts src/components/ui/__tests__/monogram.test.ts
git commit -m "feat: add monogramFromName helper for logo fallback"
```

---

## Task 4: `SchoolBadge` component

**Files:**
- Create: `src/components/ui/SchoolBadge.tsx`
- Modify: `src/components/ui/index.ts`

- [ ] **Step 1: Create the component**

Create `src/components/ui/SchoolBadge.tsx`:

```tsx
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, fontFamily, spacing, typography } from '@/theme';
import { useSchool } from '@/hooks/useSchool';
import { monogramFromName } from './monogram';

type Props = { compact?: boolean };

export function SchoolBadge({ compact = false }: Props) {
  const { data: school, isLoading } = useSchool();
  const [imgFailed, setImgFailed] = useState(false);

  const showImage = !!school?.logoUrl && !imgFailed;
  const name = school ? (compact && school.shortName ? school.shortName : school.name) : '';

  return (
    <View style={styles.row}>
      <View style={styles.logo}>
        {isLoading ? (
          <View style={styles.skeleton} />
        ) : showImage ? (
          <Image
            source={{ uri: school!.logoUrl }}
            style={styles.img}
            onError={() => setImgFailed(true)}
          />
        ) : school ? (
          <Text style={styles.monogram}>{monogramFromName(school.name)}</Text>
        ) : (
          <Ionicons name="school" size={18} color={colors.white} />
        )}
      </View>
      <Text style={[typography.bodyStrong, styles.name]} numberOfLines={1}>
        {isLoading ? 'Loading…' : name || 'School'}
      </Text>
    </View>
  );
}

const SIZE = 36;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.s, flexShrink: 1 },
  logo: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  img: { width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  skeleton: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, backgroundColor: colors.rule },
  monogram: { color: colors.white, fontFamily: fontFamily.extraBold, fontSize: 14 },
  name: { flexShrink: 1 },
});
```

Note: `colors.primary`, `colors.white`, `colors.rule`, `fontFamily.extraBold`, `typography.bodyStrong`, and the `spacing` tokens are all confirmed present in `src/theme`. If `colors.rule` is missing, use `colors.primarySoft` for the skeleton.

- [ ] **Step 2: Export it from the UI barrel**

In `src/components/ui/index.ts`, add:

```ts
export { SchoolBadge } from './SchoolBadge';
```

- [ ] **Step 3: Verify it compiles + lints**

Run: `npx tsc --noEmit`
Expected: only the 1 known pre-existing `App.tsx` error.
Run: `npm run lint`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SchoolBadge.tsx src/components/ui/index.ts
git commit -m "feat: add SchoolBadge component with logo + monogram fallback"
```

---

## Task 5: Add `brand` mode to `ScreenHeader`

**Files:**
- Modify: `src/components/ui/ScreenHeader.tsx`

- [ ] **Step 1: Update the props and render**

In `src/components/ui/ScreenHeader.tsx`:

Add the import (direct, not via the barrel, to avoid a circular import):

```tsx
import { SchoolBadge } from './SchoolBadge';
```

Change the `Props` type to make `title` optional and add `brand`:

```tsx
type Props = {
  title?: string;
  kicker?: string;
  onBack?: () => void;
  right?: ReactNode;
  brand?: boolean;
};
```

Update the destructure and the center block:

```tsx
export function ScreenHeader({ title, kicker, onBack, right, brand }: Props) {
  return (
    <View style={styles.root}>
      <View style={styles.row}>
        {onBack ? (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.center}>
          {brand ? (
            <SchoolBadge />
          ) : (
            <>
              {kicker ? <Text style={typography.eyebrow}>{kicker}</Text> : null}
              {title ? (
                <Text style={[typography.h1, styles.title]} numberOfLines={1}>
                  {title}
                </Text>
              ) : null}
            </>
          )}
        </View>
        <View style={styles.right}>{right}</View>
      </View>
    </View>
  );
}
```

(Leave the `styles` block unchanged.)

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit`
Expected: only the 1 known pre-existing `App.tsx` error.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/ScreenHeader.tsx
git commit -m "feat: add brand mode to ScreenHeader (renders SchoolBadge)"
```

---

## Task 6: Show branding on the 10 tab screens + Login + Profile

The 12 branded surfaces:
- Student tabs: `src/features/student/screens/HomeScreen.tsx`, `HomeworkListScreen.tsx`, `SubjectsScreen.tsx`, `InboxScreen.tsx`, `ProfileScreen.tsx`
- Parent tabs: `src/features/parent/screens/ParentHomeScreen.tsx`, `ParentProgressScreen.tsx`, `ParentFeesScreen.tsx`, `ParentChatScreen.tsx`, `ParentProfileScreen.tsx`
- `src/screens/LoginScreen.tsx`

**Pattern (apply per screen):**

- **If the screen already uses `<ScreenHeader ... />`** (e.g. Fees, Homework list, Inbox): add the `brand` prop so the logo/name appear above/with the title. Two acceptable shapes — pick whichever matches the screen's existing layout:
  - `<ScreenHeader brand right={<IconButton icon="..." />} />` (badge only), or
  - keep the existing `<ScreenHeader kicker=... title=... />` and place a separate `<SchoolBadge />` row directly above it.
- **If the screen rolls its own custom header row** (e.g. `HomeScreen`, `SubjectsScreen`, `ParentHomeScreen`): import `SchoolBadge` from `@/components/ui` and render `<SchoolBadge />` as the first element inside that header row (left-aligned, before the existing title/avatar).
- **`ProfileScreen` / `ParentProfileScreen`** (gradient hero): import `SchoolBadge` and render it inside the hero, near the top, so the school identity sits with the user identity.
- **`LoginScreen`**: replace the generic `<Ionicons name="school" .../>` + hardcoded "School Desk" text block with `<SchoolBadge />` (import from `@/components/ui`).

- [ ] **Step 1: Apply the branded header to all 5 student tab screens**

For each student tab screen, add the import if not present:

```tsx
import { SchoolBadge } from '@/components/ui';
```

then apply the pattern above. Save each file.

- [ ] **Step 2: Apply the branded header to all 5 parent tab screens**

Same pattern for the 5 parent tab screens.

- [ ] **Step 3: Brand the Login screen**

In `src/screens/LoginScreen.tsx`, import `SchoolBadge` and replace the generic icon/title block with `<SchoolBadge />`.

- [ ] **Step 4: Verify compile + lint + bundle**

Run: `npx tsc --noEmit`
Expected: only the 1 known pre-existing `App.tsx` error.
Run: `npm run lint`
Expected: 0 errors.
Run: `npx expo export --platform web --output-dir ._tmp` then delete `._tmp`.
Expected: exit 0 / "Exported:".

- [ ] **Step 5: Commit**

```bash
git add src/features/student/screens src/features/parent/screens src/screens/LoginScreen.tsx
git commit -m "feat: show school logo + name on all tab screens, Login, and Profile"
```

---

## Task 7: Back-affordance audit on the 12 pushed screens

Every pushed/detail screen must render a working back chevron via `ScreenHeader`.

Screens to verify/fix:
- Student: `ScheduleScreen.tsx`, `HomeworkDetailScreen.tsx`, `SubjectDetailScreen.tsx`, `GradesScreen.tsx`, `ChatThreadScreen.tsx`, `AnnouncementsScreen.tsx`
- Parent: `ParentAttendanceScreen.tsx`, `ParentPTMScreen.tsx`, `ParentTransportScreen.tsx`, `ParentLeaveScreen.tsx`, `ParentAnnouncementsScreen.tsx`, `ParentChatThreadScreen.tsx`

- [ ] **Step 1: Find which pushed screens are missing `onBack`**

Run: `npx grep -rn "ScreenHeader" src/features` (or use the editor's search). For each of the 12 screens above, confirm its `<ScreenHeader ... />` includes `onBack={() => nav.goBack()}`.

- [ ] **Step 2: Add `onBack` where missing**

For any screen missing it, ensure these exist near the top of the component:

```tsx
import { useNavigation } from '@react-navigation/native';
// ...
const nav = useNavigation();
```

and add the prop to its header:

```tsx
<ScreenHeader /* ...existing props... */ onBack={() => nav.goBack()} />
```

If `nav` is typed elsewhere in the file, reuse the existing typed instance instead of adding a second one.

- [ ] **Step 3: Verify compile + bundle**

Run: `npx tsc --noEmit`
Expected: only the 1 known pre-existing `App.tsx` error.
Run: `npx expo export --platform web --output-dir ._tmp` then delete `._tmp`.
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/features
git commit -m "fix: ensure every pushed screen has a working back button"
```

---

## Task 8: All-pages-work verification pass

No code unless a defect is found. Confirm every page renders with mock data and the new header behaves correctly.

- [ ] **Step 1: Launch the app**

Run: `npm run web`

- [ ] **Step 2: Walk the student flow**

Log in as **student**. Visit all 5 tabs (Home, Homework, Subjects, Inbox, Profile) and push into every detail screen (Schedule, Homework detail, Subject detail, Grades, Chat thread, Announcements). For each: confirm it renders mock data, no error/blank state, the **logo + name show on tab screens**, and a **working back chevron on every pushed screen**. Exercise writes (set/submit homework, send a message).

- [ ] **Step 3: Walk the parent flow**

Log out, log in as **parent**. Visit all 5 tabs (Home, Progress, Fees, Inbox, Profile) + the child switcher, and push into every detail (Attendance, PTM, Transport, Leave, Announcements, Chat thread). Confirm branding on tabs, back on detail screens, and exercise writes (pay fee, set PTM status, submit leave, send message).

- [ ] **Step 4: Confirm logo fallback**

Temporarily set `logoUrl: ''` in `src/services/mock/fixtures/school.ts`, reload, confirm the **monogram "W"/"WA"** shows instead of a broken image, then revert the change.

- [ ] **Step 5: Record results**

If any screen is broken, fix it (smallest change), re-run the relevant gate, and commit with a `fix:` message. If all pass, no commit needed for this task.

---

## Task 9: Document the School domain + final gates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add a README note**

Add a short subsection to the data-layer / API-swap section of `README.md`:

```markdown
### School branding (logo + name)

The current school's identity is a normal data domain: `useSchool()` → `SchoolService.getCurrent()` returns `{ id, name, shortName?, logoUrl }`. In mock mode it comes from `src/services/mock/fixtures/school.ts`; to use a real backend, implement `services/http/school.http.ts` (e.g. `apiFetch<School>('/school')`) and flip the `DATA_SOURCE` flag — no screen changes. The tenant is resolved **server-side from the auth token**, so the app never sends a `schoolId`. Branding is **view-only**: the school admin sets the logo and name via the backend; the app only displays them through `<SchoolBadge />`.
```

- [ ] **Step 2: Run the full gate set**

Run: `npx tsc --noEmit` → only the 1 known pre-existing error.
Run: `npx jest` → all green.
Run: `npm run lint` → 0 errors.
Run: `npx expo export --platform web --output-dir ._tmp` → exit 0; delete `._tmp`.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: document the School branding domain and its API swap"
```

---

## Self-Review Notes (coverage vs. spec)

- Spec §A (School domain): Tasks 1–2. §B (SchoolBadge): Tasks 3–4. §C (unified header): Tasks 5–6. §D (back audit): Task 7. §E (all-pages-work): Task 8. §F (docs): Task 9.
- Non-goals respected: no per-school theme colors, no in-app branding editor, no `tenantId`-on-every-entity refactor.
- Type consistency: `School { id, name, shortName?, logoUrl }`, `SchoolService.getCurrent()`, `qk.school`, `useSchool()`, `schoolMock()`, `SchoolBadge`, `monogramFromName()` are used identically across all tasks.
