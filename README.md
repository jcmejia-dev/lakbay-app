# Lakbay — Your riding companion

Lakbay is a mobile-first motorcycle riding companion. This repository is the source of truth and now runs on standard Next.js with PostgreSQL storage, ready for Vercel.

Features include GPS ride recording/history/GPX export, route planning and alternatives, saved places/trips, nearby fuel and repair shops, estimated arrival/weather, vehicles/fuel estimates, arrival ratings, Google and verified email/password accounts, private profile photos, notifications, maintenance, existing badges and offline record queues. GPS recording needs permission and an active app tab; new map/weather/routes and authentication need internet.

## Run locally

Node.js >=22.13 is required. Copy .env.example to .env.local and set the server variables. Then:

```sh
npm ci
npm run db:migrate
npm run dev
```

Dev runs at http://localhost:5173. Build and serve with npm run build and npm start. Run npm test, npm run typecheck and npm run lint for validation. Existing lint debt is reported in the conversion report.

## Vercel

Import this repository with Framework Next.js, root ./, install npm install, and build npm run build. Leave Output Directory at its default. Follow [Vercel setup and safe D1/R2 migration](docs/VERCEL.md) for the exact environment variables, OAuth callback and database import instructions. Migrate existing data before cutover; do not point the new app at an empty database and assume Cloudflare records have moved.

No Worker runtime or Wrangler is required. Original D1 migrations remain in drizzle/; PostgreSQL migrations are in db/postgres/. Small private avatar photos use the same PostgreSQL database. UI, maps, PWA assets and ride features are preserved.

Notification/PWA configuration and background-delivery limits are documented in [Job 3.1](docs/job-3-1.md). Enable phone alerts only after configuring VAPID and running the additive migration.

## License

See the repository's license files.
