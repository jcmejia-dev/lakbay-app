// Served as an imported worker script so deployments change the SW's bytes reliably.
export function workerSource(version:string){return `const BUILD_ID=${JSON.stringify(version)};\n`+String.raw`
const CACHE_PREFIX='lakbay-app-', CACHE_NAME=CACHE_PREFIX+BUILD_ID;
const TABS=new Set(['ride','journal','badges','garage','profile','notifications']);
const preparations=new Map();
async function badge(count){try{if(count>0&&self.navigator.setAppBadge)await self.navigator.setAppBadge(count);else if(!count&&self.navigator.clearAppBadge)await self.navigator.clearAppBadge();}catch{}}
async function windows(){return self.clients.matchAll({type:'window',includeUncontrolled:true});}
async function broadcast(data){for(const client of await windows())client.postMessage(data);}
self.addEventListener('install',()=>{}); // Wait for explicit user consent. Never skip waiting here.
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  try{for(const name of await caches.keys())if(name.startsWith(CACHE_PREFIX)&&name!==CACHE_NAME)await caches.delete(name);}catch{}
  await self.clients.claim();await broadcast({type:'LAKBAY_WORKER_ACTIVE',version:BUILD_ID});
})()));
self.addEventListener('fetch',event=>{
  const url=new URL(event.request.url);
  // Cache immutable application assets only. Never cache sessions, API replies or private HTML.
  if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.pathname.startsWith('/_next/static/'))return;
  event.respondWith((async()=>{let cache;try{cache=await caches.open(CACHE_NAME);const cached=await cache.match(event.request);if(cached)return cached;}catch{}const response=await fetch(event.request);if(cache&&response.ok){try{await cache.put(event.request,response.clone());const keys=await cache.keys();if(keys.length>150)await cache.delete(keys[0]);}catch{}}return response;})());
});
self.addEventListener('message',event=>{
  const data=event.data||{};
  if(data.type==='GET_VERSION'){event.ports[0]?.postMessage({version:BUILD_ID});return;}
  if(data.type==='SET_BADGE'){event.waitUntil((async()=>{await badge(Math.max(0,Math.min(1000,Number(data.count)||0)));const read=new Set(Array.isArray(data.read)?data.read.filter(id=>typeof id==='string'&&id.length<=250).slice(-1000):[]);try{for(const notification of await self.registration.getNotifications())if(read.has(notification.tag))notification.close();}catch{}})());return;}
  if(data.type==='UPDATE_READY'){const pending=preparations.get(data.requestId);if(pending&&event.source?.id)pending.answers.set(event.source.id,data.safe===true);return;}
  if(data.type==='ACTIVATE_UPDATE')event.waitUntil((async()=>{
    const clients=await windows(),requestId=crypto.randomUUID(),answers=new Map();preparations.set(requestId,{answers});
    for(const client of clients)client.postMessage({type:'PREPARE_UPDATE',requestId});
    await new Promise(resolve=>setTimeout(resolve,1500));preparations.delete(requestId);
    if(clients.every(client=>answers.get(client.id)===true)){event.ports[0]?.postMessage({ok:true});await self.skipWaiting();}
    else event.ports[0]?.postMessage({ok:false,error:'Pause and save rides in every Lakbay window, or close the other windows, then retry.'});
  })());
});
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let data;try{data=event.data.json();}catch{return;}
  if(typeof data.id!=='string'||data.id.length>250||typeof data.title!=='string')return;
  const tab=TABS.has(data.tab)?data.tab:'notifications';
  const title=data.title.replace(/https?:\/\/\S+/gi,'').trim();const body=String(data.body||'').replace(/https?:\/\/\S+/gi,'').trim();
  await self.registration.showNotification(/^Lakbay\b/i.test(title)?title.slice(0,180):('Lakbay · '+title).slice(0,180),{body:body.slice(0,500),tag:data.id,icon:'/icons/lakbay-192.png',badge:'/icons/lakbay-192.png',data:{id:data.id,tab},renotify:false});
  let count=Math.max(0,Number(data.unreadCount)||0);
  try{const r=await fetch('/api/notifications',{credentials:'include',cache:'no-store'});if(r.ok)count=(await r.json()).unreadCount;}catch{}
  await badge(count);await broadcast({type:'LAKBAY_PUSH',id:data.id});
})()));
self.addEventListener('notificationclick',event=>event.waitUntil((async()=>{
  event.notification.close();const data=event.notification.data||{},tab=TABS.has(data.tab)?data.tab:'notifications';
  const id=typeof data.id==='string'&&data.id.length<=250?data.id:'';
  // Opening a notification shares read state with the existing authenticated inbox.
  if(id)try{const r=await fetch('/api/notifications',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({read:[id]})});if(r.ok)await badge((await r.json()).unreadCount);}catch{}
  const existing=(await windows()).find(client=>new URL(client.url).origin===self.location.origin);
  if(existing){await existing.focus();existing.postMessage({type:'OPEN_NOTIFICATION',id,tab});}
  else await self.clients.openWindow('/?view='+encodeURIComponent(tab)+'&notification='+encodeURIComponent(id));
})()));
self.addEventListener('pushsubscriptionchange',event=>event.waitUntil((async()=>{
  try{
    const configResponse=await fetch('/api/push/config',{credentials:'include',cache:'no-store'});if(!configResponse.ok)throw Error();const config=await configResponse.json();if(!config.configured)throw Error();
    const raw=atob(config.publicKey.replace(/-/g,'+').replace(/_/g,'/'));const key=Uint8Array.from(raw,c=>c.charCodeAt(0));
    const subscription=event.newSubscription||await self.registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
    const response=await fetch('/api/push/subscriptions',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription)});if(!response.ok)throw Error();
  }catch{await broadcast({type:'LAKBAY_PUSH_RECOVERY'});}
})()));
`;
}
