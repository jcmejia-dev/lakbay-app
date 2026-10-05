# Deploy Lakbay on Vercel

## Project settings

- Framework preset: Next.js
- Root directory: ./
- Install command: npm install (lockfile is committed; npm ci also works)
- Build command: npm run build
- Output directory: leave the Next.js default
- Production branch: main
- Node.js: 22.x, at least 22.13

No vercel.json, Wrangler, Workers binding or Cloudflare account is needed to build/run this app. The build does not connect to the database or apply migrations.

## Server environment variables

Use Vercel project Settings > Environment Variables. Set values for Production and separately for any Preview environment you want to test. Never prefix these with NEXT_PUBLIC_. Local development uses .env.local; see .env.example.

| Variable | Purpose |
| --- | --- |
| DATABASE_URL | Required. Neon pooled PostgreSQL connection string including the provider's TLS settings. Standard PostgreSQL providers also work. |
| APP_BASE_URL | Set to the exact public HTTPS origin, such as your assigned Vercel domain; no trailing path. Google start and callback must use this same origin. Locally use http://localhost:5173. |
| AUTH_SESSION_SECRET | Preserve the existing secret when migrating. Used to hash email verification codes; if new, generate a random secret of at least 32 bytes. |
| GOOGLE_CLIENT_ID | Existing Google OAuth web client ID, needed for Google sign-in. |
| GOOGLE_CLIENT_SECRET | Existing Google OAuth web client secret, server only. |
| RESEND_API_KEY | Existing Resend API key, needed for email signup and password recovery. |
| EMAIL_FROM | Verified Resend sender, for example Lakbay <you@your-verified-domain>. |

No Blob, R2 or D1 variable is needed. Avatar JPEGs (at most 150 KB) live in a private PostgreSQL bytea table and are served through the authenticated /api/avatar route.

Use a separate database/Neon branch for Preview. Do not point untrusted preview code at production user data. Google callback origins must be registered explicitly for preview URLs as well; a production APP_BASE_URL will deliberately reject a callback arriving on a different host.

## Database setup

Create a Neon PostgreSQL project and copy its pooled connection URL into DATABASE_URL. No provider resource was created by this code change. With that same variable set locally or in a secure terminal:

```sh
npm ci
npm run db:migrate
```

The migration is additive and idempotent: records, service_cache, service_gate and avatars are created only if missing. It uses a transaction and advisory lock; it never wipes data. Original D1 SQL migrations remain under drizzle/ for export reference. New PostgreSQL DDL is db/postgres/001_initial.sql. The JSON records remain text with the original owner/id primary key. All auth, rides, profiles, preferences, inbox, garage, ratings, places, trips and progression records keep their original JSON.

## Existing D1 and R2 migration

Do this before sending existing users to Vercel. The repository conversion does not move or delete your live Cloudflare data.

1. Keep a full D1 SQL backup using the Cloudflare dashboard or an external Wrangler CLI: npx wrangler@4 d1 export <DATABASE_NAME> --remote --output=<PRIVATE_BACKUP.sql>. Back up R2 avatars too. Keep backups outside Git; they contain private user/session data.
2. Pause writes on the old app for the final snapshot. Otherwise rides written after export will not be present on Vercel. Keep the old database for rollback.
3. Export every record as JSON through npx wrangler@4 d1 execute <DATABASE_NAME> --remote --command="SELECT owner,id,kind,data,updated FROM records ORDER BY owner,id" --json and save its JSON output to a private file. The importer accepts Wrangler's array of results or a plain array of rows. Check the exported row count against SELECT COUNT(*) FROM records, plus counts grouped by kind. If the CLI truncates/paginates results, export complete batches and combine their result rows before import; do not proceed with a partial file.
4. Run npm run db:migrate on the new PostgreSQL database, then npm run db:import -- /absolute/path/records.json. Import preserves every JSON byte and owner/id. Identical records are skipped on rerun; a different target row causes the entire import to roll back. No overwrite mode is provided. Check counts grouped by kind and sample rides/profiles/password accounts before cutover. Service caches/gates are disposable and rebuild automatically.
5. Copy R2 objects to private local files using the dashboard or npx wrangler@4 r2 object get <BUCKET>/<KEY> --remote --file=<LOCAL_FILE>. Make manifest.json beside the files, for example [{"key":"avatars/google%3A123","file":"rider-123.jpg"}]. Keys must exactly match the old object keys (avatars/ plus encoded account ID). Run npm run db:import-avatars -- /absolute/path/manifest.json. Imports are transactional, never overwrite a conflicting photo and reject files outside the manifest directory. Preserve photoVersion in the imported rider record.
6. Preserve the existing AUTH_SESSION_SECRET, Google client and Resend settings. In Google Cloud Console, add the new authorized JavaScript origin and exact redirect URI https://<YOUR_DOMAIN>/api/auth/google/callback. Update APP_BASE_URL to that origin and redeploy Vercel after adding environment variables.
7. Test signup/login, existing Google/password accounts, saved rides, ratings, garage, profile photos and notification read state. Then switch traffic to Vercel. Changing hostnames requires signing in again: browser cookies and device-local offline queues do not automatically move between origins. Sync old-device queued records on the old origin before the final snapshot. Completed server data stays associated with the original account IDs.

Wrangler commands above are export tools only, not build dependencies. Migration/import commands are explicit operational actions and are not run during Vercel builds. Database credentials and access to the old D1/R2 account are needed to perform the actual transfer.

## Authentication and mobile behavior

The same authorization-code Google flow, database-backed opaque sessions and PBKDF2 password records are retained. Cookies remain HttpOnly, Secure, SameSite=Lax. Session records survive server restarts and refreshes. Auth reads server process.env. No credentials are embedded in client code. Logout uses a mutable Node-compatible redirect response to clear cookies.

Manifest, icons, notification service worker, GPS permissions, first-launch flag, offline record queues, avatar synchronization and mobile UI are unchanged. A release notice announces this runtime update. Update app remains a web reload test; store updates still need published listings. Install the PWA on the new HTTPS origin for phone testing. Google/Resend are simulated in automated tests; their real configuration must be checked after deployment.

## Cloudflare status

The old Worker deployment no longer runs from main. Its implementation/configuration remains in Git history, and original D1 migrations are preserved. A future Cloudflare deployment would need a standard Next.js-compatible adapter and a database connection implementation. Vercel is independent of Cloudflare.

Provider references: [Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs), [PostgreSQL pooling](https://node-postgres.com/apis/pool), [TLS connections](https://node-postgres.com/features/ssl).
