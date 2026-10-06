import webpush from 'web-push';
import {database} from '../storage';
import {addNotice,inboxState,readNotices} from './repository';
import {subscriptionId,subscriptionSchema,vapidConfiguration} from './push';
import {unreadCount,type RideNotice} from './types';

export const deviceRequest=subscriptionSchema.pick({endpoint:true});
export async function deviceStatus(owner:string,endpoint:string){
  const db=database(),id=subscriptionId(endpoint);
  const row=await db.prepare('SELECT id FROM push_subscriptions WHERE owner=? AND id=?').bind(owner,id).first();
  return {configured:!!vapidConfiguration(),connected:!!row};
}
// Explicit, fixed-content tests can target only this rider's saved device.
export async function sendDeviceTest(owner:string,endpoint:string){
  const config=vapidConfiguration();if(!config)return {status:503,error:'Phone alerts are not configured on the server.'};
  const db=database(),id=subscriptionId(endpoint);
  const sub=await db.prepare('SELECT endpoint,p256dh,auth FROM push_subscriptions WHERE owner=? AND id=?').bind(owner,id).first<{endpoint:string;p256dh:string;auth:string}>();
  if(!sub)return {status:409,error:'This device is not connected. Tap Reconnect this device.'};
  const now=Date.now();
  const gate=await db.prepare(`INSERT INTO service_gate(name,next_at,day,calls) VALUES(?,?,?,'1')
    ON CONFLICT(name) DO UPDATE SET next_at=excluded.next_at WHERE service_gate.next_at::bigint<=? RETURNING name`).bind('push:test:'+owner,String(now+60000),new Date(now).toISOString().slice(0,10),now).first();
  if(!gate)return {status:429,error:'Wait one minute before sending another test alert.'};
  const notice:RideNotice={id:`test:phone:${Math.floor(now/60000)}`,kind:'test',tab:'notifications',time:now,title:'Lakbay · Test phone alert',body:'This is your test alert. Future updates, achievements and important maintenance reminders can appear here.'};
  await addNotice(db,owner,notice);
  const state=await inboxState(db,owner);
  try{
    await webpush.sendNotification({endpoint:sub.endpoint,keys:{p256dh:sub.p256dh,auth:sub.auth}},JSON.stringify({...notice,unreadCount:unreadCount(await readNotices(db,owner),state.read)}),{vapidDetails:config,TTL:300,timeout:4000,urgency:'high'});
    return {status:200,accepted:true};
  }catch(error){
    const code=(error as {statusCode?:number}).statusCode;
    if(code===404||code===410){await db.prepare('DELETE FROM push_subscriptions WHERE owner=? AND id=?').bind(owner,id).run();return {status:410,error:'This device subscription expired. Tap Reconnect this device.'};}
    return {status:503,error:'The push service did not accept the test. Retry later; the inbox still works.'};
  }
}
