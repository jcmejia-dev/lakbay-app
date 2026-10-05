# Lakbay — Your riding companion

Lakbay is a mobile-first motorcycle riding companion for everyday trips and longer rides. It is built around a full-screen map and a calm, minimal interface.

## What is included

- GPS ride recording with distance, elapsed time, route history, and GPX export
- Route planning with a highlighted route line, turn guidance, saved trips, and a travel album
- Nearby fuel stations and shops/repair places shown with distinct map icons
- Weather and nearby information, placed in dedicated controls to keep the map readable
- Google sign-in, rider profile customization, and per-account ride data
- Ride badges, motorcycle garage, odometer estimate, and maintenance reminders
- Offline caching for saved rides, places, routes, and turn instructions, with queued sync when connectivity returns
- Lakbay logo reveal, animated loading wheel, notification center, theme/map preferences, and installable PWA assets

Keep the app open and the screen awake while recording. If the app goes offline, saved ride and place data can queue for sync; map tiles and first-time sign-in still need internet access.

## Stack

- Next.js-compatible app running through Vinext
- React 19 and TypeScript
- Cloudflare Workers with D1 for account-owned records and R2 for profile avatars
- Leaflet maps with OpenStreetMap data
- PWA manifest, service worker, and Android asset links

## Run locally

Requirements: Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Open the local URL printed by the dev server. To make a production build:

```sh
npm run build
npm run start
```

The Worker expects Cloudflare bindings named `DB` (D1) and `AVATARS` (R2). Set these up in the Cloudflare Worker configuration for a deployed environment.

## Google sign-in setup

Create a Google OAuth client of type **Web application**. Set the authorized JavaScript origin to your deployed Lakbay origin, for example `https://lakbay.example.com`. Set the redirect URI to:

```
https://YOUR-LAKBAY-DOMAIN/api/auth/google/callback
```

Use that exact deployed host for both Google OAuth settings. In Cloudflare Worker settings, add `GOOGLE_CLIENT_ID` as a variable and store `GOOGLE_CLIENT_SECRET` and `AUTH_SESSION_SECRET` as secrets. See [Google account setup](docs/ACCOUNT-SETUP.md). Never commit secret values.

## Project source note

This GitHub import uses the latest complete source checkout available in this workspace: Lakbay Site source version 14, commit `f4cef008eccdd0b9ed245fa8f984ddeafa544764`. The live Site reports version 17, but versions 15–17 were not present in the available source checkout, so this repository has not been verified as a byte-for-byte copy of the live version. The imported source builds successfully with `npm run build`.

## License

No license has been added yet. Contact the project owner before reusing or redistributing this code.
