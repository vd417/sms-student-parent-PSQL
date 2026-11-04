# Parent Push Notifications — App Integration (Increment #3) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the parent app register its Expo push token after login and deep-link to the bus screen when a bus push is tapped, so the backend's bus alerts reach the device.

**Architecture:** A pure mapping module (`src/lib/push.ts`) and a best-effort registration module (`src/services/push/register.ts`) do the native work; a new `devices.register` service follows the app's Screen→hook→service→[mock|http] rule to POST the token to `/v1/me/devices`; a thin authed-only `<PushNotifications/>` component (mounted beside `NoticeWatcher` in `RootNavigator`) wires the notification handler, runs registration on login, and routes taps via the existing `navigationRef` + `goToNotice`.

**Tech Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript 5.9, React Navigation 7, `expo-notifications`, `expo-constants`, Jest 29 (`jest-expo`), `@testing-library/react-native`.

**Spec:** `docs/superpowers/specs/2026-10-01-parent-push-notifications-app-design.md`

## Global Constraints

- Work **only** in `sms-student-parent-app`. The backend half (Increments #1–#2) is already done and pushed on `origin/feat/sms-api-e2e-impl` — do not touch the API repos here.
- **Do not push or deploy.** Per-task local commits are fine (repo convention); hold if the user says otherwise.
- Follow the repo rule: **screens never call the network directly** — go through a service (`src/services/types.ts` + `http` + `mock`). Push registration logic lives in `src/lib/**` / `src/services/**`, not in components.
- JSON over the wire is **snake_case**; the device body is exactly `{ expo_push_token, platform }`. `platform` is `'ios' | 'android'` only (web is skipped client-side).
- `expo-notifications` is added via `npx expo install` so the version matches **Expo SDK 54**. Confirm the `setNotificationHandler` return keys and the permissions/token API against the **Expo SDK 54 `expo-notifications` docs** (SDK 53+ uses `shouldShowBanner`/`shouldShowList`, not `shouldShowAlert`).
- Registration is **best-effort and never throws** (mirrors the backend `ExpoPushSender`): web, denied permission, missing projectId, or any thrown native call → return `null`, send nothing, never crash.
- `projectId` for `getExpoPushTokenAsync` comes from `Constants.expoConfig?.extra?.eas?.projectId` (already set in `app.json`: `834d3f50-6b19-4ed3-8b6a-050fae93c858`).

## Review Focus

- **Permission denied / undetermined-then-denied:** registration must return `null` and make no POST, no crash — pinned in Task 3.
- **Web / unsupported platform:** `pushPlatform()` returns `null` → registration skips entirely — pinned in Task 2 and Task 3.
- **`getExpoPushTokenAsync` throws** (no FCM creds in dev, offline, Expo Go quirks): must be swallowed → `null` — pinned in Task 3.
- **Tap before the navigator is ready** (cold start routes before `NavigationContainer` mounts): the response handler must guard on `navigationRef.isReady()` and no-op otherwise — pinned in Task 5.
- **Malformed/empty push `data` payload:** `pushDestinationKind` must still yield a valid `NoticeKind` (`'bus'`) — pinned in Task 2.

---

### Task 1: Add `expo-notifications` dependency, config plugin, and jest mock

**Files:**
- Modify: `package.json` (dependency added by `expo install`)
- Modify: `app.json` (plugins)
- Modify: `jest.setup.js`

**Interfaces:**
- Consumes: nothing.
- Produces: the `expo-notifications` module available to app + tests; a global jest mock of it (granted/no-op defaults) that later tasks override per-case.

- [ ] **Step 1: Install the dependency**

Run: `npx expo install expo-notifications`
Expected: `expo-notifications` added to `package.json` `dependencies` at the SDK-54-matched version; `package-lock.json` updated.

- [ ] **Step 2: Register the config plugin**

In `app.json`, add `"expo-notifications"` to the `expo.plugins` array (append after `"expo-secure-store"`):
```json
    "plugins": [
      "expo-font",
      "expo-secure-store",
      "expo-notifications",
      [
        "expo-image-picker",
        {
          "photosPermission": "Let School Desk access your photos so you can share an image in chat."
        }
      ],
      [
        "expo-build-properties",
        {
          "android": {
            "usesCleartextTraffic": true
          }
        }
      ]
    ],
```

- [ ] **Step 3: Add the jest mock**

Append to `jest.setup.js`:
```js
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test]' })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  AndroidImportance: { DEFAULT: 3, HIGH: 4 },
}));
```

- [ ] **Step 4: Verify the suite still runs green with the mock present**

Run: `npm test`
Expected: PASS — the existing suite is unaffected by the new (unused-yet) mock.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app.json jest.setup.js
git commit -m "chore(push): add expo-notifications dependency, config plugin, and jest mock"
```

---

### Task 2: Pure logic — `src/lib/push.ts`

**Files:**
- Create: `src/lib/push.ts`
- Test: `src/lib/__tests__/push.test.ts`

**Interfaces:**
- Consumes: `Platform` from `react-native`; `NoticeKind` from `@/lib/noticeRoute`.
- Produces:
  - `pushPlatform(): 'ios' | 'android' | null`
  - `pushDestinationKind(data: unknown): NoticeKind`

- [ ] **Step 1: Write the failing test**

`src/lib/__tests__/push.test.ts`:
```ts
import { Platform } from 'react-native';
import { pushDestinationKind, pushPlatform } from '@/lib/push';

describe('pushPlatform', () => {
  it('returns the OS for ios and android', () => {
    const r = pushPlatform();
    expect(['ios', 'android']).toContain(r);
  });

  it('returns null on web', () => {
    const spy = jest.replaceProperty(Platform, 'OS', 'web' as typeof Platform.OS);
    expect(pushPlatform()).toBeNull();
    spy.restore();
  });
});

describe('pushDestinationKind', () => {
  it('maps a bus alert payload to bus', () => {
    expect(pushDestinationKind({ kind: 'approaching', trip_id: 't1' })).toBe('bus');
    expect(pushDestinationKind({ kind: 'trip_started', trip_id: 't1' })).toBe('bus');
  });

  it('defaults unknown or empty payloads to bus', () => {
    expect(pushDestinationKind(undefined)).toBe('bus');
    expect(pushDestinationKind(null)).toBe('bus');
    expect(pushDestinationKind({})).toBe('bus');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- push.test`
Expected: FAIL — `@/lib/push` does not exist.

- [ ] **Step 3: Write the implementation**

`src/lib/push.ts`:
```ts
import { Platform } from 'react-native';
import type { NoticeKind } from '@/lib/noticeRoute';

/** The device platform for push registration, or null when push is unsupported (web). */
export function pushPlatform(): 'ios' | 'android' | null {
  return Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : null;
}

/**
 * Maps a device-push `data` payload to the in-app notice taxonomy used by `goToNotice`.
 * Every backend device push this increment is a bus alert (`data: { kind, trip_id }`),
 * so this is the single place to branch if future pushes carry other kinds.
 */
export function pushDestinationKind(_data: unknown): NoticeKind {
  return 'bus';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- push.test`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/push.ts src/lib/__tests__/push.test.ts
git commit -m "feat(push): pure platform + payload-kind helpers"
```

---

### Task 3: Registration — `src/services/push/register.ts`

**Files:**
- Create: `src/services/push/register.ts`
- Test: `src/services/push/__tests__/register.test.ts`

**Interfaces:**
- Consumes: `expo-notifications` (`setNotificationChannelAsync`, `getPermissionsAsync`, `requestPermissionsAsync`, `getExpoPushTokenAsync`, `AndroidImportance`); `Constants` from `expo-constants`; `Platform` from `react-native`; `pushPlatform` from `@/lib/push`.
- Produces: `registerForPushNotificationsAsync(): Promise<{ token: string; platform: 'ios' | 'android' } | null>` and the exported type `DeviceRegistration = { token: string; platform: 'ios' | 'android' }`.

- [ ] **Step 1: Write the failing test**

`src/services/push/__tests__/register.test.ts`:
```ts
import * as Notifications from 'expo-notifications';
import { registerForPushNotificationsAsync } from '@/services/push/register';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
}));

describe('registerForPushNotificationsAsync', () => {
  afterEach(() => jest.clearAllMocks());

  it('returns token + platform when permission is granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValueOnce({ data: 'ExponentPushToken[abc]' });

    const reg = await registerForPushNotificationsAsync();

    expect(reg).toEqual({ token: 'ExponentPushToken[abc]', platform: expect.stringMatching(/^(ios|android)$/) });
  });

  it('returns null and does not fetch a token when permission is denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'denied' });

    const reg = await registerForPushNotificationsAsync();

    expect(reg).toBeNull();
    expect(Notifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
  });

  it('never throws when a native call fails', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(new Error('no FCM creds'));

    await expect(registerForPushNotificationsAsync()).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- register.test`
Expected: FAIL — `@/services/push/register` does not exist.

- [ ] **Step 3: Write the implementation**

`src/services/push/register.ts`:
```ts
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { pushPlatform } from '@/lib/push';

export type DeviceRegistration = { token: string; platform: 'ios' | 'android' };

/**
 * Best-effort: requests notification permission and returns the Expo push token.
 * Returns null (never throws) on web, denied permission, missing projectId, or any
 * native failure — a push setup problem must never break app startup.
 */
export async function registerForPushNotificationsAsync(): Promise<DeviceRegistration | null> {
  const platform = pushPlatform();
  if (!platform) return null;

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }

    const current = await Notifications.getPermissionsAsync();
    let status = current.status;
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
    if (status !== 'granted') return null;

    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId) return null;

    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: data, platform };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- register.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/services/push/register.ts src/services/push/__tests__/register.test.ts
git commit -m "feat(push): best-effort Expo token registration"
```

---

### Task 4: `devices.register` service (types + http + mock)

**Files:**
- Modify: `src/services/types.ts` (add `DevicesService` + `devices` on `Services`)
- Modify: `src/services/http/index.ts` (add the `devices` block to `httpServices`)
- Create: `src/services/mock/devices.mock.ts`
- Modify: `src/services/index.ts` (wire the mock into `mockServices()`)
- Test: `src/services/http/__tests__/httpServices.test.ts` (add one case)

**Interfaces:**
- Consumes: the `post` helper in `src/services/http/index.ts` (`post<T>(path, body)` → `apiFetch`).
- Produces:
  - `interface DevicesService { register(input: { expoPushToken: string; platform: 'ios' | 'android' }): Promise<void> }`
  - `services.devices.register(...)` → `POST /me/devices { expo_push_token, platform }`.

- [ ] **Step 1: Write the failing test**

Add to `src/services/http/__tests__/httpServices.test.ts` inside the first `describe('httpServices', …)` block (beside the other POST cases):
```ts
  it('devices.register POSTs /me/devices with a snake_case body', async () => {
    const spy = jest.spyOn(client, 'apiFetch').mockResolvedValueOnce(undefined as any);
    await httpServices.devices.register({ expoPushToken: 'ExponentPushToken[x]', platform: 'ios' });
    expect(spy.mock.calls[0][0]).toBe('/me/devices');
    expect(JSON.parse(spy.mock.calls[0][1].body as string)).toEqual({
      expo_push_token: 'ExponentPushToken[x]',
      platform: 'ios',
    });
    spy.mockRestore();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- httpServices.test`
Expected: FAIL to compile/run — `httpServices.devices` does not exist (and `Services` has no `devices`).

- [ ] **Step 3: Add the service interface**

In `src/services/types.ts`, add the interface (e.g. after `NotificationsService`):
```ts
export interface DevicesService {
  /** Idempotent upsert of this device's Expo push token for the signed-in user. */
  register(input: { expoPushToken: string; platform: 'ios' | 'android' }): Promise<void>;
}
```
and add it to the `Services` interface (after `notifications: NotificationsService;`):
```ts
  devices: DevicesService;
```

- [ ] **Step 4: Add the HTTP implementation**

In `src/services/http/index.ts`, inside the `export const httpServices: Services = {` object (add before the final closing `};`):
```ts
  devices: {
    register: async ({ expoPushToken, platform }) => {
      await post('/me/devices', { expo_push_token: expoPushToken, platform });
    },
  },
```

- [ ] **Step 5: Add the mock implementation**

`src/services/mock/devices.mock.ts`:
```ts
import type { DevicesService } from '@/services/types';

export function devicesMock(): DevicesService {
  return {
    register: async () => undefined,
  };
}
```

- [ ] **Step 6: Wire the mock into the mock set**

In `src/services/index.ts`, import it (near the other mock imports):
```ts
import { devicesMock } from './mock/devices.mock';
```
and add it to the object returned by `mockServices()` (after `notifications: notificationsMock(),`):
```ts
    devices: devicesMock(),
```

- [ ] **Step 7: Run test to verify it passes**

Run: `npm test -- httpServices.test`
Expected: PASS (the new case plus all existing httpServices cases).

- [ ] **Step 8: Commit**

```bash
git add src/services/types.ts src/services/http/index.ts src/services/mock/devices.mock.ts src/services/index.ts src/services/http/__tests__/httpServices.test.ts
git commit -m "feat(push): devices.register service (POST /me/devices)"
```

---

### Task 5: `<PushNotifications/>` component + mount in `RootNavigator`

**Files:**
- Create: `src/components/PushNotifications.tsx`
- Test: `src/components/__tests__/pushNotifications.test.ts`
- Modify: `src/navigation/RootNavigator.tsx` (mount authed-only beside `NoticeWatcher`)

**Interfaces:**
- Consumes: `registerForPushNotificationsAsync` (Task 3); `services.devices.register` (Task 4); `pushDestinationKind` (Task 2); `goToNotice` + `NoticeAudience` from `@/lib/noticeRoute`; `navigationRef` from `@/navigation/navigationRef`; `useAuth` from `@/providers/AuthProvider`; `expo-notifications`.
- Produces: `PushNotifications` React component (renders `null`) and the exported helper `routeFromResponse(response, audience)` for unit testing.

- [ ] **Step 1: Write the failing test**

`src/components/__tests__/pushNotifications.test.ts`:
```ts
const navigate = jest.fn();
jest.mock('@/navigation/navigationRef', () => ({
  navigationRef: { isReady: jest.fn(() => true), navigate: (...a: unknown[]) => navigate(...a) },
}));

import { navigationRef } from '@/navigation/navigationRef';
import { routeFromResponse } from '@/components/PushNotifications';

function response(data: Record<string, unknown>) {
  return { notification: { request: { content: { data } } } } as any;
}

describe('routeFromResponse', () => {
  afterEach(() => jest.clearAllMocks());

  it('navigates a bus push to the Transport screen', () => {
    routeFromResponse(response({ kind: 'approaching', trip_id: 't1' }), 'parent');
    expect(navigate).toHaveBeenCalledWith('Transport');
  });

  it('does nothing when the response is null', () => {
    routeFromResponse(null, 'parent');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does nothing when navigation is not ready', () => {
    (navigationRef.isReady as jest.Mock).mockReturnValueOnce(false);
    routeFromResponse(response({ kind: 'approaching' }), 'parent');
    expect(navigate).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- pushNotifications.test`
Expected: FAIL — `@/components/PushNotifications` does not exist.

- [ ] **Step 3: Write the component**

`src/components/PushNotifications.tsx`:
```tsx
import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { navigationRef } from '@/navigation/navigationRef';
import { goToNotice, type NoticeAudience } from '@/lib/noticeRoute';
import { pushDestinationKind } from '@/lib/push';
import { registerForPushNotificationsAsync } from '@/services/push/register';
import { services } from '@/services';
import { useAuth } from '@/providers/AuthProvider';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

/** Routes a tapped notification to its screen. No-op until the navigator is ready. */
export function routeFromResponse(
  response: Notifications.NotificationResponse | null,
  audience: NoticeAudience,
): void {
  if (!response || !navigationRef.isReady()) return;
  const data = response.notification.request.content.data;
  goToNotice(navigationRef, pushDestinationKind(data), audience);
}

/** Authed-only: registers the device token on login and routes bus-push taps. Renders nothing. */
export function PushNotifications() {
  const { role } = useAuth();
  const audience: NoticeAudience = role === 'parent' ? 'parent' : 'student';
  const registered = useRef(false);

  useEffect(() => {
    if (!registered.current) {
      registered.current = true;
      registerForPushNotificationsAsync().then((reg) => {
        if (reg) {
          services.devices
            .register({ expoPushToken: reg.token, platform: reg.platform })
            .catch(() => {});
        }
      });
    }

    const sub = Notifications.addNotificationResponseReceivedListener((resp) =>
      routeFromResponse(resp, audience),
    );
    Notifications.getLastNotificationResponseAsync().then((resp) =>
      routeFromResponse(resp, audience),
    );
    return () => sub.remove();
  }, [audience]);

  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- pushNotifications.test`
Expected: PASS (3 tests).

- [ ] **Step 5: Mount the component in `RootNavigator`**

In `src/navigation/RootNavigator.tsx`, add the import beside the `NoticeWatcher` import:
```tsx
import { PushNotifications } from '@/components/PushNotifications';
```
and mount it authed-only, right after the `NoticeWatcher` line inside `<NavigationContainer>`:
```tsx
        {authed ? <NoticeWatcher /> : null}
        {authed ? <PushNotifications /> : null}
```

- [ ] **Step 6: Run the full suite + typecheck + lint**

Run: `npm test`
Run: `npx tsc --noEmit`
Run: `npm run lint`
Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/components/PushNotifications.tsx src/components/__tests__/pushNotifications.test.ts src/navigation/RootNavigator.tsx
git commit -m "feat(push): PushNotifications component — register on login, deep-link bus taps"
```

---

## Notes for the executor
- **Known limitation (by design):** logout clears local state only; the backend `ParentDevices` row persists (no `DELETE /v1/me/devices` yet), so a signed-out device can receive pushes until the token re-registers under a different user. Closing it needs the deferred backend `DELETE` endpoint + a `signOut` call — out of scope here.
- `setNotificationHandler` runs at module import. If a future test renders `<PushNotifications/>` (rather than calling `routeFromResponse` directly), the global `expo-notifications` jest mock already stubs it.
- Real on-device delivery (iOS APNs / Android FCM credentials in EAS) is verified manually / in Increment #4 — it cannot be exercised in Jest.
- If `jest.replaceProperty(Platform, 'OS', …)` is unavailable in this Jest version, fall back to `Object.defineProperty(Platform, 'OS', { value: 'web' })` with a restore in `afterEach`.
