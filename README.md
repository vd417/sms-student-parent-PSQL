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

## Run on a phone against the local API (Postgres sms-api)

1. Start the API on the dev PC from the sms-api repo: `dotnet run --project src/Sms.Api`. On this machine it listens on port **5262** (set by the local user-secret `Kestrel:Endpoints:Http:Url`; without that secret the default is 5162). Check: `http://localhost:<port>/health` returns `{"status":"ok"}`.

2. Find the PC's Wi-Fi IP (`ipconfig`, the Wi-Fi adapter's IPv4 address). It changes between networks, so don't hard-code it.

3. From the phone's browser open `http://<ip>:<port>/health`. If it doesn't load, allow inbound TCP on that port in Windows Defender Firewall (private network).

4. Start Expo pointed at it: PowerShell `$env:EXPO_PUBLIC_API_BASE_URL="http://<ip>:<port>/v1"; npx expo start` (bash: `EXPO_PUBLIC_API_BASE_URL=http://<ip>:<port>/v1 npx expo start`), then open in Expo Go on the same Wi-Fi.

5. Note: `eas.json`'s `preview` profile bakes in `http://192.168.0.103:5162/v1`; update it to the current `http://<ip>:<port>/v1` before an EAS preview build.

6. Live contract check: copy `scripts/contract-check/.env.example` to `.env`, fill in a student and a parent login and `API_BASE_URL`, then `npm run contract-check` (add `CONTRACT_WRITES=1` for the write probes). Results and triage are in `scripts/contract-check/FINDINGS.md`. Note: `CONTRACT_WRITES=1` marks every notification of both test accounts as read, and this can't be undone.

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
flag (`app.json` → `expo.extra.dataSource`, default `'http'` — live API). To switch to
mock data for offline dev: implement its methods in `src/services/mock/*.mock.ts` and
set `dataSource: 'mock'` in `app.json`. To move a domain to a real backend: implement
its methods in `src/services/http/*.http.ts` using `src/api/client.ts`. No screen or
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
