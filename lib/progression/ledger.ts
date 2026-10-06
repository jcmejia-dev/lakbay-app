import {addNotice} from '../notifications/repository';
import type {SqlDatabase} from '../sql-database';
export type EventData={type:string;day?:string;distanceKm?:number;destination?:string|null;weekend?:boolean;early?:boolean;night?:boolean;unlock?:import('./types').Unlock};
export async function awardOnce(db:SqlDatabase,owner:string,key:string,xp:number,data:EventData,notify=false){
  const result=await db.prepare('INSERT INTO progression_events(owner,event_key,xp,data,created_at,notified) VALUES(?,?,?,?,?,?) ON CONFLICT(owner,event_key) DO NOTHING RETURNING event_key')
    .bind(owner,key,xp,JSON.stringify(data),new Date().toISOString(),!notify).all();
  if(result.results.length&&notify&&data.unlock)await addNotice(db,owner,{id:key,title:`Unlocked: ${data.unlock.name}`,body:data.unlock.detail,tab:'badges',time:data.unlock.at,kind:'badge'},true);
  return result.results.length>0;
}
export async function claimUnlocks(db:SqlDatabase,owner:string){
  // Atomic claim also prevents duplicate popups across tabs, devices and retries.
  const rows=await db.prepare('UPDATE progression_events SET notified=true WHERE owner=? AND notified=false RETURNING data,created_at').bind(owner).all<{data:string;created_at:string}>();
  return rows.results.sort((a,b)=>a.created_at.localeCompare(b.created_at)).map(r=>JSON.parse(r.data).unlock).filter(Boolean) as import('./types').Unlock[];
}
