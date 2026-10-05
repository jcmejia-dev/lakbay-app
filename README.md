# Lakbay — Your riding companion

Lakbay is a mobile-first motorcycle riding companion for everyday trips and longer rides. This repository is the app source of truth and is configured for Cloudflare Workers.

## App features

- GPS ride recording, distance, elapsed time, ride history, and GPX export
- Route planning with highlighted directions and saved trips
- Nearby fuel stations and motorcycle shops/repair places on the map
- Weather along the route
- Email and Lakbay-password accounts with email verification and password recovery
- Optional Google sign-in, rider profiles, and account-owned ride data
- Badges, motorcycle garage, maintenance reminders, and notifications
- Offline caching for saved routes and ride data, with sync when online
- Installable PWA assets and animated Lakbay loading screen

Ride recording needs location permission and an active app tab. Offline mode keeps saved information and queued changes; map tiles, fresh routes, weather, and first-time sign-in need internet access.

## Stack

- React 19, TypeScript, Next.js-compatible routes through Vinext
- Cloudflare Workers and the Cloudflare Vite plugin
- Cloudflare D1 for account data and Cloudflare R2 for profile photos
- Leaflet and OpenStreetMap data

## Run locally

Requirements: Node.js `>=22.13.0`.

```sh
npm ci
npm run dev
```

The app expects Cloudflare bindings named `DB` and `AVATARS`. `wrangler.jsonc` contains the binding names; replace the sample D1 ID with your D1 database ID. Then create the local tables and start the app:

```sh
npm run db:migrate:local
npm run dev
```

Build and preview the Worker locally:

```sh
npm run build
npm start
```

## Cloudflare setup

Create a Cloudflare Worker connected to this GitHub repository, create a D1 database named `lakbay-db` and an R2 bucket named `lakbay-avatars`, then bind them as `DB` and `AVATARS`. Set the D1 ID in `wrangler.jsonc` and apply the migrations with `npm run db:migrate:remote`. See [deployment and account setup](docs/ACCOUNT-SETUP.md) for OAuth and email settings.

Never commit secrets. Google sign-in uses OAuth authorization code flow, with the callback generated from the configured app origin. Email/password account verification and password recovery need an email delivery provider; this project currently supports Resend.

## Source note

This repository is the source of truth for Lakbay development. Push changes to the configured GitHub branch to deploy through Cloudflare Workers.

## License

No license has been added yet. Contact the project owner before reusing or redistributing this code.
