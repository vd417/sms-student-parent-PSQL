# Parent Push Notifications — App Integration (Increment #3) — Design

**Date:** 2026-10-01
**Status:** Design (awaiting approval before implementation plan)
**Repo:** `sms-student-parent-app` (Expo SDK 54, RN 0.81, React 19, React Navigation 7).
**Backend dependency:** Increments #1–#2 (done, pushed on `origin/feat/sms-api-e2e-impl`): `POST /v1/me/devices` registration + best-effort Expo push fired from `BusParentAlertService` with `data: { kind, trip_id }`.

## 1. Goal

Deliver the parent-facing half of the bus push-notification feature: the app registers its Expo push token with the backend after login, displays pushes when they arrive, and — when the parent taps a bus push — deep-links to the bus-tracking (`Transport`) screen. Backend increments already create the in-app notices and fire the device push; this increment makes the device actually receive and act on them.

## 2. Scope

**In scope**
- Add `expo-notifications` dependency + `app.json` config plugin; create an Android notification channel at runtime.
- Request OS notification permission and obtain the Expo push token (auto, right after a successful login).
- Register the token with the backend via a new `POST /v1/me/devices` service call (idempotent upsert; snake_case body `{ expo_push_token, platform }`).
- A foreground notification handler (show banner/list/sound).
- A tap (notification-response) handler that classifies the payload and navigates to the bus screen via the existing `navigationRef` + `goToNotice`.
- Cold-start handling (app launched from killed state by tapping a push).
- Jest unit tests following repo conventions.

**Out of scope (deferred / future)**
- `DELETE /v1/me/devices` and server-side unregister on logout (backend endpoint was deferred in Increment #2; see §8 known limitation). This increment clears **local** push state only on logout.
- A "bus alerts" toggle on the existing `NotificationSettings` screen (pushes send unconditionally this increment, matching the backend).
- `student_id`/stop/route deep-link targeting — the push payload only carries `{ kind, trip_id }`, so a tap lands on `Transport` and the child is chosen via the screen's existing in-screen switcher.
- A `NavigationContainer` `linking` config / URL scheme routing (we navigate imperatively).
- Receipt polling, token pruning, staff/teacher push, `web` push (web is skipped — no Expo push token).

## 3. Verified codebase facts this design is built on

Confirmed by reading the repo (2026-10-01):

- **No `expo-notifications`, no deep-linking, no i18n** exist yet — greenfield. `scheme: "schooldesk-student"` is set in `app.json` but unused.
- **`navigationRef`** `src/navigation/navigationRef.ts:4` — `createNavigationContainerRef<RootStackParamList>()`, already wired on `<NavigationContainer ref={navigationRef}>` (`RootNavigator.tsx:18`). Usable for imperative navigation from outside components.
- **Notice→route router** `src/lib/noticeRoute.ts`: `noticeKind(...)` classifies, `noticeDestination(kind, audience)` maps `bus → { stack: 'Transport' }`, and `goToNotice(nav, kind, audience)` performs the navigation. **Reused directly** for push taps.
- **`Transport` route** exists in both `ParentStackParamList` and `RootStackParamList` (student), takes **no params**, rendered by `ParentTransportScreen` (the bus/live-map screen; child selected in-screen).
- **Mount point** `RootNavigator.tsx:19` renders `{authed ? <NoticeWatcher /> : null}` inside the `NavigationContainer` — the `<PushNotifications/>` component mounts here the same way.
- **Auth lifecycle** `src/providers/AuthProvider.tsx`: `useAuth()` exposes `status: 'restoring' | 'unauthenticated' | 'authenticated'` (no `isAuthenticated` boolean — derive from `status`). `signIn` (L108–124) and `signOut` (L128–134) are the login/logout transitions. Token stored via `src/services/auth/tokenStore.ts` (expo-secure-store); `tenantId` persisted there, **not** sent in requests (server derives tenant/user from the token).
- **HTTP/service layering** (README rule: screens never call network directly → hook → service → `[mock | http]`): service interfaces `src/services/types.ts`; HTTP impls `src/services/http/index.ts` with verb helpers incl. `post = (path, body) => apiFetch(path, { method:'POST', body: JSON.stringify(body) })`; base URL `src/api/config.ts` `API_BASE_URL` ends in `/v1`; auth header injected in `src/api/client.ts:76`. Mock set selected in `src/services/index.ts`.
- **Config** `app.json` `expo.extra.eas.projectId = "834d3f50-6b19-4ed3-8b6a-050fae93c858"` — the projectId `getExpoPushTokenAsync` needs. Available at runtime via `Constants.expoConfig?.extra?.eas?.projectId`.
- **Testing** `jest-expo` preset; `jest.setup.js` mocks native modules (`@react-native-async-storage/async-storage`, `@react-native-community/netinfo`); `__mocks__/react-native-webview.js` is the manual-mock convention for native-only modules; services tested via `jest.spyOn(client, 'apiFetch')` (`src/services/http/__tests__/httpServices.test.ts`); pure logic lives in `src/lib/**` + `src/services/**` and is unit-tested; providers/components are thin.

## 4. Components

### 4.1 Dependency & config
- Add `expo-notifications` (version resolved by `npx expo install` to match SDK 54).
- `app.json` `plugins`: add `"expo-notifications"` (optionally with a notification icon/color later; not required to function).
- Android channel created at runtime in registration (`Notifications.setNotificationChannelAsync('default', …)`).

### 4.2 Pure logic — `src/lib/push.ts` (no React, unit-tested)
- `pushPlatform(): 'ios' | 'android' | null` — from `Platform.OS`; `null` on web (and anything non-ios/android) so callers skip registration.
- `pushDestinationKind(data: unknown): NoticeKind` — maps a push `data` payload to the `noticeKind` taxonomy consumed by `goToNotice`. These pushes are bus alerts, so it returns `'bus'`; defensive default `'bus'`. Isolated here so the mapping is testable without native modules. (Kept deliberately small; if future payloads carry other `kind`s, this is the single place to extend.)

### 4.3 Registration — `src/services/push/register.ts`
- `registerForPushNotificationsAsync(): Promise<{ token: string; platform: 'ios' | 'android' } | null>` — best-effort, never throws:
  - `platform = pushPlatform()`; if `null` → return `null` (web/unsupported).
  - On Android: `Notifications.setNotificationChannelAsync('default', { name: 'Default', importance: HIGH })`.
  - `getPermissionsAsync()`; if status is `undetermined` → `requestPermissionsAsync()`; if final status ≠ `granted` → return `null`.
  - `getExpoPushTokenAsync({ projectId })` (projectId from `Constants`); return `{ token: data, platform }`.
  - Any thrown error is caught and logged → return `null`.
- Exact `setNotificationHandler` return keys and the permissions/token API surface will be confirmed against the **Expo SDK 54 `expo-notifications` docs** during implementation (SDK 53+ replaced `shouldShowAlert` with `shouldShowBanner`/`shouldShowList`).

### 4.4 Service method
- `src/services/types.ts`: add
  ```ts
  devices: {
    register(input: { expoPushToken: string; platform: 'ios' | 'android' }): Promise<void>;
  };
  ```
- `src/services/http/index.ts`: `register: ({ expoPushToken, platform }) => post('/me/devices', { expo_push_token: expoPushToken, platform })` (returns `Promise<void>`; endpoint responds 200 with empty envelope).
- Mock impl (`src/services/mock/…`): resolve without side effects.

### 4.5 `<PushNotifications/>` component — `src/components/PushNotifications.tsx`
Mounted authed-only in `RootNavigator` beside `NoticeWatcher`. Renders `null`. Reads `role` from `useAuth()` to pass the correct `audience` to `goToNotice`. On mount:
- `Notifications.setNotificationHandler({ handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }) })`.
- Run `registerForPushNotificationsAsync()`; on a non-null result call `services.devices.register({ expoPushToken, platform })`. Idempotent (backend upserts), so re-running across remounts is safe; a `useRef` guards against duplicate in-flight runs within one mount.
- `const sub = Notifications.addNotificationResponseReceivedListener(resp => goToNotice(navigationRef, pushDestinationKind(resp.notification.request.content.data), audience))` where `audience` is derived from the current `role`.
- Cold start: `Notifications.getLastNotificationResponseAsync()` on mount → if present, route the same way.
- Cleanup: `sub.remove()` on unmount.
- Foreground *received* notifications need no extra action — the existing `NoticeWatcher` poller and `LiveProvider` already refresh the inbox/queries.

### 4.6 Logout
- `signOut` already clears the auth token and query cache; because `<PushNotifications/>` unmounts when `status` leaves `'authenticated'`, its listeners are removed. No server call (deferred — §8).

## 5. Data flow

```
login success (AuthProvider status → 'authenticated')
  → <PushNotifications/> mounts
    → registerForPushNotificationsAsync()  (permission + Expo token)
    → services.devices.register({ expoPushToken, platform })
      → POST /v1/me/devices { expo_push_token, platform }  (backend upsert)

bus alert fired by backend → Expo → device
  foreground: OS banner via notification handler (+ existing inbox refresh)
  tap (bg/fg/cold): response listener → pushDestinationKind(data) = 'bus'
      → goToNotice(navigationRef, 'bus', audience /* from role */) → navigate 'Transport'
```

## 6. Error handling
- Registration is best-effort: permission denied, web, or any thrown error → `null`, no POST, no crash. Mirrors the backend sender's never-throw contract.
- The `register` service call surfaces through the normal `apiFetch` path; a failure is caught/logged in the component and does not block app use (the parent still gets in-app notices).

## 7. Testing plan (TDD — write failing tests first)
- Add an `expo-notifications` mock to `jest.setup.js` (mirror the netinfo/webview mocks): stub `setNotificationHandler`, `setNotificationChannelAsync`, `getPermissionsAsync`, `requestPermissionsAsync`, `getExpoPushTokenAsync`, `addNotificationResponseReceivedListener` (returns `{ remove }`), `getLastNotificationResponseAsync`, and `AndroidImportance`.
- `src/lib/__tests__/push.test.ts`: `pushDestinationKind` returns `'bus'` for bus/`trip_id` payloads and for unknown/empty data (default); `pushPlatform` resolves ios/android and `null` on web.
- `src/services/push/__tests__/register.test.ts`: permission denied → returns `null`, `getExpoPushTokenAsync` not called; granted → returns `{ token, platform }`; a thrown expo call → returns `null` (never throws).
- `src/services/http/__tests__/…`: `devices.register` POSTs `/me/devices` with body `{ expo_push_token, platform }` via a `jest.spyOn(client, 'apiFetch')` assertion (mirror `httpServices.test.ts`).
- Tap-routing test: a response with bus `data` drives `goToNotice`/`navigationRef` to `Transport` (mock the ref/`goToNotice`).
- Gate: `npm test` + `npm run lint` + `tsc` green. Real on-device delivery is manual/Increment #4.

## 8. Known limitation (accepted)
Logout clears only local state; the backend `ParentDevices` row persists (no `DELETE /v1/me/devices` yet), so a signed-out device can still receive pushes until the token re-registers under a different user (the backend upsert re-homes the token on the next login). Closing this needs the deferred backend `DELETE` endpoint + an app call on `signOut`.

## 9. Resolved decisions (2026-10-01)
1. **Permission UX** — auto-request permission and register the token right after a successful login (bus alerts are a safety feature; default-on).
2. **Logout** — defer server-side unregister; clear local state only this increment.
3. **Deep-link target** — `Transport` screen (child via in-screen switcher); payload carries no `student_id` this increment.

## 10. Sub-increment order (for the implementation plan)
1. Dependency + `app.json` plugin + `expo-notifications` jest mock.
2. `src/lib/push.ts` (`pushPlatform`, `pushDestinationKind`) + unit tests.
3. `src/services/push/register.ts` + unit tests.
4. `devices.register` service (types + http + mock) + service test.
5. `<PushNotifications/>` component (handler + registration call + tap/cold-start routing) + routing test; mount in `RootNavigator`.
6. Full `npm test` + `lint` + `tsc`; no commit/push/deploy without approval.
