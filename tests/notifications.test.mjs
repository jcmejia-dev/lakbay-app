import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import Module,{createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import webpush from 'web-push';
const requireModule=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,...args);};
requireModule.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);
const {orderedNotices,sentTime,counterLabel,mergeRead,unreadCount}=requireModule('../lib/notifications/types.ts');
const {workerSource}=requireModule('../lib/pwa/worker-source.ts');
const notice=(id,time,kind='badge')=>({id,time,kind,title:'Safe milestone',body:'Ready for your next safe ride.',tab:'badges'});
test('newest first, stable IDs, no old update pinned; Manila dates include exact time',()=>{
  const items=orderedNotices([notice('old',1,'update'),notice('new',300),notice('middle',200),notice('new',300)]);
  assert.deepEqual(items.map(n=>n.id),['new','middle','old']);assert.equal(unreadCount(items,['middle']),2);
  const now=Date.parse('2026-10-06T08:00:00Z');assert.equal(sentTime(Date.parse('2026-10-06T06:45:00Z'),now),'Today · 2:45 PM');
  assert.equal(sentTime(Date.parse('2026-10-05T12:12:00Z'),now),'Yesterday · 8:12 PM');
  assert.equal(sentTime(Date.parse('2026-10-04T05:30:00Z'),now),'Oct 4 · 1:30 PM');
  assert.equal(sentTime(Date.parse('2026-10-05T16:30:00Z'),now),'Today · 12:30 AM');
  assert.equal(counterLabel(52),'52');assert.equal(counterLabel(100),'99+');assert.deepEqual(mergeRead(['a'],['b','a']),['a','b']);
});
test('build ID is generated from contents; repeated identical builds are not releases',()=>{
  execFileSync(process.execPath,['scripts/generate-release.mjs'],{cwd:root});const first=JSON.parse(fs.readFileSync(path.join(root,'lib/pwa/generated-release.json'),'utf8'));
  execFileSync(process.execPath,['scripts/generate-release.mjs'],{cwd:root});const second=JSON.parse(fs.readFileSync(path.join(root,'lib/pwa/generated-release.json'),'utf8'));assert.deepEqual(first,second);assert.match(first.id,/^[a-f0-9]{24}$/);assert.ok(Number.isFinite(first.time));assert.ok(workerSource(first.id).includes(first.id));
});
function workerHarness(){
  const handlers={},shown=[],messages=[],deleted=[],badges=[],ports=[];let skipped=0,opened='',fetchCalls=[];
  const client={id:'rider-window',url:'https://lakbay.test/',focus:async()=>client,postMessage:data=>messages.push(data)};
  const context={URL,Uint8Array,atob,crypto:{randomUUID:()=> 'request-id'},setTimeout:fn=>{queueMicrotask(fn);return 1;},fetch:async(url,options)=>{fetchCalls.push({url,options});return Response.json({unreadCount:0});},caches:{keys:async()=>['lakbay-app-old','lakbay-app-version','other-app-cache'],delete:async name=>deleted.push(name)},self:{location:{origin:'https://lakbay.test'},navigator:{setAppBadge:async n=>badges.push(n),clearAppBadge:async()=>badges.push(0)},clients:{matchAll:async()=>[client],claim:async()=>{},openWindow:async url=>{opened=url;}},registration:{showNotification:async(...args)=>shown.push(args),pushManager:{subscribe:async()=>({endpoint:'safe'})}},skipWaiting:async()=>{skipped++;},addEventListener:(type,fn)=>handlers[type]=fn}};
  vm.runInNewContext(workerSource('version'),context);
  const emit=async(type,data={})=>{let pending;handlers[type]({...data,waitUntil:p=>pending=p});if(pending)await pending;};
  return {context,handlers,shown,messages,deleted,badges,ports,client,emit,get skipped(){return skipped;},get opened(){return opened;},get fetchCalls(){return fetchCalls;}};
}
test('worker shows one logical push, updates badge, safely opens the requested section',async()=>{
  const h=workerHarness();await h.emit('push',{data:{json:()=>({...notice('achievement:first-ride',1),unreadCount:52})}});
  assert.equal(h.shown.length,1);assert.equal(h.shown[0][0],'Lakbay · Safe milestone');assert.equal(h.shown[0][1].tag,'achievement:first-ride');assert.equal(h.shown[0][1].renotify,false);assert.deepEqual(h.badges,[0]);assert.equal(h.messages[0].type,'LAKBAY_PUSH');
  let closed=false;await h.emit('notificationclick',{notification:{close:()=>closed=true,data:{id:'achievement:first-ride',tab:'badges',url:'https://evil.test/'}}});assert.ok(closed);assert.equal(h.opened,'');assert.equal(h.messages.at(-1).tab,'badges');assert.deepEqual(JSON.parse(h.fetchCalls.at(-1).options.body),{read:['achievement:first-ride']});
  h.context.self.clients.matchAll=async()=>[];await h.emit('notificationclick',{notification:{close:()=>{},data:{id:'x',tab:'https://evil.test/'}}});assert.equal(h.opened,'/?view=notifications&notification=x');
  await h.emit('message',{data:{type:'SET_BADGE',count:52}});await h.emit('message',{data:{type:'SET_BADGE',count:0}});assert.deepEqual(h.badges.slice(-2),[52,0]);
});
test('worker waits for consent and all ride windows, removes only obsolete app caches',async()=>{
  const h=workerHarness();await h.emit('install');assert.equal(h.skipped,0);
  let reply;await h.emit('message',{data:{type:'ACTIVATE_UPDATE'},ports:[{postMessage:v=>reply=v}]});assert.equal(reply.ok,false);assert.equal(h.skipped,0);
  h.client.postMessage=data=>{if(data.type==='PREPARE_UPDATE')h.handlers.message({data:{type:'UPDATE_READY',requestId:data.requestId,safe:true},source:{id:h.client.id}});};
  await h.emit('message',{data:{type:'ACTIVATE_UPDATE'},ports:[{postMessage:v=>reply=v}]});assert.equal(reply.ok,true);assert.equal(h.skipped,1);
  await h.emit('activate');assert.deepEqual(h.deleted,['lakbay-app-old']);assert.ok(!workerSource('version').includes('indexedDB.deleteDatabase'));assert.ok(!workerSource('version').includes('localStorage.clear'));
});
test('worker renewal handles signed-out/unavailable state without breaking delivery',async()=>{
  const h=workerHarness();h.context.fetch=async()=>Response.json({configured:false});await h.emit('pushsubscriptionchange');assert.equal(h.messages.at(-1).type,'LAKBAY_PUSH_RECOVERY');
  let stored=false;h.context.fetch=async(url)=>{if(url==='/api/push/config')return Response.json({configured:true,publicKey:Buffer.alloc(65,1).toString('base64url')});stored=true;return Response.json({ok:true});};await h.emit('pushsubscriptionchange');assert.ok(stored);
});
test('PostgreSQL migrations preserve records; subscriptions, shared read state, queue dedup and expiry',async()=>{
  const db=new PGlite(),schemaFiles=['001_initial.sql','002_progression.sql','003_notifications.sql'];for(const file of schemaFiles)await db.exec(fs.readFileSync(path.join(root,'db/postgres',file),'utf8'));
  requireModule.cache[requireModule.resolve('pg')]={exports:{Pool:class{on(){}query(sql,values){return db.query(sql,values);}async connect(){return {query:(sql,values)=>sql.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(sql,values),release(){}};}}}};
  requireModule.cache[requireModule.resolve('next/server')]={exports:{after:()=>{}}};
  const previousEnv={...process.env},originalSend=webpush.sendNotification;const keys=webpush.generateVAPIDKeys();Object.assign(process.env,{DATABASE_URL:'postgresql://fixture.invalid/test',NEXT_PUBLIC_VAPID_PUBLIC_KEY:keys.publicKey,VAPID_PRIVATE_KEY:keys.privateKey,VAPID_SUBJECT:'mailto:test@example.test',CRON_SECRET:'test-only-32-character-cron-secret'});
  const push=requireModule('../lib/notifications/push.ts'),repo=requireModule('../lib/notifications/repository.ts'),{database}=requireModule('../lib/storage.ts'),auth=requireModule('../lib/account-auth.ts');
  const inbox=requireModule('../app/api/notifications/route.ts'),subscriptions=requireModule('../app/api/push/subscriptions/route.ts'),dispatch=requireModule('../app/api/push/dispatch/route.ts'),config=requireModule('../app/api/push/config/route.ts');
  const subscription=n=>({endpoint:'https://fcm.googleapis.com/fcm/send/device-'+n,keys:{p256dh:keys.publicKey,auth:Buffer.alloc(16,n).toString('base64url')}});
  const request=(route,body,cookie='',method='POST')=>new Request('https://lakbay.test'+route,{method,headers:{Origin:'https://lakbay.test',Cookie:cookie,'Content-Type':'application/json'},...(method==='POST'||method==='DELETE'?{body:JSON.stringify(body)}:{})});
  const owner='rider';let sent=[];webpush.sendNotification=async(sub,data,options)=>{assert.ok(options.vapidDetails.privateKey);sent.push({sub,data:JSON.parse(data)});return {statusCode:201};};
  try{
    const save=async(id,kind,data)=>db.query('INSERT INTO records(owner,id,kind,data,updated) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data',[owner,id,kind,JSON.stringify(data),new Date().toISOString()]);
    await save('rider','rider',{name:'Existing rider'});await save('inbox','inbox',{read:['old'],browser:true});await save('old-ride','ride',{id:'old-ride',name:'Old ride',type:'commute',status:'complete',started:1,distance:3,seconds:60,points:[]});
    for(const file of schemaFiles)await db.exec(fs.readFileSync(path.join(root,'db/postgres',file),'utf8'));assert.equal((await db.query("SELECT data FROM records WHERE id='old-ride'")).rows.length,1);
    await auth.saveAuthRecord('user:'+owner,'auth-user',{id:owner,name:'Rider',email:'fixture@example.test',provider:'google'});const cookie=auth.sessionCookie(await auth.createSession(owner)).split(';')[0];
    assert.equal((await subscriptions.POST(request('/api/push/subscriptions',subscription(1)))).status,401);
    assert.equal((await subscriptions.POST(request('/api/push/subscriptions',subscription(1),cookie))).status,200);assert.equal((await subscriptions.POST(request('/api/push/subscriptions',subscription(2),cookie))).status,200);
    await push.saveSubscription(owner,subscription(1));assert.equal((await db.query('SELECT * FROM push_subscriptions')).rows.length,2);
    const device=requireModule('../app/api/push/device/route.ts'),testAlert=requireModule('../app/api/push/test/route.ts');
    assert.equal((await testAlert.POST(request('/api/push/test',{endpoint:subscription(1).endpoint}))).status,401);
    assert.equal((await testAlert.POST(new Request('https://lakbay.test/api/push/test',{method:'POST',headers:{Origin:'https://evil.test',Cookie:cookie},body:JSON.stringify({endpoint:subscription(1).endpoint})}))).status,403);
    assert.deepEqual(await (await device.POST(request('/api/push/device',{endpoint:subscription(1).endpoint},cookie))).json(),{configured:true,connected:true});
    assert.equal((await testAlert.POST(request('/api/push/test',{endpoint:subscription(99).endpoint},cookie))).status,409);
    assert.equal((await testAlert.POST(request('/api/push/test',{endpoint:subscription(1).endpoint},cookie))).status,200);
    assert.equal(sent.filter(s=>s.data.kind==='test').length,1);assert.equal(sent.at(-1).sub.endpoint,subscription(1).endpoint);
    assert.equal((await testAlert.POST(request('/api/push/test',{endpoint:subscription(1).endpoint},cookie))).status,429);
    await db.query('DELETE FROM service_gate WHERE name=$1',['push:test:'+owner]);
    const acceptedSend=webpush.sendNotification;webpush.sendNotification=async()=>{throw {statusCode:410};};
    assert.equal((await testAlert.POST(request('/api/push/test',{endpoint:subscription(1).endpoint},cookie))).status,410);
    assert.equal((await (await device.POST(request('/api/push/device',{endpoint:subscription(1).endpoint},cookie))).json()).connected,false);
    webpush.sendNotification=acceptedSend;await push.saveSubscription(owner,subscription(1));

    for(const invalid of ['http://fcm.googleapis.com/x','https://127.0.0.1/x','https://fcm.googleapis.com.evil.test/x','https://user:password@fcm.googleapis.com/x','https://fcm.googleapis.com:444/x'])assert.equal(push.subscriptionSchema.safeParse({...subscription(1),endpoint:invalid}).success,false);
    assert.equal(push.subscriptionSchema.safeParse({...subscription(1),keys:{p256dh:'short',auth:'secret'}}).success,false);
    const initial=await (await inbox.GET(request('/api/notifications',null,cookie,'GET'))).json();assert.ok(initial.items.length);assert.equal(initial.state.read[0],'old');const releaseCount=initial.items.filter(n=>n.kind==='update').length;
    assert.equal((await (await inbox.GET(request('/api/notifications',null,cookie,'GET'))).json()).items.filter(n=>n.kind==='update').length,releaseCount);
    await repo.addNotice(database(),owner,notice('achievement:new',Date.now()),true);await repo.addNotice(database(),owner,notice('achievement:new',Date.now()),true);
    // Subscription time is before this event, even on fast same-millisecond tests.
    await db.query('UPDATE push_subscriptions SET created_at=created_at-10');
    await push.deliverPending();const achievementSends=sent.filter(s=>s.data.id==='achievement:new');assert.equal(achievementSends.length,2);assert.ok(achievementSends.every(s=>!('owner' in s.data)&&!('email' in s.data)));
    const before=sent.length;await push.deliverPending();assert.equal(sent.length,before);
    let read=await (await inbox.POST(request('/api/notifications',{read:['achievement:new']},cookie))).json();assert.ok(read.state.read.includes('old'));assert.ok(read.state.read.includes('achievement:new'));
    await inbox.POST(request('/api/notifications',{read:['ride:old-ride']},cookie));read=await (await inbox.GET(request('/api/notifications',null,cookie,'GET'))).json();assert.ok(read.state.read.includes('achievement:new'));await inbox.POST(request('/api/notifications',{read:read.items.map(n=>n.id)},cookie));const allRead=await (await inbox.GET(request('/api/notifications',null,cookie,'GET'))).json();assert.equal(allRead.unreadCount,0);
    const records=requireModule('../app/api/records/route.ts');assert.equal((await records.POST(request('/api/records',{kind:'inbox',data:{read:['stale-device-read'],browser:false,readOnly:true}},cookie))).status,200);assert.equal((await repo.inboxState(database(),owner)).browser,true);
    await save('profile','profile',{bike:'Bike',baseOdo:0});await save('oil','service',{id:'oil',name:'Oil',last:0,interval:100,date:'2026-10-06'});await repo.reconcileNotifications(database(),owner);const near=await db.query('SELECT data,push FROM notifications WHERE owner=$1 AND id=$2',[owner,'service:oil:0:100']);assert.equal(near.rows[0].push,false);await inbox.POST(request('/api/notifications',{read:['service:oil:0:100']},cookie));await save('profile','profile',{bike:'Bike',baseOdo:100});await repo.reconcileNotifications(database(),owner);await repo.reconcileNotifications(database(),owner);const due=await db.query('SELECT data,push FROM notifications WHERE owner=$1 AND id=$2',[owner,'service:oil:0:100:due']);assert.equal(due.rows.length,1);assert.equal(due.rows[0].push,true);assert.equal(JSON.parse(due.rows[0].data).maintenanceStage,'due');await push.deliverPending();assert.equal(sent.filter(s=>s.data.id==='service:oil:0:100:due').length,2,'reading a near-due notice does not suppress the one important due event');
    await save('chain','service',{id:'chain',name:'Chain',last:0,interval:10,date:'2026-10-06'});await repo.reconcileNotifications(database(),owner);await save('chain','service',{id:'chain',name:'Chain',last:103,interval:10,date:'2026-10-07'});const beforeObsolete=sent.length;await push.deliverPending();assert.equal(sent.length,beforeObsolete,'completed maintenance suppresses its pending alert');
    await repo.addNotice(database(),owner,notice('achievement:expiry',Date.now()+1),true);webpush.sendNotification=async()=>{throw {statusCode:410};};const expired=await push.deliverPending();assert.equal(expired.expired,2);assert.equal((await db.query('SELECT * FROM push_subscriptions')).rows.length,0);
    await push.saveSubscription(owner,subscription(3));await push.saveSubscription('second-rider',subscription(3));assert.equal((await db.query('SELECT owner FROM push_subscriptions WHERE id=$1',[push.subscriptionId(subscription(3).endpoint)])).rows[0].owner,'second-rider');assert.equal((await db.query('SELECT * FROM push_deliveries WHERE subscription_id=$1',[push.subscriptionId(subscription(3).endpoint)])).rows.length,0);
    assert.equal((await dispatch.GET(request('/api/push/dispatch',null,cookie,'GET'))).status,401);assert.ok(push.cronAuthorized(new Request('https://lakbay.test',{headers:{Authorization:'Bearer '+process.env.CRON_SECRET}})));
    const publicConfig=await (await config.GET(request('/api/push/config',null,cookie,'GET'))).json();assert.deepEqual(Object.keys(publicConfig).sort(),['configured','publicKey']);assert.ok(!JSON.stringify(publicConfig).includes(keys.privateKey));
    await push.saveSubscription(owner,subscription(4));await repo.addNotice(database(),owner,notice('achievement:retry',Date.now()),true);await db.query('UPDATE push_subscriptions SET created_at=created_at-10');webpush.sendNotification=async()=>{throw {statusCode:503};};assert.ok((await push.deliverPending()).failed>0);assert.ok((await db.query('SELECT next_at FROM push_deliveries WHERE owner=$1 AND delivered_at IS NULL',[owner])).rows.every(r=>Number(r.next_at)>Date.now()));
    const signout=requireModule('../app/api/auth/signout/route.ts');await signout.GET(request('/api/auth/signout',null,cookie+'; lakbay_push_device='+push.subscriptionId(subscription(4).endpoint),'GET'));assert.equal((await db.query('SELECT * FROM push_subscriptions WHERE owner=$1',[owner])).rows.length,0);
    delete process.env.VAPID_PRIVATE_KEY;assert.equal(push.vapidConfiguration(),null);assert.deepEqual(await push.deliverPending(),{configured:false,sent:0,expired:0,failed:0});assert.equal((await subscriptions.POST(request('/api/push/subscriptions',subscription(1),cookie))).status,503);
  }finally{webpush.sendNotification=originalSend;process.env=previousEnv;await db.close();}
});
test('permission denial is graceful and enabling is the only permission prompt',async()=>{
  const {enablePhoneAlerts,setBadge}=requireModule('../lib/notifications/client.ts');const originalWindow=global.window,originalNavigator=Object.getOwnPropertyDescriptor(global,'navigator'),originalNotification=global.Notification,originalFetch=global.fetch;
  let prompted=0,badge=[];global.window={Notification:{},PushManager:{}};global.Notification={permission:'denied',requestPermission:async()=>{prompted++;return 'denied';}};Object.defineProperty(global,'navigator',{configurable:true,value:{serviceWorker:{},setAppBadge:async n=>badge.push(n),clearAppBadge:async()=>badge.push(0)}});
  try{await assert.rejects(enablePhoneAlerts(false),/blocked/);assert.equal(prompted,0);await assert.rejects(enablePhoneAlerts(true),/blocked/);assert.equal(prompted,1);await setBadge(52);await setBadge(0);assert.deepEqual(badge,[52,0]);global.Notification.permission='granted';global.fetch=async()=>Response.json({configured:false});await assert.rejects(enablePhoneAlerts(false),/not configured/);assert.equal(prompted,1);}finally{global.window=originalWindow;global.Notification=originalNotification;global.fetch=originalFetch;Object.defineProperty(global,'navigator',originalNavigator);}
});

test('static cache failures never break live assets or intercept private HTML/API data',async()=>{
  const h=workerHarness();h.context.caches.open=async()=>({match:async()=>null,put:async()=>{throw Error('Quota exceeded');}});
  let response;h.handlers.fetch({request:{url:'https://lakbay.test/_next/static/test.js',method:'GET'},respondWith:p=>response=p});assert.equal((await response).status,200);
  response=undefined;h.handlers.fetch({request:{url:'https://lakbay.test/api/records',method:'GET'},respondWith:p=>response=p});assert.equal(response,undefined);
  h.handlers.fetch({request:{url:'https://lakbay.test/',method:'GET'},respondWith:p=>response=p});assert.equal(response,undefined);
});
test('explicit enable stores a PushManager subscription; waiting legacy updates block unsafe enable',async()=>{
  const {enablePhoneAlerts,disablePhoneAlerts}=requireModule('../lib/notifications/client.ts');
  const originalWindow=global.window,originalNavigator=Object.getOwnPropertyDescriptor(global,'navigator'),originalNotification=global.Notification,originalFetch=global.fetch;
  const key=webpush.generateVAPIDKeys().publicKey,calls=[];let unsubscribed=0;
  const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{p256dh:key,auth:Buffer.alloc(16).toString('base64url')},unsubscribe:async()=>{unsubscribed++;}};
  const registration={active:{postMessage:(_message,ports)=>ports[0].postMessage({version:'known'})},waiting:null,installing:null,pushManager:{getSubscription:async()=>null,subscribe:async options=>{assert.equal(options.userVisibleOnly,true);assert.equal(options.applicationServerKey.length,65);return subscription;}}};
  global.window={Notification:{},PushManager:{}};global.Notification={permission:'granted',requestPermission:async()=> 'granted'};
  Object.defineProperty(global,'navigator',{configurable:true,value:{serviceWorker:{register:async(url,options)=>{assert.equal(url,'/notifications-sw.js');assert.equal(options.updateViaCache,'none');return registration;},ready:Promise.resolve(registration),getRegistration:async()=>registration}}});
  global.fetch=async(url,options)=>{calls.push({url,options});return Response.json(url==='/api/push/config'?{configured:true,publicKey:key}:{ok:true});};
  try{await enablePhoneAlerts(true);assert.equal(calls.at(-1).url,'/api/push/subscriptions');assert.equal(JSON.parse(calls.at(-1).options.body).endpoint,subscription.endpoint);registration.pushManager.getSubscription=async()=>subscription;await disablePhoneAlerts();assert.equal(calls.at(-1).options.method,'DELETE');assert.equal(unsubscribed,1);registration.waiting={};await assert.rejects(enablePhoneAlerts(false),/Update app/);}finally{global.window=originalWindow;global.Notification=originalNotification;global.fetch=originalFetch;Object.defineProperty(global,'navigator',originalNavigator);}
});

test('read-state badge sync closes only read system alerts; Lakbay content excludes links',async()=>{
  const h=workerHarness(),closed=[];h.context.self.registration.getNotifications=async()=>[{tag:'read',close:()=>closed.push('read')},{tag:'unread',close:()=>closed.push('unread')}];
  await h.emit('message',{data:{type:'SET_BADGE',count:1,read:['read']}});assert.deepEqual(closed,['read']);assert.equal(h.badges.at(-1),1);
  await h.emit('push',{data:{json:()=>({...notice('clean',1),title:'Update https://example.vercel.app',body:'Ready https://example.vercel.app/path',unreadCount:1})}});
  assert.equal(h.shown.at(-1)[0],'Lakbay · Update');assert.equal(h.shown.at(-1)[1].body,'Ready');
});
test('phone status verifies this device instead of trusting the account preference',async()=>{
 const {phoneStatus}=requireModule('../lib/notifications/client.ts');
 const oldWindow=global.window,oldNavigator=Object.getOwnPropertyDescriptor(global,'navigator'),oldNotification=global.Notification,oldFetch=global.fetch;
 global.window={Notification:{},PushManager:{}};global.Notification={permission:'granted'};
 const sub={endpoint:'https://fcm.googleapis.com/fcm/send/own-device'};let saved=false;
 Object.defineProperty(global,'navigator',{configurable:true,value:{serviceWorker:{getRegistration:async()=>({pushManager:{getSubscription:async()=>sub}})}}});
 global.fetch=async(url,options)=>{assert.equal(url,'/api/push/device');assert.equal(JSON.parse(options.body).endpoint,sub.endpoint);return Response.json({configured:true,connected:saved});};
 try{assert.equal((await phoneStatus()).connected,false);saved=true;assert.equal((await phoneStatus()).connected,true);global.Notification.permission='denied';assert.match((await phoneStatus()).message,/blocked/);}finally{global.window=oldWindow;global.Notification=oldNotification;global.fetch=oldFetch;Object.defineProperty(global,'navigator',oldNavigator);}
});
test('release dispatch waits for the exact deployed commit and rejects failed/missing configuration',async()=>{
 const {dispatchRelease}=await import('../lib/notifications/deployment-dispatch.mjs');
 const config={base:'https://lakbay.test',secret:'test-only-32-character-cron-secret',expected:'commit-new'};let clock=0,calls=[];
 const fetcher=async(url,options)=>{calls.push({path:url.pathname,options});if(url.pathname==='/api/pwa/release')return Response.json({commit:calls.length===1?'old':'commit-new'});assert.equal(options.headers.Authorization,'Bearer '+config.secret);return Response.json({configured:true,sent:2,expired:0,failed:0});};
 assert.deepEqual(await dispatchRelease({...config,fetcher,now:()=>clock,waiter:async ms=>clock+=ms}),{sent:2,expired:0});assert.deepEqual(calls.map(c=>c.path),['/api/pwa/release','/api/pwa/release','/api/push/dispatch']);
 clock=0;calls=[];await assert.rejects(dispatchRelease({...config,fetcher:async url=>{calls.push(url.pathname);return Response.json({commit:'wrong'});},now:()=>clock,waiter:async ms=>clock+=ms}),/not deployed/);assert.ok(calls.every(p=>p==='/api/pwa/release'));
 await assert.rejects(dispatchRelease({...config,secret:''}),/Configure/);
 await assert.rejects(dispatchRelease({...config,fetcher:async url=>Response.json(url.pathname==='/api/pwa/release'?{commit:'commit-new'}:{configured:true,sent:0,failed:1})}),/remain queued/);
 await assert.rejects(dispatchRelease({...config,fetcher:async url=>Response.json(url.pathname==='/api/pwa/release'?{commit:'commit-new'}:{configured:false})}),/VAPID/);
 await assert.rejects(dispatchRelease({...config,fetcher:async url=>url.pathname==='/api/pwa/release'?Response.json({commit:'commit-new'}):new Response(null,{status:401})}),/does not match/);
});
