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
