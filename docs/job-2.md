# Lakbay Job 2 implementation report

## 1. Files changed

- app/api/explore/route.ts
- app/api/records/route.ts
- app/globals.css
- app/ride-app.tsx
- components/lakbay/arrival-dialog.tsx
- components/lakbay/fuel-panel.tsx
- components/lakbay/map-canvas.tsx
- components/lakbay/navigator.tsx
- components/lakbay/ride-history.tsx
- components/lakbay/vehicles.tsx
- components/lakbay/weather-summary.tsx
- hooks/use-nearby.ts
- lib/app-updates.ts
- lib/arrival.ts
- lib/fuel.ts
- lib/record-schemas.ts
- lib/ride.ts
- lib/route-pois.ts
- lib/weather.ts
- package.json
- tests/ride-systems.test.mjs
- docs/job-2.md

## 2. Database and schema

No SQL migration, table change, reset or deletion. Existing JSON records remain valid. Optional ride fields hold destination, arrival timestamp, rating and feedback. The existing motorcycle profile record gains an optional garage containing up to 12 saved vehicles and an active vehicle ID. Existing motorcycle name and odometer remain intact. Server-side Zod validation rejects invalid ratings, economy, capacity and active vehicle IDs. GPS points may include accuracy.

## 3. Weather

Reuse the authenticated Open-Meteo-backed endpoint and its shared 10-minute server cache. A reusable client service coalesces simultaneous requests and caches up to 20 coordinate sets for 10 minutes. The UI checks every 10 minutes while visible, and checks again on visibility restoration or reconnection. Coordinates are rounded to 0.01 degrees; rider-area requests move only after a 3 km change. Current area and destination use one combined request. Destination guidance selects the hourly forecast nearest the estimated arrival time, within the returned 24-hour horizon; it shows unavailable beyond the forecast horizon. Offline/provider failure never blocks the map and retains the last available weather for the same location set. No GPS is labelled Preview area. The long weather disclaimer is replaced by update age and compact attribution.

Provider reference: https://open-meteo.com/en/docs

## 4. Arrival

60 m from the selected destination, during an active recording with at least 10 m recorded. Require two distinct GPS timestamps with accuracy <=35 m, fixes younger than 15 seconds and at least 4 seconds within the arrival area. The reusable gate fires once per ride ID. A separate parent lock prevents duplicate completion writes. Completion stops recording and saves the destination, timestamp, distance and duration before opening congratulations, lightweight confetti and optional feedback. Save failure pauses safely and permits a retry on resume. Reduced-motion users do not get confetti animation.

## 5. Ratings

Optional integer 1-5 stars and feedback up to 1,000 characters are stored on the completed ride JSON, using the existing authenticated record endpoint and offline IndexedDB queue. Skip requires no feedback. History lists show stars; ride details show rating, feedback and destination. Share captions include rating and feedback when present; generated share cards include the rating. No rating is fabricated for old rides.

## 6. POI clutter

Use 26 px subtle markers, lower shop opacity, zoom-dependent limits (normally 0/4/8/10/18), and spatial separation of nearby pins. During recording, filter to an 800 m route corridor and exclude stops more than 150 m behind projected rider progress. Critical suggested stations are highlighted. Rider and destination markers have higher stacking priority. Nearby queries sample up to four forward route areas, with six total deduplicated cached cells and existing request spacing. This is lightweight thinning, not a new clustering dependency. Route fitting leaves space for map controls so the destination is visible.

## 7. Fuel formulas

Range km = estimated liters * vehicle km/L.
Fuel needed L = remaining route km / vehicle km/L.
Remaining L = estimated current liters - fuel needed.
Reserve L = max(0.5, 15% of fuel needed).
Negative remaining: Insufficient estimated fuel. Below reserve: Refuel recommended. Below twice reserve: Fuel may be low. Otherwise Enough fuel.

Example: 3.5 L at 35 km/L gives 122.5 km; an 82 km route needs about 2.34 L and leaves about 1.16 L. Fuel is explicitly user entered and approximate. During recording, subtract estimated consumption since the last fuel entry; remaining fuel carries into planning after completing the ride. Invalid values do not produce estimates.

## 8. Refuel suggestions

Project mapped fuel stations onto the existing road geometry. Select up to three within 1.5 km of the route, no more than 100 m behind rider progress, and within estimated range using forward route distance plus straight-line offset. Prefer smaller offsets. Highlight candidates and clearly label recommendations approximate: access, detour distance and station availability are unverified. Selecting a station explicitly replans the destination. If none qualify, show no reachable mapped station rather than inventing a recommendation. Coverage depends on available mapped POIs.

## 9. Validation

- TypeScript noEmit: passed.
- Production Vinext build: passed.
- npm run test:ride-systems: five tests passed, covering fuel samples/invalid values/reserves; accurate fresh one-shot arrival; route-aware POIs; backward-compatible rating/vehicle storage validation; weather caching, deduplication and failure recovery.
- Mobile browser integration at 390 x 844: weather failure is nonblocking; no-vehicle setup; legacy profile preservation; vehicle saving; destination weather; marker/POI behavior; low-fuel suggestions; simulated arrival completes once; offline rating survives reload/history and syncs after endpoint recovery; no page runtime errors.
- Visual inspection of mobile map and arrival dialog.
- Lint executed. Existing lint failures remain; comparison of app/components/hooks/lib diagnostics shows no new errors or warnings. New test file lint passed.
- git diff --check: passed.

Browser tests used controlled GPS and API fixtures with the actual record validators. They do not replace a real phone ride or production D1/network verification.

## 10. Configuration and rollout

No new package, API key, Cloudflare binding or migration. Existing D1/authentication and map/weather provider connectivity must work. Deploy main to expose the update on the live phone web app. Job 2 is listed in the notification inbox and supports the previously added web Update app action. Play Store integration remains for a published native Android app.

No XP, rider levels or Ridey implementation was added.
