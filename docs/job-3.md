# Job 3 — rider progression and Ridey

Built from GitHub main `7829b6f83a8ad9062e43dbd51049a911a6207b1e` on `job-3-progression-ridey`. No merge to main. Existing Next.js, Vercel, Neon/PostgreSQL, Google OAuth, map, transitions, weather, fuel, arrival/rating, profile, notifications and original milestones are retained.

## Deploy and database

Run `npm ci`, then `npm run db:migrate` with the existing server-only `DATABASE_URL` available (or in ignored `.env.local`) **before deploying this branch**. Use the existing pooled Neon URL, including TLS settings. Do not change Google OAuth or existing auth variables.

The migration runs the original `001_initial.sql` and additive `002_progression.sql` in one transaction under the existing migration advisory lock. Both are idempotent. No existing rows are deleted or rewritten. The only new table is `progression_events`, keyed by `(owner,event_key)`, plus an index for pending unlocks. State uses an existing `records` row: ID `progression:state`, kind `progression`. No second user/profile/auth system exists. Drizzle's schema includes the new table; the existing migration command remains authoritative.

Per-user progression initialization happens on authenticated `/api/progression` GET. Previously completed rides and current maintenance records are credited once, silently; their records are not modified. Maintenance history which was never stored cannot be reconstructed. The ledger persists on logout. Current client records and GPS remain self-reported; this is a private motivational feature, not fraud-proof competitive scoring.

Missing production database credentials in the development workspace prevent a live Neon migration here. The actual SQL is exercised against PGlite's PostgreSQL engine. Production migration must run before deployment so progression writes can commit atomically.

## XP and levels

`lib/progression/config.ts` contains tuning and tier thresholds. No speed, pace, acceleration or weather-risk input awards XP.

- Completed ride: 50 XP, plus 5 XP per complete 5 km, capped at 50 km (100 XP maximum). At most five rides per Asia/Manila start day receive this base/distance XP. All completed rides still count in historical totals.
- Rides recording more than two hours receive **no distance bonus** without a recorded pause after the initial GPS sample. Pause evidence is approximate; the app cannot certify a rider rested. Longer distances never increase the capped bonus.
- Maintenance reminder/service: 25 XP per `(service ID, service date, last serviced odometer)`, at most three per service date. Editing an interval or resending the same service earns nothing extra. Creating the first reminder records the supplied previous service; “Serviced today” records the next one.
- First completed visit to a destination area (coordinates rounded to 0.01°): 20 XP, once per area. Repeated pins/renaming do not add XP.
- Consecutive ride days: 15 XP for the later day, once per date. Multiple rides that day add no streak XP. Missing days carry no penalty.
- Rating: 5 XP once per completed ride, regardless of rating score or feedback.
- Achievement unlock: the one-time XP below. Tier unlocks have no extra XP.

Level `L` begins at total XP `100 × (L − 1)²`; next level starts at `100 × L²`. The UI shows total XP, XP within the level, remaining XP and a progress bar. Levels keep scaling above Godlike; Godlike stays the highest tier.

| Tier | Minimum total XP |
| --- | ---: |
| Bronze | 0 |
| Silver | 500 |
| Gold | 1,500 |
| Platinum | 3,500 |
| Diamond | 7,000 |
| Master | 12,000 |
| Godlike | 20,000 |

Badge visuals are colored shield placeholders in `progression-card.tsx`, ready for future assets.

## Achievements

| Achievement | Definition | XP |
| --- | --- | ---: |
| First Ride | 1 completed ride | 25 |
| 5 Rides Completed | 5 completed rides | 50 |
| 10 Rides Completed | 10 completed rides | 75 |
| 100 km Total Distance | 100 km across completed rides | 50 |
| 500 km Total Distance | 500 km across completed rides | 100 |
| 1,000 km Total Distance | 1,000 km across completed rides | 150 |
| New Explorer | 3 distinct completed destination areas | 50 |
| Weekend Rider | Completed ride starting Saturday/Sunday | 25 |
| Early Rider | Completed ride starting 05:00–08:59 Asia/Manila | 25 |
| Night Rider | Completed ride starting 19:00–04:59 Asia/Manila | 25 |
| Maintenance Ready | First maintenance reminder/service recorded | 25 |
| Prepared Rider | Saved vehicle with fuel economy plus recorded maintenance | 25 |

Early/Night achievements acknowledge routine journeys; their descriptions emphasize rest and visibility. They do not ask riders to change their riding times. Selected unlocked achievements appear in the existing profile; all twelve appear in Badges, above the original milestones.

## Persistence, idempotency and popups

`xp.ts`, `levels.ts`, `achievements.ts`, `ledger.ts` and `repository.ts` separate business rules. Each relevant record POST locks the existing authenticated owner on a pinned PostgreSQL client, saves the record and reconciles progression in one transaction. Active autosaves and unrelated preference/inbox/place/trip saves do not recalculate progression. The event ledger uses `INSERT ... ON CONFLICT DO NOTHING`, preventing duplicate awards even on retries/offline sync. Recorded ride facts, including its destination area, are frozen in the first ledger event; later rating updates cannot increase its distance, discovery or base XP. Reserved IDs and record-kind collisions are rejected.

Achievement and tier events are permanent. Changing a reminder/vehicle later does not remove an unlocked achievement. Pending popups are atomically claimed on POST `/api/progression`; they cannot repeat across tabs or devices. A response lost after claiming can miss a popup, but the achievement remains visible in profile/Badges. Offline saves receive XP after successful sync, not speculative client awards. Notification entries reuse the existing inbox read-state system.

## Ridey integration

`RideyChat` is a compact header entry and a mobile-friendly right sheet. It does not float over the map. Existing sheet animations, safe-area padding and reduced-motion behavior are retained. Chat is disabled while recording; riders must pause safely. Features include separated messages, structured heading rendering, typing, auto-scroll, request retry, quick prompts, new chats, conversation selection, and clear history.

`Navigator` builds the route/weather/fuel/stop snapshot through `buildRideyContext`. `Home` adds only aggregate ride totals and maintenance remaining-distance summaries. `minimumContext` runs both client and server, selecting groups needed by the current and preceding two user prompts. Unknown fields are rejected. No email, rider name, home address, avatar, exact current GPS, GPS tracks, coordinates, vehicle notes or raw ride history are sent.

| Context group | Fields |
| --- | --- |
| route | destination display label, distanceKm, remainingKm, etaMinutes, estimate=true |
| weather | current/destination condition, temperatureC, rainChancePercent, windKph, fetchedAt |
| fuel | vehicleType, kmPerLiter, estimatedLiters, requiredLiters, rangeKm, status, estimate=true |
| stops | up to 3 relevant known stop IDs/names/types, availability=unverified |
| history | completedRides, total distanceKm |
| maintenance | up to 5 service names and remainingKm |

Weather can be stale; fuel/ETA are estimates; stop listings and client snapshots are unverified. When fields are missing Ridey should ask for them. Ridey is an AI suggestion, not a diagnosis or guaranteed travel/fuel/weather result. Safety instructions prioritize getting clear of traffic, only basic visual checks, a qualified mechanic and appropriate emergency assistance.

Contextual actions are generated by application code, not AI URLs. They open route, destination, weather, maintenance or a known stop's details. Viewing a stop **does not plan a route to it**. Its current POI ID is checked by Navigator. AI cannot change a destination, route, vehicle or stored record.

## Provider architecture and exact configuration

`Ridey UI → POST /api/ridey → createProvider → model endpoint`. Server authentication and rider registration are required. Provider code imports a Node-only dependency and is reachable only through server routes. No `NEXT_PUBLIC_` AI settings exist. API errors never return endpoint details, provider bodies or credentials. Requests time out after 20 seconds; Vercel route max duration is 30 seconds. Responses are plain text, never executable HTML.

The provider interface is `complete(system, messages, signal)`. Current adapters are `openai-compatible` and `ollama`; add another adapter here without replacing the UI. No particular commercial provider is required. Free-tier limits and hosting costs depend on the provider; **there is no promise of unlimited free AI**. Riders need no individual AI subscription, but the Lakbay operator supplies and manages shared model access.

In Vercel **Project → Settings → Environment Variables**, add server-only variables for the appropriate deployment environment and redeploy:

| Variable | OpenAI-compatible free-tier or hosted endpoint | Self-hosted Ollama |
| --- | --- | --- |
| `RIDEY_PROVIDER` | `openai-compatible` | `ollama` |
| `RIDEY_BASE_URL` | Your provider's documented API base URL ending in `/v1` (or its compatible base path) | Reachable secured model host, without `/api/chat` |
| `RIDEY_MODEL` | Exact model identifier your endpoint accepts | Exact installed Ollama model identifier |
| `RIDEY_API_KEY` | Provider-issued key, if required | Optional bearer token supported by your authentication proxy |

The compatible adapter appends `/chat/completions`; Ollama appends `/api/chat`. For a local deployment, put the same values in ignored `.env.local`. For Vercel, a model running on your PC's localhost is not reachable: expose an authenticated HTTPS service you control. HTTP is supported for trusted local deployments. Keep credentials out of endpoint URLs and git. Existing `DATABASE_URL`, auth, Google OAuth and email variables stay as they are.

Leave Ridey settings blank to display a graceful “pit stop” state. Maps, rides and all other functions remain usable. GET `/api/ridey` exposes only availability and a friendly status, never configuration. POST accepts up to twelve 2,000-character message turns and an optional whitelisted context. Rate limits are shared across instances through existing PostgreSQL `service_gate`: six requests/user/minute and sixty/user/UTC day. These are application limits, not a guarantee that a free-tier provider has capacity. Failed configured calls consume quota to bound retries.

## Conversation storage

Local-first history is scoped by the existing authenticated cache key and stored in browser localStorage: up to three conversations, forty messages per conversation, each at most 6,000 characters, expiring thirty days after its latest activity. Only the latest twelve shortened turns are sent per model request. Clear history removes this account's conversations on this browser. Logout does not reset progression or chat history; another account gets a different key. History is not synced between devices and is not stored in PostgreSQL. Shared-browser users can clear it. If localStorage is unavailable, chat works in memory with a visible warning. Provider-side retention is controlled by the selected service, not by Lakbay.

## Validation and limits

Commands: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`.

Tests cover actual PostgreSQL SQL via PGlite, additive migration replay, existing records/users and auth/OAuth regression, ledger deduplication, rollback, all tier/level boundaries, capped/pause-aware XP, achievement persistence, popup claims, rating/service retries, distinct-user isolation, configured/unconfigured adapters, secret-safe failures, privacy whitelisting, authenticated API checks, concurrent usage limits, local-history limits and existing ride/weather/fuel/routing tests.

The existing main has 74 lint errors under current stricter rules (legacy `any`, hook patterns and link usage). The affected legacy files now report those findings as warnings; new Job 3 modules remain under the default strict rules. This avoids rewriting unrelated working features. Build/typechecks are unchanged in strictness. Production migration, a real configured AI provider, physical GPS ride testing and live Neon/Vercel verification require their corresponding production environment and are not implied by fixture tests.

Final validation: 19 automated tests passed; TypeScript passed; production Next.js build passed; lint passed with zero errors and inherited warnings. The compiled browser assets were scanned using a build-only fake AI secret and contained no secret or server AI settings. Authenticated production HTTP smoke checks passed for page rendering, existing ride loading, progression backfill, unconfigured Ridey, routing and weather using an isolated PGlite/provider fixture. Full browser/mobile visual smoke testing was blocked: cloud browser refuses localhost and the environment could not download Chromium. No real Neon migration, Vercel deployment, real-model call or physical GPS ride was performed.

## Changed files (36)

- `.env.example`
- `.gitignore`
- `app/api/progression/route.ts`
- `app/api/records/route.ts`
- `app/api/ridey/route.ts`
- `app/globals.css`
- `app/ride-app.tsx`
- `components/lakbay/navigator.tsx`
- `components/lakbay/profile.tsx`
- `components/lakbay/progression-card.tsx`
- `components/lakbay/ridey/chat.tsx`
- `db/postgres/002_progression.sql`
- `db/schema.ts`
- `docs/job-3.md`
- `eslint.config.mjs`
- `hooks/use-progression.ts`
- `lib/offline-records.ts`
- `lib/progression/achievements.ts`
- `lib/progression/config.ts`
- `lib/progression/ledger.ts`
- `lib/progression/levels.ts`
- `lib/progression/repository.ts`
- `lib/progression/types.ts`
- `lib/progression/xp.ts`
- `lib/ridey/actions.ts`
- `lib/ridey/context.ts`
- `lib/ridey/history.ts`
- `lib/ridey/prompt.ts`
- `lib/ridey/provider.ts`
- `lib/ridey/rate-limit.ts`
- `lib/storage.ts`
- `package.json`
- `scripts/migrate-postgres.mjs`
- `tests/progression.test.mjs`
- `tests/ridey.test.mjs`
- `tests/vercel-storage.test.mjs`
