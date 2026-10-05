# Lakbay account sign-in setup

Lakbay uses Google OAuth for new sign-ins and account creation. Sign-in and sign-up use the same Google flow; Lakbay does not collect or store Google passwords. Password recovery is handled by Google at <https://accounts.google.com/signin/recovery>.

## Google sign-in

1. In Google Cloud Console, create an OAuth client with application type **Web application**.
2. Add this authorized JavaScript origin:

   `https://lakbay-ride-jc.zxcjcmejia.chatgpt.site`

3. Add this authorized redirect URI:

   `https://lakbay-ride-jc.zxcjcmejia.chatgpt.site/api/auth/google/callback`

4. Add `GOOGLE_CLIENT_ID` as a Site runtime variable and `GOOGLE_CLIENT_SECRET` as a private Site runtime secret.

## Session secret

Add `AUTH_SESSION_SECRET` as a private Site runtime secret. Generate a random value with at least 32 bytes of entropy, for example:

```sh
openssl rand -base64 32
```

Never commit these values to the source repository or paste them into public messages. Enter them only in the Site's secret settings. After setting the variables, deploy the latest saved Site version again so the Worker receives the new environment revision.

## Offline behavior

Ride records, saved places, saved route geometry, and turn instructions are cached in IndexedDB under the signed-in account key. Changes made while the app is online sync to D1; saves made after the connection drops queue locally and sync on reconnection. Offline routing can show a route saved earlier, but the current OpenStreetMap tile source does not provide offline map downloads. A fresh sign-in still requires an internet connection.
