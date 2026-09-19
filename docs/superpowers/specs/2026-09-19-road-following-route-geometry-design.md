# Road-Following Route Geometry — sms-student (Parent) Design

Status: Approved (pending final pre-implementation sign-off)
Repo: sms-student
Depends on: `sms-backend` spec
`docs/superpowers/specs/2026-09-19-road-following-route-geometry-design.md`
(canonical `GET /v1/transport/routes/{routeId}/geometry` contract, gated by
the per-route `CanViewRouteAsync` check).

## 1. Objective

Replace the straight-line route polyline in the parent-facing bus map
(both native `react-native-maps` and the web `Leaflet`-in-WebView variant)
with road-following geometry, without touching child-authorization, live
tracking, or existing ETA behavior.

## 2. Existing architecture (from audit)

- `src/features/parent/screens/transport/BusMap.native.tsx` — native map
  using `react-native-maps`.
- `src/features/parent/screens/transport/busMapHtml.ts` — generates an
  HTML string injected into a `WebView`, using Leaflet
  (`L.polyline`, `L.circleMarker`) for the web target.
- `src/features/parent/screens/transport/BusMap.types.ts` — shared props
  (`BusMapProps`, `BusMapStop`).
- Straight-line construction, native:
  ```js
  const routeCoords = stops.map((s) => ({ latitude: s.lat, longitude: s.lng }))
  {routeCoords.length > 1 ? <Polyline coordinates={routeCoords} strokeColor={colors.primary} strokeWidth={4} /> : null}
  ```
  Same pattern (via `L.polyline(path, ...)`) in `busMapHtml.ts` for the
  web/Leaflet path.
- Live GPS: SignalR (`src/hooks/useTransportFleet.ts`,
  `useTransportFleetPush`), `JoinMyChildrenBuses` with per-bus `JoinBus`
  fallback, listens for `position_update` and lifecycle events
  (`trip_started`, `trip_ended`, `status_changed`, `stop_arrived`,
  `stop_completed`, `school_arrived`), merges via `applyBusPositionPush` /
  `parseBusPositionPush` (`src/lib/busTracking.ts`). **Not touched.**
- `BusMapStop = { id, name, lat, lng, yours?, passed? }` — no `geometry`
  field today; `Transport` model in `src/models/index.ts`.

## 3. Exact files/components involved

New:
- `src/data/http/routeGeometry.repo.ts` (or wherever this app's HTTP repo
  layer conventionally lives — mirror the existing bus/transport repo file
  location) — client for the geometry endpoint.
- `src/lib/decodePolyline.ts` — Google encoded-polyline decoder (own copy,
  same algorithm as the other repos).
- A hook (e.g. `src/features/parent/screens/transport/useRouteGeometry.ts`)
  wrapping the above with React Query, keyed by `routeId`, fetched once.

Modified:
- `BusMap.native.tsx` — replace `routeCoords` construction: draw the
  decoded road polyline when available, no route line plus an
  "unavailable" indicator otherwise; stop `circleMarker`/marker rendering,
  live bus marker, and "yours"/"passed" stop styling stay untouched.
- `busMapHtml.ts` — same substitution inside the generated Leaflet
  HTML/JS: pass the decoded path array (or raw encoded string decoded on
  the RN side before injection) into `L.polyline(...)` instead of the raw
  stop list; when unavailable, skip drawing `routeLine` entirely.
- `BusMap.types.ts` — extend `BusMapProps` with an optional
  `routeGeometry: { status, path }` field.
- The parent transport screen that renders `BusMap` — call
  `useRouteGeometry(routeId)` and pass it through.

## 4. API contract (consumed, not defined here)

**Confirmed final wire format** (verified against the shipped backend, not
assumed): the raw HTTP response is snake_case, wrapped in this backend's
standard envelope — `{ "data": { "route_id": "...", "status": "available",
"distance_meters": 4210, ... } }`. Whatever this app's shared HTTP client
does with that envelope (some wrappers already unwrap one `data` level,
some return the raw body) determines whether the code reads
`res.data.route_id` or `res.data.data.route_id` — Task 1, Step 1 of the
implementation plan requires reading the existing route/stop-fetching
code's unwrapping convention first rather than guessing.

## 5. Data model / migration

None.

## 6. Authentication / authorization

Uses the existing parent auth token. The backend's `CanViewRouteAsync`
check (extending the same authorization path already used by
`JoinMyChildrenBuses`/child-to-bus assignment) ensures a parent only ever
receives geometry for a route their child is actually assigned to. No new
authorization logic added in this app.

## 7. Error handling

`status: 'unavailable'` or fetch failure → no route line, "Route
unavailable" state shown, live bus marker/status/speed/ETA and multi-child
switching keep working exactly as today. Existing straight-line
construction may remain as inert code but is never used as a silent
fallback.

## 8. Caching / performance

Fetched once per `routeId` via React Query; the SignalR lifecycle events
(`position_update`, `trip_started`, etc.) continue invalidating only the
transport/position query, never this geometry query.

## 9. Testing

- Unit test for `decodePolyline.ts`.
- Test for `BusMap.native.tsx` covering `available`/`unavailable` geometry
  states, confirming "yours"/"passed" stop markers and the live bus marker
  are unaffected.
- If `busMapHtml.ts` has existing snapshot/string tests, extend them to
  cover the road-geometry vs. unavailable branches.
- Regression: existing parent transport tests continue passing unmodified.

## 10. Rollback / safety considerations

Additive only; reverting removes the new files and the prop/hook wiring
with no data impact.

## 11. Dependencies

Requires the `sms-backend` endpoint deployed (with the per-route
authorization extension); can be built against a mocked response first.

## 12. Non-goals

- Not touching multi-child switching, child-to-bus authorization, SignalR
  lifecycle handling, ETA, or any parent-app screen beyond the map's route
  line.
- Not creating a parent-specific routing calculation or API.
