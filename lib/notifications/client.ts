import {workerRequest} from '../pwa/messages';
import type {InboxState,RideNotice} from './types';
export type NotificationSnapshot={items:RideNotice[];state:InboxState;unreadCount:number};
export async function setBadge(count:number,read:string[]=[]){
  const n=navigator as Navigator&{setAppBadge?:(count:number)=>Promise<void>;clearAppBadge?:()=>Promise<void>};
  try{if(count>0)await n.setAppBadge?.(count);else await n.clearAppBadge?.();}catch{}
  // A denied window badge must not prevent worker/dot synchronization.
  try{const worker=navigator.serviceWorker?.controller||(await navigator.serviceWorker?.getRegistration('/'))?.active;worker?.postMessage({type:'SET_BADGE',count,read});}catch{}
}
export async function registerWorker(){if(!('serviceWorker' in navigator))throw Error('Phone alerts are not supported in this browser.');return navigator.serviceWorker.register('/notifications-sw.js',{scope:'/',updateViaCache:'none'});}
function publicKey(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0));}
export async function enablePhoneAlerts(requestPermission:boolean){
  if(!('Notification' in window)||!('PushManager' in window)||!('serviceWorker' in navigator))throw Error('Phone alerts are not supported here. The inbox still works.');
  // Keep the permission request in the explicit click's user gesture (Safari requires it).
  const permission=requestPermission?await Notification.requestPermission():Notification.permission;
  if(permission!=='granted')throw Error(permission==='denied'?'Permission is blocked. Allow notifications for Lakbay in your browser/site settings, then try again.':'Phone alerts were not enabled. Your inbox still works.');
  const r=await fetch('/api/push/config',{cache:'no-store'});if(!r.ok)throw Error('Phone alerts are unavailable. Try again when connected.');const config=await r.json();if(!config.configured)throw Error('Phone alerts are not configured yet. Your in-app inbox still works.');
  const registered=await registerWorker();const installing=registered.installing;
  if(installing)await new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>{installing.removeEventListener('statechange',changed);reject(Error('The app worker is still installing. Please retry shortly.'));},5000);const changed=()=>{if(['installed','activated','redundant'].includes(installing.state)){clearTimeout(timer);installing.removeEventListener('statechange',changed);if(installing.state==='redundant')reject(Error('The app worker could not install. Retry when connected.'));else resolve();}};installing.addEventListener('statechange',changed);changed();});
  if(registered.waiting)throw Error('An app update is waiting. Apply Update app when safely stopped, then enable phone alerts for this device.');
  const registration=await navigator.serviceWorker.ready;
  const active=registration.active;if(!active||!(await workerRequest(active,{type:'GET_VERSION'},1500)).version)throw Error('Apply the available app update first, then retry phone alerts.');
  let subscription=await registration.pushManager.getSubscription();const key=publicKey(config.publicKey);
  const existing=subscription?.options.applicationServerKey;
  if(subscription&&existing&&Array.from(new Uint8Array(existing)).join(',')!==Array.from(key).join(',')){await subscription.unsubscribe();subscription=null;}
  subscription||=await registration.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:key});
  const saved=await fetch('/api/push/subscriptions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(subscription)});if(!saved.ok)throw Error('Could not save this device. Retry Enable phone alerts when connected.');
}
export async function disablePhoneAlerts(){const registration=await navigator.serviceWorker.getRegistration('/');const subscription=await registration?.pushManager.getSubscription();if(!subscription)return;const response=await fetch('/api/push/subscriptions',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({endpoint:subscription.endpoint})});if(!response.ok)throw Error('Could not remove this device. Try again when connected.');await subscription.unsubscribe();}
