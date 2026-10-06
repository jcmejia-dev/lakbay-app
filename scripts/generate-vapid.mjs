import webpush from 'web-push';
import {writeFile} from 'node:fs/promises';
const keys=webpush.generateVAPIDKeys();
await writeFile(new URL('../.env.push.local',import.meta.url),`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=mailto:replace-with-your-support-address@example.com\n`,{flag:'wx',mode:0o600});
console.log('Keys saved to ignored .env.push.local. Copy them into Vercel environment settings; replace VAPID_SUBJECT. Keep this file private. Existing keys were not overwritten.');
