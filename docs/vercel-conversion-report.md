# Lakbay Vercel conversion report

1. Files changed

- .env.example
- .gitignore
- README.md
- app/api/auth/email/request/route.ts
- app/api/auth/email/verify/route.ts
- app/api/auth/google/callback/route.ts
- app/api/auth/google/route.ts
- app/api/auth/signout/route.ts
- app/api/avatar/route.ts
- app/api/records/route.ts
- app/layout.tsx
- app/page.tsx
- build/lakbay-worker.ts
- cloudflare-env.d.ts
- db/index.ts
- db/postgres/001_initial.sql
- db/schema.ts
- docs/ACCOUNT-SETUP.md
- docs/VERCEL.md
- drizzle.config.ts
- eslint.config.mjs
- lib/app-updates.ts
- lib/explore.ts
- lib/sql-database.ts
- lib/storage.ts
- next.config.ts
- package-lock.json
- package.json
- scripts/build-verified.sh
- scripts/execution-profile.mjs
- scripts/import-avatars.mjs
- scripts/import-d1.mjs
- scripts/install-ci.mjs
- scripts/install-ci.sh
- scripts/install-pnpm.sh
- scripts/migrate-postgres.mjs
- scripts/migration-records.mjs
- scripts/npm-install.mjs
- scripts/pnpm-install.mjs
- scripts/run-framework.mjs
- scripts/sites-env.mjs
- scripts/sites-env.sh
- tests/vercel-storage.test.mjs
- tsconfig.json
- vite.config.ts
- wrangler.jsonc
- docs/vercel-conversion-report.md (this report)

2. Packages removed

Vinext, Wrangler, @cloudflare/vite-plugin, @cloudflare/workers-types, @vitejs/plugin-react, @vitejs/plugin-rsc, react-server-dom-webpack and Vite were removed from the manifest/lockfile after a standard Next.js build passed. The Miniflare override and transitive Worker tooling are gone. Unused Worker entrypoints, bindings/config and legacy Sites/Vinext installation scripts were removed. Independent connector-preview tooling remains, so its json-rpc-2.0/raw-body dependencies remain. A fresh npm ci contains no Wrangler, Vinext, Miniflare or Cloudflare Vite package.

3. Packages added

pg for standard PostgreSQL connections; @types/pg and @electric-sql/pglite as development dependencies for typing and tests. Existing Next.js 16.3.4/React versions were preserved. No avatar/object-store SDK is needed.

4. Database choice

Neon PostgreSQL using its pooled DATABASE_URL is the documented deployment target. The standard pg adapter also accepts other PostgreSQL providers. It lazily creates a small connection pool and preserves the existing prepare/bind/first/all/run repository interface. No Neon account/database was created or live credentials accessed.

5. Migration

Additive, transactional PostgreSQL DDL preserves records(owner,id,kind,data,updated), service_cache and service_gate. Original JSON remains text and account IDs remain unchanged. A private avatars(key,body bytea) table stores the existing small JPEGs. db/schema.ts and Drizzle config now describe PostgreSQL; original D1 migrations are retained. Explicit migration/import scripts support D1 record JSON and exported R2 avatars. Reimports skip identical rows; conflicts roll back without overwriting. Live D1/R2 data was not touched or transferred. The guide covers backups, write-freeze, complete row counts, offline queues, validation and rollback.

6. Auth

Four auth handlers now read server process.env instead of cloudflare:workers. Google auth-code flow, state checks, callback origin checks, email-code hashes, PBKDF2 password records and database-backed sessions are preserved. HttpOnly/Secure/SameSite cookies survive refresh. Logout now constructs a mutable Node response so clearing cookies works. The Google callback is APP_BASE_URL + /api/auth/google/callback. Changing domains requires sign-in again because cookies/offline storage belong to the old browser origin.

7. APIs

All existing App Router endpoints build as native Next.js server routes. PostgreSQL parameterization retains business logic. Draft deletion now uses PostgreSQL JSON extraction. Service gating uses BIGINT for millisecond timestamps and returns text counters to preserve schema compatibility. Avatar endpoints keep authenticated private access and no-store responses. Open-Meteo/OSRM/Photon/POI requests, ETA, ratings, garage/fuel and notifications are preserved. A new release notice announces this conversion. No rewrites or vercel.json are needed. PWA assets/service worker remain intact.

8. Exact Vercel environment variable names

- DATABASE_URL
- APP_BASE_URL
- AUTH_SESSION_SECRET
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- RESEND_API_KEY
- EMAIL_FROM

DATABASE_URL is required for saved data. Set the public HTTPS origin in APP_BASE_URL. Google variables enable Google sign-in; Resend variables enable existing email signup/recovery. Preserve the old auth secret during migration. All variables are server-only, with blank .env.example placeholders. There is no NEXT_PUBLIC secret, D1 binding or Blob/R2 credential requirement.

9. Vercel settings

Framework: Next.js. Root: ./. Install: npm install. Build: npm run build. Output: default. Production branch: main. Node: 22.x (>=22.13). Set Production and Preview variables separately, preferably using a separate preview database. See docs/VERCEL.md for the full setup.

10. Cloudflare support

The previous Worker build does not run from main anymore. Its implementation is available in Git history and D1 migrations remain. Future Cloudflare support requires an appropriate standard Next.js adapter/database connection. Vercel now works independently of Cloudflare.

11. Validation

- Fresh npm ci in an isolated directory passed, without local secrets or old Worker packages.
- Standard npm run build / next build passed, both in the project and fresh install, with every API route included. No database connection is needed at build time.
- npx tsc --noEmit --incremental false passed.
- npm test passed 11 tests: 10 ride/weather/fuel/navigation/profile checks plus a PostgreSQL integration test using PGlite's actual PostgreSQL engine through the production SQL adapter. It covers schema/import preservation and rollback, signup/password login, simulated Google callback/account linking, sessions, logout, protected records, ratings, vehicles, profiles, private avatars, saved places/trips, external-service adapters and caching.
- Production Next server at a 390x844 browser viewport passed auth interaction, no pre-auth loader, overflow, PWA/map-library assets, unauthorized API protection, missing-Google-config response and logout. No page runtime errors.
- npm run lint ran: existing 74 errors and 20 warnings remain; no additional application diagnostics were introduced. Generated scratch/build output and vendored Leaflet are excluded. Rules were not relaxed.
- git diff --check passed.

12. Manual configuration still required

Create/connect the Neon database, set variables, run db:migrate, import complete D1 JSON and R2 photos, and register the new exact Google OAuth callback/origin. Configure a verified Resend sender. Import/deploy the GitHub main branch in Vercel and test real Google/Resend credentials and physical-device GPS. These external services were simulated in tests; no live Vercel deployment or data cutover was performed. Map/routing remains without live traffic, as before. Store updates still require published app listings; Update app remains a reload of the deployed web build.

See [deployment and migration guide](VERCEL.md). Provider references: [Next.js on Vercel](https://vercel.com/docs/frameworks/full-stack/nextjs) and [node-postgres pooling](https://node-postgres.com/apis/pool).
