# Lakbay deployment and account setup

## 1. Connect the GitHub project to Cloudflare

Use the Cloudflare Worker build connected to `potatolover-69/lakbay-app`. Set the build command to `npm run build` and the deploy command to `npx wrangler deploy --config dist/server/wrangler.json` (or use `npm run deploy` for a manual deployment). The app is a full-stack Worker, so it needs Workers rather than a static Pages-only deployment.

After the first deployment, copy its HTTPS `workers.dev` address. You can attach a custom domain later; the free `workers.dev` hostname is enough to test the OAuth setup.

## 2. Configure the database and profile-photo storage

1. Create a Cloudflare D1 database named `lakbay-db`.
2. Create an R2 bucket named `lakbay-avatars`.
3. Copy the D1 database ID into `database_id` in `wrangler.jsonc`. Keep the binding name `DB` and the R2 binding name `AVATARS`.
4. Run `npm run db:migrate:remote` once to create Lakbay's `records`, `service_cache`, and `service_gate` tables in D1.

D1 stores rider accounts, profiles, saved places, rides, route data, preferences, and auth sessions. The browser also uses IndexedDB for offline copies and queues; D1 is the server-side account store. R2 stores profile photos. Do not commit database credentials or OAuth secrets.

## 3. Set Cloudflare Worker variables and secrets

Add these values to the Worker. `APP_BASE_URL` must be the public HTTPS origin riders use to open the app, with no trailing slash.

| Name | Cloudflare setting | Value |
| --- | --- | --- |
| `APP_BASE_URL` | Variable | Your deployed origin, e.g. `https://lakbay-motorcycle-app.<account>.workers.dev` |
| `GOOGLE_CLIENT_ID` | Variable | OAuth client ID from Google Cloud |
| `GOOGLE_CLIENT_SECRET` | Secret | OAuth client secret from Google Cloud |
| `AUTH_SESSION_SECRET` | Secret | Random value with at least 32 bytes of entropy |
| `RESEND_API_KEY` | Secret | Resend API key for verification and password-reset email |
| `EMAIL_FROM` | Variable | Verified sender, e.g. `Lakbay <login@your-verified-domain>` |

Generate the session secret locally with:

```sh
openssl rand -base64 32
```

Email/password accounts use a custom Lakbay password, never the user's Google password. The code stores password hashes, not plain-text passwords. Resend is used to send email verification codes and password-reset codes. Google account password recovery remains with Google.

## 4. Configure Google OAuth to match the deployed Worker

In Google Cloud Console, open the **Web application** OAuth client used by Lakbay.

Set **Authorized JavaScript origins** to the exact `APP_BASE_URL`, for example:

```text
https://lakbay-motorcycle-app.<account>.workers.dev
```

Set **Authorized redirect URIs** to that same host plus the callback path:

```text
https://lakbay-motorcycle-app.<account>.workers.dev/api/auth/google/callback
```

Replace `<account>` with the actual Workers subdomain. These values must match `APP_BASE_URL` exactly: use `https`, the same hostname, and no trailing slash in the origin. Remove any origins and callback entries that belong to a different deployment. After attaching a custom domain, add its origin and callback too, then update `APP_BASE_URL` to the custom domain.

If the OAuth consent screen is still in testing mode, add your testing Google accounts as test users. Redeploy the Worker after changing its variables or secrets.

## 5. Deployment changes

Cloudflare builds from the GitHub branch you connect. Pushing an app change to that branch triggers the configured build and deployment. The Worker serves the app from its own origin; it does not send riders to the previous Site URL.

To run locally, create a `.dev.vars` file (do not commit it) with the same development-only values. Set `APP_BASE_URL` to the local origin only when testing callbacks locally. Use the Cloudflare OAuth origin and callback during production.

## Offline behavior

Rides, saved places, saved route geometry, and turn instructions are cached in IndexedDB under the signed-in account key. Changes made offline queue locally and sync when internet returns. Previously saved route guidance can be viewed offline, but map tiles, fresh routes, weather, and first-time sign-in still require internet.
