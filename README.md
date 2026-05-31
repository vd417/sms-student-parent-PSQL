# School Desk · Student

Expo / React Native implementation of the **School Desk — Student App** design.

## Stack

- Expo SDK 54 · React Native 0.81 · React 19 · TypeScript 5.9
- React Navigation 7 (native-stack + bottom-tabs)
- React Native Paper, react-native-svg, expo-linear-gradient
- Plus Jakarta Sans (via `@expo-google-fonts/plus-jakarta-sans`)
- react-hook-form + zod (Login validation)

## Project layout

```
src/
├─ theme/                  colors, typography, spacing, radius, shadow
├─ data/sample.ts          ported sample data (student, subjects, today, homework, ...)
├─ components/
│  ├─ ui/                  design system: Avatar, Button, Card, Donut,
│  │                       IconButton, Pill, ScreenHeader, SearchField,
│  │                       SectionHeader, TabBar, Toast
│  └─ cards/               SubjectCard, HomeworkCard
├─ navigation/             Root stack + bottom tab navigator
└─ screens/                12 screens (Login, Home, Schedule, Profile,
                           Homework list/detail, Subjects, Subject detail,
                           Grades, Inbox, ChatThread, Announcements)
```

## Run

```bash
npm install
npm run ios        # or: android / web
```

## Theme

Iceberg palette per the design source (`primary: #0C4A6E`). Subject accents use the
"vivid" set (coral / blue / teal / pink / amber / mint), each with `base / soft / tint`
variants — see `src/theme/colors.ts`.

## Navigation

- Stack root: `Login` → `Main` (tabs) → modal-style detail screens.
- Tabs: `Home`, `Homework`, `Subjects`, `Inbox`, `Profile`.
- Detail destinations off the stack: `Schedule`, `HomeworkDetail`, `SubjectDetail`,
  `Grades`, `ChatThread`, `Announcements`.

## Data layer & API swap

Screens never call the network directly. The flow is:

```
Screen → React Query hook → Service interface → [ Mock impl | HTTP impl ]
```

Hooks live in `src/hooks/`, service interfaces in `src/services/types.ts`, and the
registry in `src/services/index.ts` picks the implementation from the `DATA_SOURCE`
flag (`app.json` → `expo.extra.dataSource`, default `'mock'`). To move a domain to a
real backend: implement its methods in `src/services/http/*.http.ts` using
`src/api/client.ts`, then set `dataSource: 'http'` (and `apiBaseUrl`). No screen or
hook changes needed — the mock impl stays as an offline/test backend.

### School branding (logo + name)

The current school's identity is a normal data domain: `useSchool()` →
`SchoolService.getCurrent()` returns `{ id, name, shortName?, logoUrl }`. In mock mode
it comes from `src/services/mock/fixtures/school.ts`; for a real backend, implement
`src/services/http/school.http.ts` (e.g. `apiFetch<School>('/school')`) and flip the
`DATA_SOURCE` flag. The tenant is resolved **server-side from the auth token**, so the
app never sends a `schoolId`. Branding is **view-only**: the school admin sets the logo
and name via the backend; the app only displays them through `<SchoolBadge />` (shown on
the top-level tab screens, Login, and Profile, with a monogram fallback when no logo is
available).
