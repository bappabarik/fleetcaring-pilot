# FleetCaring Pilot App — Architecture

Companion to the backend's `ARCHITECTURE.md` and the customer app already
built. This app is the third and final client. Reference: 20 CAFU pilot
app screens provided as the UX model, adapted for FleetCaring's domain
(car detailing, not fuel delivery) and matched against the real backend
contract already built and proven across steps 1-9 of the backend build.

## 1. Adaptations from the CAFU reference — read this before building

CAFU is a fuel-delivery company; FleetCaring is a car-detailing service.
Most of the reference transfers directly (shift/break lifecycle, order
flow, pre/post-check pattern, issue reasons) because the *operational
shape* is identical — a mobile pilot travels to a location, works on a
vehicle, documents before/after state. A few CAFU-specific pieces don't:

| CAFU reference | FleetCaring adaptation |
|---|---|
| "Spot fuel" quick-action button on empty home | Removed — no equivalent on-demand product |
| "Fuel details" account menu item | Removed |
| "HR Hub" (redirects to Zoho) | Removed — no HR backend exists |
| "Cafutron connection" setting | Removed — no equivalent hardware/IoT device |
| "Pilot performance" | Kept as a placeholder screen — no backend endpoint exists yet; flagged as a future gap, not built blind |
| Everything else (shift, break, order, checks, issues, settings language/nav-app) | Built as shown — these map directly onto real backend fields/endpoints already confirmed |

Two details from the reference are worth calling out because they matched
the real backend **exactly**, which is a good sign the reference is
trustworthy for the rest:
- The 9 issue reasons in "Raise an issue" are verbatim the backend's
  `issueReasonSchema` enum (`GATE_GARAGE_CLOSED`, `NUMBER_PLATE_NOT_MATCHING`,
  `UNABLE_TO_REACH_LOCATION`, `VEHICLE_NOT_AVAILABLE`,
  `VEHICLE_PARKED_UNSAFE_AREA`, `BY_CONTROL_CENTRE`,
  `ACCESS_DENIED_BY_SECURITY`, `VEHICLE_IN_PAID_PARKING`, `OTHER`)
- The Settings screen's Language (English/Arabic) and Navigation app
  (Google Maps/2GIS/Waze) options are exactly `Pilot.language` and
  `Pilot.preferredNavApp`, already built and tested (`PATCH /pilots/me`)

## 2. Tech stack — matches the customer app, not the admin panel

The admin panel used React/Vite/antd/Redux because it's a desktop ops
tool. This is a mobile app, so it follows the **customer app's** stack
for consistency across the two RN apps in this codebase:

| Concern | Choice |
|---|---|
| Framework | Expo (React Native), TypeScript |
| Styling | NativeWind v4 (Tailwind for RN) |
| Client state | Zustand |
| Server state / caching | TanStack Query |
| Navigation | React Navigation (native-stack + bottom-tabs) |
| Forms | React Hook Form |
| Realtime | Native WebSocket — same `/realtime/connect` contract already proven for the admin Live Map (`location_ping` message shape identical) |
| Offline queue | Custom (see §4) — `expo-sqlite` backed, per the backend architecture's own offline-sync design |
| Photo capture | `expo-image-picker` (camera + library) |
| Secure token storage | `expo-secure-store` (not AsyncStorage — refresh tokens are credentials) |

## 3. Screen inventory, mapped to backend endpoints already built

| Screen | Backend endpoint(s) | Status |
|---|---|---|
| Permission prompts (location, notifications) | — (device-level, no API) | New |
| Sign in — phone/OTP | `POST /auth/pilot/otp/request`, `/verify` (needs confirming — see §6) | Ask |
| Sign in — email/password | `POST /auth/pilot/login` (needs confirming) | Ask |
| Home — no shift / shift scheduled / on duty | `GET /shifts/me/dashboard` | Confirmed (built step 6) |
| Start shift | `POST /shifts/:id/start` | Confirmed |
| End shift | `POST /shifts/:id/end` | Confirmed |
| Break reason picker + countdown | `POST /shifts/:id/breaks`, `/breaks/:breakId/end` | Confirmed |
| Schedule (daily/weekly) | `GET /shifts/me/list` | Confirmed |
| Orders list ("my assigned work") | `GET /shipments/mine` | Confirmed (built, includes customer/address/vehicle/service nested) |
| Order detail | Derived from `/shipments/mine` item + needs an order-level detail call — see §6 | Ask |
| Enroute | `POST /orders/:id/enroute` | Confirmed |
| Confirm arrival | `POST /orders/:id/confirm-arrival` | Confirmed |
| Contact customer | Uses phone number already present in the shipment payload — no new endpoint | — |
| Pre-check submission | `POST /shipments/:id/pre-check` | Confirmed |
| Post-check submission | `POST /shipments/:id/post-check` | Confirmed |
| Photo upload (used by both checks + issues) | `POST /uploads/presign` | Confirmed (built step "File upload endpoint") |
| Raise an issue | `POST /orders/:id/issues` | Confirmed |
| Complete order | `POST /orders/:id/complete` | Confirmed |
| Settings — language/nav app | `PATCH /pilots/me` | Confirmed |
| Settings — view profile | `GET /pilots/me` | Confirmed |
| Device push token registration | `POST /devices/register` | Confirmed (built) |
| Live location ping | WS `location_ping` message | Confirmed (built, proven against the admin Live Map) |

Every "Confirmed" row was built and tested earlier in this same
conversation. Every "Ask" row needs the actual current route file pasted
before I write the corresponding screen — the admin panel build caught
real, sometimes serious bugs every single time an assumption from memory
was used instead of the real file, so auth is where I'll ask first.

## 4. Offline sync design (per the backend architecture's own spec)

Every mutating pilot action (shift start/end, break start/end, enroute,
confirm-arrival, pre/post-check, issue, complete) goes through one shared
queue rather than firing directly:

```
UI action → optimistic local state update → enqueue({ id: uuid(), endpoint, method, body, createdAt })
                                                     │
                                    background drain loop (FIFO, one at a time)
                                                     │
                                     attach `Idempotency-Key: <queue item id>`
                                                     │
                                    success → dequeue · failure (network) → retry later
                                    failure (4xx business logic) → surface as a sync error, don't auto-retry
```

- Queue persisted in `expo-sqlite`, survives app restarts
- Every mutating call already built on the backend requires (or should
  require) the `Idempotency-Key` header per the idempotency middleware
  built early in the backend — the pilot app is the actual reason that
  middleware exists
- Photos: saved to local filesystem immediately on capture; the actual
  R2 upload (via presigned URL) is queued as its own decoupled sub-task,
  so a check submission isn't blocked on a slow upload over a weak signal
- Connectivity watched via `@react-native-community/netinfo`; queue drains
  automatically on reconnect and periodically while online

This is its own build pass (§5, step 9) — built *after* the core screens
exist and call these endpoints directly, then retrofitted underneath
them, matching the backend architecture's own stated order.

## 5. Build order

1. Project scaffold + design tokens + navigation shell
2. Auth (phone/OTP + email/password, permission prompts, secure token storage) — **needs backend confirmation first**
3. Home dashboard (shift states) + Start/End shift
4. Break flow (reason picker + countdown)
5. Schedule tab
6. Orders list + Order detail + Enroute + Confirm arrival + Contact customer
7. Shipment detail + Pre-check/Post-check (photo capture + upload)
8. Raise an issue + Complete order
9. Offline sync layer retrofitted under steps 3-8's mutating actions
10. Settings/Account + live location ping (WS)

## 6. What I need before starting Step 2 (Auth)

Please paste the current `auth.routes.ts` (at minimum the pilot-related
routes) and `auth.schemas.ts`. This module was built very early in this
conversation, before several context compactions — I'd rather confirm the
exact current request/response shapes (especially whether pilot OTP uses
the same `request`/`verify` pattern as the customer flow, and the exact
field names on the login response) than build against a possibly-stale
memory of it.
