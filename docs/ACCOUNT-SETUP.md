# Lakbay account sign-in setup

Lakbay uses Google OAuth for account creation and sign-in. Both actions use the same Google flow. Lakbay does not collect or store Google passwords; password recovery is handled by Google.

## Google sign-in

1. In Google Cloud Console, create an OAuth client with application type **Web application**.
2. Add the origin of your deployed Lakbay app as an authorized JavaScript origin, for example:

   `https://lakbay.example.com`

3. Add this authorized redirect URI, replacing the host with your exact app domain:

   `https://YOUR-LAKBAY-DOMAIN/api/auth/google/callback`

4. In the Cloudflare Worker settings for the Lakbay deployment, add `GOOGLE_CLIENT_ID` as a variable. Store `GOOGLE_CLIENT_SECRET` and `AUTH_SESSION_SECRET` as encrypted secrets.
5. Set up the Worker bindings `DB` (Cloudflare D1) and `AVATARS` (Cloudflare R2).

The origin and callback host must match the domain people use to open Lakbay. Do not use a development or preview hostname for production sign-in.

Google password recovery: <https://accounts.google.com/signin/recovery>

## Session secret

Generate a random value with at least 32 bytes of entropy, then store it as the Cloudflare Worker secret `AUTH_SESSION_SECRET`:

```sh
openssl rand -base64 32
```

Never commit this value or paste it into public messages. After changing Worker variables or secrets, redeploy the Worker so it receives the new configuration.

## Offline behavior

Ride records, saved places, saved route geometry, and turn instructions are cached in IndexedDB under the signed-in account key. Changes made while online sync to D1; saves made after connectivity drops queue locally and sync when the connection returns. Offline routing can show a route saved earlier, but map tiles are not available offline. Signing in for the first time requires an internet connection.
