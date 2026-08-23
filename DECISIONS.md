# Decision Log

Non-obvious calls made while executing the mobile production-readiness audit remediation
(August 2026, targeting App Store + Play Store submission).

Format: **what was decided**, what else was considered, why this one, what it touched.

---

## D-001 — Fix scope: all of P0 through P3

**Decision.** Fix every finding in the audit (4 release blockers, 5 store-compliance risks,
11 functional bugs, 7 polish items) rather than only the crash or only the blockers.

**Alternatives.** (a) P0 only — stop the crash, ~2 h. (b) P0 + P1 — blockers and store compliance
only, ~1 day.

**Why.** Ship date is next week. P2 items like "deleted vehicles reappear" and the unbounded
`GET /fbt` query are the kind of thing that generates support load on day one, and they are cheap to
fix now while the context is loaded. Deferring them means re-deriving all of this later under worse
time pressure.

**Confirmed by:** user, at plan time.

---

## D-002 — Backend changes are in scope

**Decision.** Edit `backend/` alongside `frontend/mobile/`.

**Alternatives.** Mobile-only, handing over a written spec for the server-side work.

**Why.** Three findings are server-side defects that cannot be fixed from the client at all:
account deletion (an App Store blocker with no endpoint behind it), `GET /vehicles` returning
soft-deleted rows, and `GET /fbt` having no pagination. A mobile-only pass would have left the
App Store blocker open.

**Confirmed by:** user, at plan time.

---

## D-003 — Build Sign in with Apple rather than hiding Google on iOS

**Decision.** Implement `expo-apple-authentication` plus a `POST /api/v1/auth/apple/token` backend
route, mirroring the existing mobile Google flow.

**Alternatives.** Gate the Google button behind `Platform.OS !== 'ios'` — a one-line change that
also satisfies Guideline 4.8, since the rule only binds when a third-party social login is offered.

**Why.** User chose the complete implementation over the fast workaround. Costs ~3–4 h and a
capability toggle in the Apple Developer portal, but iOS users keep a one-tap login path and the
requirement is settled permanently rather than deferred.

**Confirmed by:** user, at plan time.

**Touches.** `backend/src/db/schema/users.ts`, a new migration,
`backend/src/modules/auth/services/apple-verify.ts`, `backend/src/modules/auth/routes/apple.ts`,
`frontend/mobile/src/screens/auth/LoginScreen.js`, `frontend/mobile/src/stores/authStore.js`,
`frontend/mobile/app.config.js`.

---

## D-004 — Code against a production socket endpoint that does not exist yet

**Decision.** Wire the mobile client, `.env`, and `eas.json` for
`wss://socket.clarity-software.com.au`, and document the nginx config needed in front of the
`ingestion` process on `SOCKET_PORT=3001`. The user stands the endpoint up separately.

**Alternatives.** (a) Wait for a real hostname before touching anything. (b) Drop the socket on
mobile entirely for v1 and poll on a 30 s interval.

**Why.** Realtime is currently 100% broken on mobile — `EXPO_PUBLIC_SOCKET_URL` was never defined,
so every build fell back to `http://localhost:3001`. The client work is independent of the hostname,
so it can land now and only the DNS/TLS step blocks. Polling is being added regardless (see D-008)
as a degradation path, which de-risks the dependency.

**Confirmed by:** user, at plan time.

---

## D-005 — Coerce `numeric` columns on the client, not by changing Postgres type parsing

**Decision.** Added `frontend/mobile/src/lib/format.js` with `num()` / `formatKm()` /
`formatVolts()` / `formatNumber()` / `formatDuration()` and applied them at every render site that
touches a `numeric` column.

**Alternatives.** A single line server-side — `pg.types.setTypeParser(1700, parseFloat)` — would
make *every* `numeric` column arrive as a JS number and fix the whole class of bug for web and
mobile at once, permanently.

**Why not the server-side fix.** It is global and unscoped: it would also change
`companies.customPrice`, which is money. `numeric` exists precisely so money doesn't round-trip
through a binary float, and silently converting it days before a release — with billing code
downstream — is the wrong risk to take on a deadline. The client-side fix has a blast radius of one
app and is trivially reviewable.

**Worth revisiting after launch:** a *per-column* parser (or a Drizzle custom type) for the
genuinely-numeric columns only, leaving money as a string. That's the correct long-term fix; it just
isn't a this-week change.

**Touches.** New `frontend/mobile/src/lib/format.js`; `ActivityScreen.js`, `TripReplayScreen.js`,
`MapScreen.js`, `ReportsScreen.js`.

---

## D-006 — Error boundary mounted inside `ThemeProvider`, outside the navigator

**Decision.** `<ErrorBoundary>` sits between `ThemeProvider` and `BottomSheetModalProvider` in
`App.js`.

**Alternatives.** (a) Outermost, wrapping everything. (b) Per-screen boundaries.

**Why.** Inside `ThemeProvider` so the fallback can render the app's own themed `<ErrorState/>`
rather than unstyled text — outermost would have no theme context. Outside the navigator so it
catches throws from any screen; per-screen boundaries would be finer-grained but mean 23 more mount
points to maintain for a case that should be rare.

**Open gap.** `componentDidCatch` currently only `console.error`s. There is no crash reporter in
this project (no Sentry/Bugsnag anywhere). That's the single place to wire one in, and it should be
wired — shipping to the App Store with zero production crash visibility is a real gap, just not one
that blocks submission.

**Touches.** New `frontend/mobile/src/components/ErrorBoundary.js`; `App.js`.

---

## D-007 — Reports lists render with `.map()`, not `FlashList`

**Decision.** Replaced the two `FlashList`s in `ReportsScreen` with plain `.map()` over the result
array.

**Alternatives.** Restructure the screen so each report body is a bounded-height `FlashList` sibling
of the controls rather than a child of the `ScrollView`.

**Why.** They were nested inside the screen's `ScrollView` — a same-orientation scroller with
unbounded height, which FlashList v2 cannot virtualise; rows render blank. Report results are
date-range bounded and small (weeks in a range, vehicles in a fleet), so virtualisation buys nothing
and restructuring the screen would be churn for no user-visible gain.

**Touches.** `frontend/mobile/src/screens/account/ReportsScreen.js`.

---

## D-008 — `.env` stays on the LAN IP; production values move into `eas.json`

**Decision.** Left `EXPO_PUBLIC_API_URL` in `.env` pointing at the developer's LAN box and added the
production URLs to explicit `env` blocks on `eas.json`'s `preview` and `production` profiles.
`.env` is now gitignored; `.env.example` is the tracked template.

**Alternatives.** Point `.env` itself at production.

**Why.** `.env` is a local dev file — pointing it at production would break the developer loop on
every `expo start`. The actual bug was that production builds *depended* on it: with no `env` block,
EAS inlined whatever `.env` happened to be on disk, so a release build would have shipped with
`http://192.168.31.19:3000` baked in. Making the build profiles authoritative fixes the real
problem and leaves local dev alone.

**Open item.** `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` is deliberately **not** in `eas.json` — it
should be an EAS secret (`eas secret:create --name EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY`), and the
key itself has to be created in Google Cloud with "Maps SDK for Android" enabled and restricted to
package `au.com.claritysoftware.fleet`. **Android maps render blank grey until this is done.**

**Touches.** `frontend/mobile/.env`, `.env.example`, `.gitignore`, `eas.json`.

---

## D-009 — Socket polling fallback rather than socket-only

**Decision.** `MapScreen` re-pulls `/telemetry/live` every 30 s whenever the socket status is
anything other than `connected`, and the freshness pill shows the connection state.

**Alternatives.** Rely on socket.io's own reconnect (`reconnectionAttempts: Infinity` is already
configured) and show nothing.

**Why.** socket.io's reconnect doesn't help when the socket host is simply unreachable — which was
the shipped state, and the screen gave no indication: it kept rendering a frozen snapshot with an
"Updated Ns ago" counter ticking upward. The fallback means a socket outage degrades to a slower
map rather than a silently wrong one, and it decouples the release from D-004's infra work.

**Touches.** `frontend/mobile/src/screens/main/MapScreen.js`.

---

## D-010 — Account deletion: full tenant wipe for a sole user, successor promotion otherwise

**Decision.** `DELETE /api/v1/auth/me`. If the caller is the only user in their company, the
`companies` row is deleted (cascading to vehicles, trips, telemetry, alerts, geofences, maintenance,
drivers, safety scores) and then the user. If other users remain, only the user is deleted — and if
they were the last `companyAdmin`, the longest-standing remaining user is promoted. Password
re-entry is required for accounts that have a password.

**Alternatives.** (a) Anonymise instead of delete. (b) Refuse with "transfer ownership first" when
the caller is the last admin. (c) Delete the user and leave the company admin-less.

**Why.** (b) was rejected specifically because a deletion path that can dead-end is what Apple
rejects apps for — the flow has to always complete. (c) leaves a tenant nobody can administer, which
is a support ticket by construction. (a) doesn't honestly satisfy "delete my data" for a sole
operator whose company record *is* their data.

**Why password re-entry.** This destroys an entire company's fleet history and a stolen 15-minute
access token shouldn't be sufficient. SSO-only accounts have no `passwordHash`, so the server skips
the check for them and the client's two-step confirmation is the safeguard; `GET /auth/me` now
returns a `hasPassword` boolean so the client knows which case it's in.

**Touches.** `backend/src/modules/auth/routes/auth.ts`,
`frontend/mobile/src/screens/account/ProfileScreen.js`.

---

## D-011 — Apple identity tokens verified with `jose`, matched on `sub`

**Decision.** Added `jose` and verify Apple's identity token against the remote JWKS at
`appleid.apple.com/auth/keys`, audience-bound to the bundle ID. Users are matched on `appleId`
(Apple's `sub`) first, falling back to email only to link a pre-existing account.

**Alternatives.** `jwks-rsa` + the already-installed `jsonwebtoken`; or matching on email like the
Google path does.

**Why `jose`.** `createRemoteJWKSet` handles the fetch, the cache, and the automatic re-fetch when
an unknown `kid` appears. Apple rotates its signing keys, and hand-rolled JWKS handling typically
works until the first rotation and then fails silently.

**Why not email-matching.** Apple users can sign in with a Private Relay alias and can later disable
forwarding; Apple documents `sub` as the identifier to key on. Email-first matching would create
duplicate accounts for the same person.

**Also handled:** `fullName` arrives only on the very first authorisation and is `null` on every
subsequent sign-in, so the client forwards it and the server persists it at creation time rather
than trying to refresh a name it will never see again.

**Prerequisite on the Apple side:** enable the "Sign in with Apple" capability on the App ID before
the first iOS build, or `AppleAuthentication.isAvailableAsync()` returns false and the button
silently never renders.

**Touches.** `backend/src/db/schema/users.ts`, `backend/src/db/migrations/0003_add_apple_id.sql`,
`backend/src/modules/auth/services/apple-verify.ts`, `backend/src/modules/auth/routes/apple.ts`,
`backend/src/entrypoints/api.ts`, `frontend/mobile/src/stores/authStore.js`,
`frontend/mobile/src/screens/auth/LoginScreen.js`, `frontend/mobile/app.config.js`.

---

## D-012 — `GET /fbt` response shape changed, and web updated with it

**Decision.** `GET /api/v1/fbt` now returns `{ trips, nextCursor }` with cursor pagination, a
100-row hard cap, and the same `vehicleName` enrichment `GET /trips` does. This is a breaking change
from the previous bare array, so `frontend/web/src/pages/FbtLogbook.jsx` was updated in the same
pass.

**Alternatives.** Keep the array shape for compatibility and add pagination only behind an opt-in
query param.

**Why.** The endpoint previously returned every trip a company had ever recorded, on every call, to
both frontends — that's a real problem for web too, not just for mobile's 10 s axios timeout. A
compatibility-preserving opt-in would have left the default path broken and made `/fbt` the one
list endpoint in the API with a different response contract from `/trips` and `/alerts`. Web is one
line and lives in the same repo.

**Touches.** `backend/src/modules/fleet/routes/fbt.ts`, `frontend/web/src/pages/FbtLogbook.jsx`,
`frontend/mobile/src/screens/main/ActivityScreen.js`.

---

## D-013 — `GET /vehicles` filters to active by default

**Decision.** Added `eq(vehicles.active, true)` to the listing, with `?includeInactive=true` to opt
back in.

**Alternatives.** Make `DELETE /vehicles/:id` a hard delete.

**Why.** The soft delete is deliberate — vehicles are referenced by trips, telemetry, and alerts,
and hard-deleting one would cascade away historical data the customer needs for FBT reporting. The
bug was only that the listing never honoured the flag, so removed vehicles reappeared on the next
fetch. `includeInactive` keeps the archived rows reachable for any admin view that wants them.

**Touches.** `backend/src/modules/fleet/routes/vehicles.ts`.

---

## D-014 — Tab-bar geometry centralised in one module

**Decision.** New `frontend/mobile/src/navigation/tabBarLayout.js` exporting `TAB_BAR_HEIGHT`,
`useTabBarBottomOffset()`, and `useTabBarClearance()`. The navigator styles the bar from it and
every tab screen pads its scroll content from it.

**Alternatives.** Fix the numbers in place on each screen.

**Why.** The bar floats (`position: absolute`), so nothing reserves layout space for it and each
screen has to compensate by hand — which is exactly why they'd drifted (screens padded 56pt against
a bar occupying at least 80pt, clipping the last row, and the bar itself sat at a flat 16pt inside
the iOS home-indicator gesture area). One module means the bar and the padding cannot disagree.

**Touches.** New `navigation/tabBarLayout.js`; `navigation/index.js`, `ActivityScreen.js`,
`AlertsScreen.js`, `AccountHomeScreen.js`.

---

## D-015 — Inter fonts imported by per-weight subpath (~4.9 MB bundle saving)

**Decision.** `theme/type.js` imports from `@expo-google-fonts/inter/400Regular` etc. rather than
from the package root.

**Why.** Found while verifying the build, not from the audit. The package root `index.js` is a
barrel of 18 top-level `require()` calls — every weight plus every italic — and Metro cannot
tree-shake `require()`. Importing four names from it pulled all 18 `.ttf` files into the bundle.
Verified with `npx expo export`: 24 assets before, 10 after; font payload 6.2 MB → 1.37 MB.

**Touches.** `frontend/mobile/src/theme/type.js`.

---

## D-016 — Optimistic writes roll back instead of logging

**Decision.** `markRead`, `markAllRead`, and `classify` apply their change immediately, then restore
the previous state and raise a toast if the request fails. `loadMore` and `completeRecord` toast on
failure.

**Alternatives.** Await the server before updating (no optimism), or keep the existing
fire-and-forget.

**Why.** These previously swallowed failures into `console.log`, so the UI showed a state the server
had rejected — an alert looked read, then silently came back unread on the next load. Awaiting first
would make every chip tap feel laggy on cellular. Optimistic-with-rollback keeps the tap instant and
keeps the UI honest. The app already mounts a `ToastProvider` app-wide; it just wasn't being used.

**Touches.** `AlertsScreen.js`, `ActivityScreen.js`, `MaintenanceScreen.js`, `MapScreen.js`.

---

## D-017 — `screens/auth/` follows Apple's design language, not the app's own

**Decision.** The four auth screens were rebuilt in Apple's design language and now run on their own
type scale (`appleType`), their own neutral tokens (`ios*`), and their own component kit
(`components/auth/`). Every other screen is untouched and still follows the doctrine described at
the bottom of `theme/tokens.js`.

**Alternatives.** (a) Restyle the auth screens within the existing scale and palette. (b) Convert
the whole app to Apple's language. (c) Leave them as they were.

**Why.** These are the first two screens a new install sees, and they read generic. (b) is a
multi-week change that would also desynchronise mobile from the web dashboard, which shares the
palette. (a) can't get there: the two things that actually make a screen read as native iOS are the
system typeface and the inset grouped list, and neither exists in the current system. Scoping the
new doctrine to `screens/auth/` buys the visual result without touching the 20+ screens behind the
login wall.

**Why two type scales.** `appleType` omits `fontFamily` entirely on iOS, which is what makes React
Native resolve the real system face — SF Pro — and get its automatic Display/Text optical sizing
above ~20pt. Setting `fontFamily: 'System'` forfeits that. SF Pro isn't licensed off Apple's
platforms, so Android falls back to the Inter cut already bundled for the same weight; the metrics
are close enough that the layouts hold on both. `appleType` also uses Apple's 17pt body against the
app scale's 15pt, so the two can't be merged without changing every existing screen.

**Why `ios*` tokens.** The ported palette is Tailwind slate, which has a blue cast that visibly
fights an iOS-native look. The six added keys per scheme are the real UIKit system greys. They're
prefixed so there's never ambiguity about which doctrine a token belongs to.

**Brand tint kept.** Auth uses `colors.accent` (indigo), not Apple system blue. Apple's own apps use
Apple's brand tint; using ours is the native-correct choice and keeps parity with web.

**Scoped exception to the "accent is for actions, not decoration" rule** in `theme/tokens.js`: the
welcome screen's three feature icons are tinted. On Apple's onboarding pattern the tint *is* the
visual system, and this screen sits outside the app's information hierarchy entirely.

**Sign in with Apple is unchanged** — still `AppleAuthentication.AppleAuthenticationButton`, for the
Guideline 4.8 reasons in D-003. It only exposes `height` and `cornerRadius`, so `AuthButton` was
sized to match it (50pt / 14pt) rather than the reverse.

**Also fixed.** `WelcomeScreen` was hardcoded to `#0B0B0F` regardless of the device setting, which
is why it couldn't use the themed kit. It now follows the system scheme, and the splash background
in `app.config.js` gained a light variant to match — it was `#0B0B0F` in both appearances, which
would now flash near-black before a light-mode launch.

**Touches.** `frontend/mobile/src/theme/{type,tokens,ThemeProvider}.js`,
`frontend/mobile/src/components/auth/*` (new),
`frontend/mobile/src/screens/auth/{Welcome,Login,Signup,ForgotPassword}Screen.js`,
`frontend/mobile/app.config.js`.

---

## D-018 — `!override` on every `ports:`/`env_file:` in `docker-compose.prod.yml`

**Decision.** Tag every overridden `ports:` and `env_file:` list in `docker-compose.prod.yml` with
Compose's `!override`, and make "verify the merged bindings" an explicit numbered step in
`DEPLOY.md` before the box is exposed.

**Alternatives.** (a) A standalone production compose file duplicating all five services.
(b) Plain override without the tag.

**Why.** (b) is silently dangerous: Compose *concatenates* list fields across `-f` files rather
than replacing them, so the dev file's `'5432:5432'` (bound to `0.0.0.0`) survives the override and
the "hardened" production stack publishes Postgres and Redis to the open internet on a box with a
public IP. The same merge rule applies to `env_file`, which would load the dev `./backend/.env`
alongside `.env.production` and leak dev values for any key production doesn't redefine. (a) avoids
the trap but duplicates config that then drifts. Verified with
`docker compose -f docker-compose.yml -f docker-compose.prod.yml config`: exactly one binding per
port, all `127.0.0.1` except 5027.

**Cost.** Requires Docker Compose v2.24+. Older versions ignore the tag and silently fall back to
merging, which is why `DEPLOY.md` step 3 gates on the version and step 8 re-checks the result.

**Touches.** `docker-compose.prod.yml`, `DEPLOY.md`.

---

## D-019 — Device IMEI stays unauthenticated while 5027 goes public

**Decision.** Ship the public device port with `parseImei()` unchanged — any connecting client is
trusted to be whichever IMEI it claims. Add observability (`/health`, `connected[]` on
`/internal/metrics`, an `unknownImei` counter) instead of enforcement.

**Alternatives.** (a) Check the claimed IMEI against the `vehicles` table before registering the
socket. (b) Per-SIM source-IP allowlisting in ufw.

**Why.** Confirmed with the user at plan time: the immediate goal is getting one device tracking,
and (a) adds a DB dependency to a process that deliberately has none today (`tcp-listener` only
`depends_on: redis`), which is a real architectural change rather than a tweak.

**Risk being carried.** With 5027 on the public internet, anyone who learns a valid IMEI can
connect as that device, inject fabricated telemetry, and — because
`registry/sockets.ts` `destroy()`s the existing socket when a second connection claims the same
IMEI — knock the real device offline and take over its relay cut/restore channel. That channel
drives the immobiliser. This is acceptable for a single test device and **is not acceptable once
customer vehicles are on the platform**; revisit before then.

**Touches.** Nothing (deliberate no-op). Recorded so it reads as a decision, not an oversight.

---

# Blocked on manual steps

These are the things the code now depends on that can't be done from the repo. Each one has a
visible failure mode if skipped.

| # | Step | If skipped |
|---|------|-----------|
| 1 | Stand up `wss://socket.clarity-software.com.au` in front of the `ingestion` process on port 3001 (nginx config in the plan file), and add the origin to `CORS_ORIGINS` | No live map, no live alerts, no unread badge. The 30 s polling fallback covers it, so the app works — just not in realtime |
| 2 | Create a Google Maps SDK for Android key, restrict it to package `au.com.claritysoftware.fleet`, and add it as an EAS secret named `EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY` | Android map tiles render blank grey |
| 3 | Enable the "Sign in with Apple" capability on the App ID in the Apple Developer portal | `isAvailableAsync()` returns false, the Apple button never renders, and the app fails App Store Guideline 4.8 |
| 4 | Upload an APNs push key to EAS | iOS push notifications never arrive |
| 5 | Run `npm run db:migrate` in `backend/` to apply `0003_add_apple_id.sql` | `POST /auth/apple/token` errors on the missing `apple_id` column |
| 6 | Publish the privacy policy and terms pages at the URLs in `.env.example` | Dead links in the Account tab; App Store Connect requires a reachable privacy policy URL |
| 7 | Point web's `VITE_SOCKET_URL` at the same host as (1) | The web dashboard's realtime stays broken — it currently ships `http://localhost:3001` too |

## Known gaps, deliberately not addressed this pass

- **No crash reporting.** `ErrorBoundary.componentDidCatch` only logs. Shipping to production with
  zero crash visibility is a real gap — see D-006 for where to wire a reporter in.
- **`react-navigation` v6** is a major version behind v7. Nothing about it blocks submission;
  upgrading days before a release is the wrong trade.
- **Per-column `numeric` parsing** on the backend (D-005) — the correct long-term fix for the
  string-vs-number class of bug, deferred because it touches money columns.
- **Guideline 3.1.1 risk on `UpgradeScreen`** — it displays per-van subscription pricing. B2B fleet
  software generally qualifies for the Enterprise Services carve-out (3.1.3(e)), but have that
  justification ready in App Review notes.
