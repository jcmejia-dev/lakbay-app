# Job 3.1 — notifications and PWA updates

This extends `job-3-progression-ridey`; it preserves the existing inbox record, Google/email sessions, Job 3 ledger, Ridey, map and offline record queue. It does not merge or modify `main`.

## Deploy/configure in Vercel

1. Run `npm ci` and `npm run db:migrate` against the **existing** Neon/PostgreSQL database before deploying this code. Migration `003_notifications.sql` is additive and idempotent. Existing `001`/`002` migrations remain safe to rerun.
2. Run `npm run push:keys` locally once. It creates ignored `.env.push.local` with mode 0600 and refuses to overwrite it. Do not commit or share the filled file. Copy the values to Vercel, replacing the support address:

| Variable | Exposure | Value |
| --- | --- | --- |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Public | Generated uncompressed P-256 public key, base64url |
| `VAPID_PRIVATE_KEY` | Server only | Matching generated private key |
| `VAPID_SUBJECT` | Server only | `mailto:your-support-address` or an HTTPS contact URL |
| `CRON_SECRET` | Server only | A cryptographically random secret, at least 32 characters |

Keep all existing `DATABASE_URL`, OAuth, email and optional Ridey variables unchanged. Generate `CRON_SECRET` privately in a password manager or with Node crypto; do not post it in chat or commit it. Missing/mismatched VAPID settings leave phone alerts gracefully unavailable and the inbox usable.

3. Set VAPID/cron secrets on the intended **production** deployment. Use a separate database for preview push testing, or leave preview push variables unset: a preview using production subscriptions must not send test release pushes to real riders. This work does not enable or change your deployment branch automatically.
4. Deploy using the existing `npm run build`. `prebuild` generates version metadata. Vercel uses `vercel.json` to call `/api/push/dispatch` daily at approximately 00:00 UTC (08:00 Philippine time); Vercel supplies `Authorization: Bearer CRON_SECRET`. Verify the cron is enabled in the project dashboard.
5. A daily schedule is compatible with Hobby. Closed-app release/reminder delivery can wait until the sweep; it is not an exact-time alarm. For faster or larger workloads, use an appropriate Vercel plan/schedule or a trusted external scheduler calling the same protected endpoint with the Bearer secret. No rider subscription to an AI/push service is required; hosting/provider usage limits still apply.
6. Test on your HTTPS production/isolated staging origin. Enable phone alerts explicitly on each device, close Lakbay, trigger a real achievement or deploy a changed build, and run the authorized dispatch job. Test permission denial, reconnect, multiple devices, foreground/background clicks, and an active draft before updating.

Official platform references: [Vercel cron limits](https://vercel.com/docs/cron-jobs/usage-and-pricing), [cron authorization](https://vercel.com/docs/cron-jobs/manage-cron-jobs), [Web Push on iOS/iPadOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/), [service-worker update lifecycle](https://web.dev/learn/pwa/update), [Badging API](https://developer.mozilla.org/en-US/docs/Web/API/Badging_API).

## Shared inbox and persistence

- New `notifications` table: `(owner,id)` primary key, JSON notice, original `sent_at`, actual creation time and a push-eligible flag. Same logical ID is used by the inbox, notification tag, clicks and delivery queue. Inserts/reconciliation do not create a second inbox item. Newly unlocked achievements/tiers are inserted in the same transaction as the XP ledger event. Existing achievement events and original legacy badges are materialized without a historical push burst.
- The account's original `records` row `id='inbox', kind='inbox'` still owns `read[]` and `browser`. Read IDs are merged, not overwritten by a stale device; new read-only saves preserve the server's phone-alert setting. Read IDs remain capped at the existing 1,000. Mark-all uses the displayed inbox window. The UI updates immediately; offline changes use the existing IndexedDB queue and sync when connected.
- Up to 200 notices are retained/displayed per owner. Intentional expiry prunes only the new notification/outbox tables. Existing rides, profiles, sessions, XP and offline records are not deleted. An account-scoped, bounded localStorage snapshot lets the loaded app show its saved inbox offline. This does **not** add a fully offline authenticated navigation shell: initial sign-in/uncached cold navigation still needs network, as before.
- Newest-first sorting uses numeric `time`, with a deterministic ID tie-breaker. `Latest` belongs only to the most recent release notice; it does not move that notice ahead of a newer ride/achievement/reminder.
- Dates use `Asia/Manila`: Today/Yesterday or month/day (year for older years), followed by hour/minute and AM/PM. The ISO timestamp is available through `<time>` and the tooltip. Original update IDs are retained; their formerly fabricated future timestamps are corrected to the verified GitHub commit times. Notices that previously had no sent time receive a stable timestamp when first materialized; the old client did not store one to recover.
- Lucide `Mail` is unread and `MailOpen` is read. Read/unread text/background and dot complement the icon. The in-app bell reports the actual unread count through `99+`.

## Web Push architecture

`Lakbay authenticated server → web-push/VAPID → browser push service → /notifications-sw.js → system notification`.

- Explicit Enable requests permission in the click gesture, registers the existing worker URL/scope, obtains a user-visible-only PushManager subscription, POSTs it to the authenticated server, then saves the existing phone-alert setting. Permission denial, absent support, failed registration and absent server config leave the inbox working. Reconnect repairs a device subscription without requiring logout/login. If an older installed worker has an update waiting, apply Update app safely first so the subscribed device actually has the push handlers.
- `push_subscriptions` stores a SHA-256 endpoint ID, existing owner ID, endpoint, P-256 key, auth key, created/updated time. No fingerprint, advertising ID, IP or user agent is retained. Up to ten devices are retained per owner; inactive subscriptions expire after 180 days without registration refresh. An endpoint can belong to only the current account, with transaction locks guarding reassignment. A private device cookie lets normal signout unlink that device without changing OAuth configuration. Other devices remain registered.
- Endpoint validation permits HTTPS browser push providers (FCM, Mozilla, Apple and Windows notification services), forbids arbitrary hosts, credentials/ports and malformed encryption keys. This prevents the subscription endpoint from becoming an arbitrary server-side request target. Supporting another provider requires deliberately extending the allowlist.
- Subscription/config/read APIs require the existing authenticated, registered rider and same-origin mutations. Only `CRON_SECRET` can invoke the background sweep. Riders cannot supply arbitrary recipient IDs or push payloads. Provider failures are not logged with subscription/auth data.
- `push_deliveries` uniquely keys each device/event, uses an atomic lease, exponential backoff and at most six attempts. Four concurrent deliveries, a 30-second budget and a 40-item batch keep work bounded. HTTP 404/410 delete expired subscriptions (and their pending rows). A crashed/ambiguous network delivery can be retried, but the same notification tag replaces that system notice, and the inbox remains a single row. Web Push cannot guarantee exactly-once transport delivery.
- Daily sweeping reconciles releases/maintenance for up to 100 subscribed owners within a 15-second budget. A cursor in the existing `service_cache` continues the next sweep. Successful/exhausted delivery rows are cleaned after seven days. Events older than seven days do not start new pushes. For larger fleets, schedule sweeps more frequently; do not assume a single daily batch can instantly notify unlimited users.
- Achievement/tier unlocks, new deployed releases and maintenance **due now** are eligible. Near-due reminders and ride saves stay inbox-only. One maintenance-cycle/phase ID prevents daily repeat notices (a previously shown near-due notice can create one new due-now event); completing that service makes its queued reminder obsolete. Mileage reminders use stored rides/odometer, not live background GPS.
- Subscription recovery checks happen on eligible app startup, explicit reconnect and `pushsubscriptionchange`. Closed-app renewal needs a valid session; if unavailable, the app reconnects next time permission/session are valid. Rotating the VAPID key causes the client to replace its old subscription.

## App-icon badge and clicks

The client calls `navigator.setAppBadge(count)` or `clearAppBadge()` after unread changes. It also messages the worker. Push/click handling attempts WorkerNavigator equivalents, and uses the authenticated inbox count when available. Unsupported/rejected APIs are ignored safely. A push alone never inserts another client inbox notice.

Click data accepts only existing Lakbay views. Achievements open Badges; maintenance opens Garage; releases open Notifications. The worker focuses an existing same-origin window and sends the ID/view, or opens a fixed same-origin URL carrying those values. It never opens an arbitrary payload URL. Opening marks the existing ID read; the UI retries/persists a failed offline click when it next opens.

Android Chrome installed PWAs and normal Chrome, and supported desktop Chrome/Edge, can use Web Push with HTTPS and permission. Numeric app badges depend on installation/browser/OS; Android launchers may expose only a notification dot. iOS/iPadOS Web Push requires supported system versions (16.4+) and a Home Screen web app; ordinary Safari tabs are not equivalent. Focus modes, force-stopping a browser, battery restrictions, denied permission or offline push services can delay/suppress alerts. The in-app bell remains the reliable cross-platform count. No Messenger-style badge is promised.

## Real app updates and active-ride protection

- `scripts/generate-release.mjs` hashes actual application source/assets/config/lockfile into a deterministic build ID. An identical rebuild is not a new release. Metadata is generated for dev/build/typecheck/tests and ignored in git; its time comes from the source commit (or SOURCE_DATE_EPOCH/build fallback when git is absent). Release title/summary live in that generator and should be updated for future user-visible releases.
- `/api/pwa/worker` serves a generated classic-worker script containing that ID with no-store headers. The existing public `/notifications-sw.js` imports it. Registration uses `updateViaCache:'none'`; returning to the app and a five-minute foreground check ask the browser to check for a new worker. `/api/pwa/release` serves matching release metadata.
- Installing never calls skipWaiting. A genuine waiting worker exposes its version through a MessageChannel. The UI makes Update app available only for a waiting worker (or a newer already-activated worker while this page still runs old code). First installation does not create a false actionable update; release history can still describe the deployed release.
- Update app warns about an active draft, stops tracking, waits for the save queue, saves the draft to the existing server/offline repository, and waits for read-state saves. Failed persistence prevents activation/reload. A draft remains available to resume afterward.
- The waiting worker asks **every** open Lakbay window for readiness. A window with an active draft blocks activation unless that window explicitly prepared/saved the update. Close other active/legacy windows or finish their rides, then retry. Unknown/unresponsive windows fail closed. This also protects a ride in another tab.
- Only an authorized user update sends `ACTIVATE_UPDATE`; after readiness the worker calls skipWaiting. Activation deletes only old `lakbay-app-*` static-asset caches, claims clients, and the initiating prepared page reloads on controllerchange. Other windows never reload unexpectedly, including when another tab activates an update.
- The worker caches bounded immutable `/_next/static/` assets only. It does not cache private API replies or authenticated HTML, clear cookies/localStorage/IndexedDB, drop offline drafts, change destinations, or touch Neon data. Saved release notices remain in history until the normal inbox retention expiry.

## Validation and limits

Automated validation covers notification ordering, Manila time including midnight, counters, shared read merge/mark-all, additive SQL and old records, multi-device subscription persistence/reassignment, endpoint/key validation, queue replay, retry/expiry, secret-free public config, unconfigured states and denied permission. Worker VM tests execute push, safe click navigation, badge clear, subscription renewal, cache cleanup and readiness/activation behavior. Existing storage/auth/OAuth, ride/weather/route/fuel, progression and Ridey tests remain in the suite.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Typecheck generates release metadata first. Tests use isolated PostgreSQL/PGlite and mock push providers; they never send a real phone notification or modify production data. Production HTTP smoke tests cover the built authenticated app and APIs. Physical Android/iOS/desktop PWA delivery and launcher badges still need the deployment/device test above; there is no claim of physical-device testing in this workspace.

## Files changed

- `.env.example`
- `.gitignore`
- `README.md`
- `app/api/auth/signout/route.ts`
- `app/api/notifications/route.ts`
- `app/api/push/config/route.ts`
- `app/api/push/dispatch/route.ts`
- `app/api/push/subscriptions/route.ts`
- `app/api/pwa/release/route.ts`
- `app/api/pwa/worker/route.ts`
- `app/api/records/route.ts`
- `app/globals.css`
- `app/ride-app.tsx`
- `components/lakbay/notifications.tsx`
- `db/postgres/003_notifications.sql`
- `db/schema.ts`
- `docs/job-3-1.md`
- `lib/app-updates.ts`
- `lib/notifications/access.ts`
- `lib/notifications/client.ts`
- `lib/notifications/push.ts`
- `lib/notifications/repository.ts`
- `lib/notifications/types.ts`
- `lib/notifications/use-inbox.ts`
- `lib/progression/ledger.ts`
- `lib/pwa/messages.ts`
- `lib/pwa/release.ts`
- `lib/pwa/use-updates.ts`
- `lib/pwa/worker-source.ts`
- `next.config.ts`
- `package-lock.json`
- `package.json`
- `public/notifications-sw.js`
- `scripts/generate-release.mjs`
- `scripts/generate-vapid.mjs`
- `scripts/migrate-postgres.mjs`
- `tests/notifications.test.mjs`
- `tests/progression.test.mjs`
- `tests/vercel-storage.test.mjs`
- `vercel.json`

## Completed validation

- TypeScript: `npm run typecheck` passed.
- Lint: `npm run lint` passed with zero errors and 97 warnings in legacy files; the new notification/PWA modules pass their strict lint rules.
- Automated tests: all 28 passed (10 ride-system, 1 PostgreSQL/auth/API integration, 8 progression/Ridey, 9 notification/PWA tests).
- Production: `npm run build` passed on Next.js 16.3.4; new APIs are dynamic Node/server routes.
- Built-app HTTP smoke checks passed for authenticated page/map/profile/Ridey rendering, existing record preservation, progression, unconfigured Ridey, weather, routing, newest-first inbox, mark-all-read, generated worker/release matching, unconfigured push and rejected unauthorized dispatch.
- `.next/static` scan passed for private VAPID/cron/AI environment names and deliberately injected fake secret values. No private secret appeared in browser JavaScript.
- No production database migration, real push delivery, physical-device validation or Vercel environment/deployment change was performed. Configure/deploy and run the device checks above to make closed-phone delivery live.
