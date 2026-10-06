import {createHash,createECDH,ECDH,timingSafeEqual} from 'node:crypto';
import webpush from 'web-push';
import {z} from 'zod';
import {database,transaction} from '../storage';
import {inboxState,readNotices,reconcileNotifications} from './repository';
import {unreadCount,type RideNotice} from './types';

const endpoint=z.string().max(2048).url().refine(value=>{
  try{const url=new URL(value);return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(url.hostname==='fcm.googleapis.com'||url.hostname==='updates.push.services.mozilla.com'||url.hostname.endsWith('.push.services.mozilla.com')||url.hostname.endsWith('.push.apple.com')||url.hostname.endsWith('.notify.windows.com'));}catch{return false;}
},'Unsupported push endpoint');
const key=(length:number)=>z.string().regex(/^[A-Za-z0-9_-]+={0,2}$/).refine(s=>Buffer.from(s,'base64url').length===length);
export const subscriptionSchema=z.object({endpoint,keys:z.object({p256dh:key(65).refine(s=>{try{ECDH.convertKey(Buffer.from(s,'base64url'),'prime256v1');return Buffer.from(s,'base64url')[0]===4;}catch{return false;}}),auth:key(16)})});
export function subscriptionId(endpoint:string){return createHash('sha256').update(endpoint).digest('hex');}
export function vapidConfiguration(){
  const publicKey=process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,privateKey=process.env.VAPID_PRIVATE_KEY,subject=process.env.VAPID_SUBJECT;
  if(!publicKey||!privateKey||!subject||!(/^(mailto:|https:\/\/)/.test(subject)))return null;
  try{const ecdh=createECDH('prime256v1');ecdh.setPrivateKey(Buffer.from(privateKey,'base64url'));const expected=ecdh.getPublicKey(),actual=Buffer.from(publicKey,'base64url');if(actual.length!==expected.length||!timingSafeEqual(actual,expected))return null;return{publicKey,privateKey,subject};}catch{return null;}
}
export function cronAuthorized(req:Request){const secret=process.env.CRON_SECRET;if(!secret||secret.length<32)return false;const expected=Buffer.from(`Bearer ${secret}`),actual=Buffer.from(req.headers.get('authorization')||'');return expected.length===actual.length&&timingSafeEqual(expected,actual);}
export async function saveSubscription(owner:string,value:unknown){
  const subscription=subscriptionSchema.parse(value),id=subscriptionId(subscription.endpoint),now=Date.now();
  await transaction(owner,async db=>{
    await db.prepare('SELECT pg_advisory_xact_lock(hashtextextended(?, 0))').bind('push-device:'+id).run();
    // A browser endpoint belongs to its current signed-in account only.
    const previous=await db.prepare('SELECT owner FROM push_subscriptions WHERE id=?').bind(id).first<{owner:string}>();
    if(previous&&previous.owner!==owner)await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(id).run();
    await db.prepare('INSERT INTO push_subscriptions(id,owner,endpoint,p256dh,auth,created_at,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,updated_at=excluded.updated_at').bind(id,owner,subscription.endpoint,subscription.keys.p256dh,subscription.keys.auth,now,now).run();
    await db.prepare('DELETE FROM push_subscriptions WHERE owner=? AND id NOT IN (SELECT id FROM push_subscriptions WHERE owner=? ORDER BY updated_at DESC,id LIMIT 10)').bind(owner,owner).run();
  });return id;
}
export async function deliverPending(limit=40){
  const config=vapidConfiguration();if(!config)return {configured:false,sent:0,expired:0,failed:0};
  const db=database(),now=Date.now();
  // Queue only recent events for devices already subscribed when the event occurred.
  await db.prepare(`INSERT INTO push_deliveries(subscription_id,owner,notification_id)
    SELECT s.id,s.owner,n.id FROM push_subscriptions s JOIN notifications n ON n.owner=s.owner
    JOIN records r ON r.owner=s.owner AND r.id='inbox' AND r.kind='inbox'
    WHERE n.push=true AND n.created_at>=s.created_at AND n.created_at>? AND (r.data::jsonb->>'browser')='true'
    ON CONFLICT(subscription_id,notification_id) DO NOTHING`).bind(now-7*86400000).run();
  const pending=await db.prepare(`SELECT d.subscription_id,d.owner,d.notification_id,d.attempts,s.endpoint,s.p256dh,s.auth,n.data
    FROM push_deliveries d JOIN push_subscriptions s ON s.id=d.subscription_id AND s.owner=d.owner JOIN notifications n ON n.owner=d.owner AND n.id=d.notification_id
    WHERE d.delivered_at IS NULL AND d.next_at<=? AND d.attempts<6 ORDER BY n.sent_at DESC LIMIT ?`).bind(now,limit).all<{subscription_id:string;owner:string;notification_id:string;attempts:number;endpoint:string;p256dh:string;auth:string;data:string}>();
  let sent=0,expired=0,failed=0;
  const send=async(row:typeof pending.results[number])=>{
    const lease=await db.prepare('UPDATE push_deliveries SET attempts=attempts+1,next_at=? WHERE subscription_id=? AND notification_id=? AND delivered_at IS NULL AND next_at<=? RETURNING notification_id').bind(now+120000,row.subscription_id,row.notification_id,now).all();if(!lease.results.length)return;
    const state=await inboxState(db,row.owner);const notice=JSON.parse(row.data) as RideNotice;
    // A completed maintenance cycle must not emit an old reminder.
    let obsolete=false;
    if(notice.kind==='service'){const current=await db.prepare("SELECT data FROM records WHERE owner=? AND kind='service'").bind(row.owner).all<{data:string}>();obsolete=!current.results.some(r=>{const s=JSON.parse(r.data);const base=`service:${s.id}:${s.last}:${s.interval}`;return base===notice.id||base+':due'===notice.id;});}
    if(!state.browser||state.read.includes(notice.id)||obsolete){await db.prepare('UPDATE push_deliveries SET delivered_at=? WHERE subscription_id=? AND notification_id=?').bind(now,row.subscription_id,row.notification_id).run();return;}
    try{
      // Do not log provider errors: they may contain subscription keys/endpoints.
      await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify({id:notice.id,title:notice.title,body:notice.body,tab:notice.tab,unreadCount:unreadCount(await readNotices(db,row.owner),state.read)}),{vapidDetails:config,TTL:86400,timeout:4000,urgency:'normal'});
      await db.prepare('UPDATE push_deliveries SET delivered_at=? WHERE subscription_id=? AND notification_id=?').bind(Date.now(),row.subscription_id,row.notification_id).run();sent++;
    }catch(error){const code=(error as {statusCode?:number}).statusCode;if(code===404||code===410){await db.prepare('DELETE FROM push_subscriptions WHERE id=?').bind(row.subscription_id).run();expired++;}else{await db.prepare('UPDATE push_deliveries SET next_at=? WHERE subscription_id=? AND notification_id=?').bind(Date.now()+Math.min(86400000,300000*2**row.attempts),row.subscription_id,row.notification_id).run();failed++;}}
  }
  let cursor=0;const deadline=Date.now()+30000;
  await Promise.all(Array.from({length:4},async()=>{while(cursor<pending.results.length&&Date.now()<deadline){const row=pending.results[cursor++];await send(row);}}));
  await db.prepare('DELETE FROM push_deliveries WHERE delivered_at<? OR (attempts>=6 AND next_at<?)').bind(now-7*86400000,now-7*86400000).run();
  return {configured:true,sent,expired,failed};
}
export async function backgroundSweep(){
  if(!vapidConfiguration())return {configured:false};
  const db=database(),deadline=Date.now()+15000;
  const checkpoint=await db.prepare("SELECT data FROM service_cache WHERE key='push:sweep-cursor'").first<{data:string}>();
  const previous=checkpoint?.data||'';
  let owners=await db.prepare('SELECT DISTINCT owner FROM push_subscriptions WHERE owner>? ORDER BY owner LIMIT 100').bind(previous).all<{owner:string}>();
  if(!owners.results.length)owners=await db.prepare('SELECT DISTINCT owner FROM push_subscriptions ORDER BY owner LIMIT 100').all<{owner:string}>();
  let last='';for(const {owner} of owners.results){if(Date.now()>deadline)break;await transaction(owner,db=>reconcileNotifications(db,owner));last=owner;}
  if(last)await db.prepare("INSERT INTO service_cache(key,data,expires) VALUES('push:sweep-cursor',?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,expires=excluded.expires").bind(last,new Date(Date.now()+365*86400000).toISOString()).run();
  await db.prepare('DELETE FROM push_subscriptions WHERE updated_at<?').bind(Date.now()-180*86400000).run();
  return deliverPending();
}
