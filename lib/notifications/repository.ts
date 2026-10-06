import type {SqlDatabase} from '../sql-database';
import {appUpdates} from '../app-updates';
import {release} from '../pwa/release';
import {orderedNotices,NOTICE_LIMIT,type RideNotice,type InboxState} from './types';
import {service,profile,ride} from '../record-schemas';

export async function addNotice(db:SqlDatabase,owner:string,notice:RideNotice,push=false){
  await db.prepare('INSERT INTO notifications(owner,id,data,sent_at,push,created_at) VALUES(?,?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET push=notifications.push OR excluded.push').bind(owner,notice.id,JSON.stringify(notice),notice.time,push,Date.now()).run();
}
export async function inboxState(db:SqlDatabase,owner:string):Promise<InboxState>{
  const row=await db.prepare("SELECT data FROM records WHERE owner=? AND id='inbox' AND kind='inbox'").bind(owner).first<{data:string}>();
  return row?JSON.parse(row.data):{read:[],browser:false};
}
// Same permanent IDs as the original inbox. Reconciliation never changes the sent time.
export async function reconcileNotifications(db:SqlDatabase,owner:string){
  for(const n of appUpdates)await addNotice(db,owner,n);
  await addNotice(db,owner,{id:`update:${release.id}`,title:release.title,body:release.summary,tab:'notifications',time:release.time,kind:'update',version:release.id},true);
  const events=await db.prepare("SELECT data,created_at FROM progression_events WHERE owner=? AND event_key LIKE 'achievement:%'").bind(owner).all<{data:string;created_at:string}>();
  for(const event of events.results){const unlock=JSON.parse(event.data).unlock;if(unlock)await addNotice(db,owner,{id:unlock.key,title:`Unlocked: ${unlock.name}`,body:unlock.detail,tab:'badges',time:Date.parse(event.created_at),kind:'badge'},false);}
  const rows=await db.prepare("SELECT kind,data,updated FROM records WHERE owner=? AND kind IN ('ride','service','profile')").bind(owner).all<{kind:string;data:string;updated:string}>();
  const rides=rows.results.filter(r=>r.kind==='ride').map(r=>ride.safeParse(JSON.parse(r.data))).filter(r=>r.success).map(r=>r.data).filter(r=>r.status==='complete');
  const p=rows.results.find(r=>r.kind==='profile');const parsedProfile=p?profile.safeParse(JSON.parse(p.data)):null;
  const odo=(parsedProfile?.success?parsedProfile.data.baseOdo:0)+rides.reduce((sum,r)=>sum+r.distance,0);
  const days=new Set(rides.map(r=>new Date(r.started).toLocaleDateString('en-CA',{timeZone:'Asia/Manila'}))).size;
  const legacy=[['First ignition','Finish your first ride',rides.length,1],['Daily rhythm','Record 5 commutes',rides.filter(r=>r.type==='commute').length,5],['The first hundred','Travel 100 km in total',rides.reduce((n,r)=>n+r.distance,0),100],['Weekend wanderer','Finish 3 adventure rides',rides.filter(r=>r.type==='adventure').length,3],['Seven days outside','Ride on 7 different days',days,7],['Going the distance','Travel 500 km in total',rides.reduce((n,r)=>n+r.distance,0),500]] as const;
  for(const [name,detail,value,goal] of legacy)if(value>=goal)await addNotice(db,owner,{id:`badge:${name}`,title:`Unlocked: ${name}`,body:detail+'. Keep exploring.',tab:'badges',time:Date.now(),kind:'badge'});
  for(const r of rides.sort((a,b)=>b.started-a.started).slice(0,30))await addNotice(db,owner,{id:`ride:${r.id}`,title:'Ride saved',body:`${r.name} · ${r.distance.toFixed(2)} km`,tab:'journal',time:r.started,kind:'ride'});
  for(const row of rows.results.filter(r=>r.kind==='service')){const parsed=service.safeParse(JSON.parse(row.data));if(!parsed.success)continue;const s=parsed.data,remaining=s.last+s.interval-odo;
    if(remaining<=100){const base=`service:${s.id}:${s.last}:${s.interval}`;const previous=await db.prepare('SELECT data FROM notifications WHERE owner=? AND id=?').bind(owner,base).first<{data:string}>();const wasSoon=previous&&JSON.parse(previous.data).maintenanceStage==='soon';const due=remaining<=0;await addNotice(db,owner,{id:due&&wasSoon?base+':due':base,title:due?`${s.name} is due`:`${s.name} is coming up`,body:due?'Visit your mechanic and mark it serviced in Garage.':`${Math.ceil(remaining)} km until your next service.`,tab:'garage',time:Date.now(),kind:'service',maintenanceStage:due?'due':'soon'},due);}
  }
  // Bound only this new inbox/outbox. Never prune existing records or offline data.
  await db.prepare('DELETE FROM notifications WHERE owner=? AND id NOT IN (SELECT id FROM notifications WHERE owner=? ORDER BY sent_at DESC,id LIMIT ?)').bind(owner,owner,NOTICE_LIMIT).run();
}
export async function readNotices(db:SqlDatabase,owner:string){const rows=await db.prepare('SELECT data FROM notifications WHERE owner=? ORDER BY sent_at DESC,id LIMIT ?').bind(owner,NOTICE_LIMIT).all<{data:string}>();return orderedNotices(rows.results.map(r=>JSON.parse(r.data)));}
