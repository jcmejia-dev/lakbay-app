import type {SqlDatabase} from '../sql-database';
import {ride,service,profile} from '../record-schemas';
import {XP,TIERS,STATE_ID} from './config';
import {rideXp,rideDay,previousDay,destinationKey} from './xp';
import {ACHIEVEMENTS,rideTimeFlags} from './achievements';
import {awardOnce,type EventData} from './ledger';
import {emptyProgression,type Progression,type Unlock} from './types';

// Caller holds a per-owner transaction lock. Replaying old records is safe.
export async function reconcileProgression(db:SqlDatabase,owner:string):Promise<Progression>{
  const stateRow=await db.prepare("SELECT data FROM records WHERE owner=? AND id=? AND kind='progression'").bind(owner,STATE_ID).first<{data:string}>();
  const initialized=!!stateRow;
  const rows=await db.prepare("SELECT kind,data FROM records WHERE owner=? AND kind IN ('ride','service','profile') ORDER BY updated,id").bind(owner).all<{kind:string;data:string}>();
  let ledger=await db.prepare('SELECT event_key,xp,data FROM progression_events WHERE owner=?').bind(owner).all<{event_key:string;xp:number;data:string}>();
  const keys=new Set(ledger.results.map(e=>e.event_key));
  const rideEvents=new Map(ledger.results.filter(e=>e.event_key.startsWith('ride:')).map(e=>[e.event_key,JSON.parse(e.data) as EventData]));
  const events=ledger.results.map(e=>JSON.parse(e.data) as EventData);
  const ridesPerDay=new Map<string,number>(),servicesPerDay=new Map<string,number>();
  const destinations=new Set<string>(),days=new Set<string>();
  for(const e of events){if(e.type==='ride'&&e.day){ridesPerDay.set(e.day,(ridesPerDay.get(e.day)||0)+1);days.add(e.day);}if(e.type==='service'&&e.day)servicesPerDay.set(e.day,(servicesPerDay.get(e.day)||0)+1);if(e.type==='discovery'&&e.destination)destinations.add(e.destination);}
  let preparedVehicle=false;
  const completed=rows.results.filter(r=>r.kind==='ride').map(r=>ride.safeParse(JSON.parse(r.data))).filter(r=>r.success).map(r=>r.data).filter(r=>r.status==='complete'&&Number.isFinite(new Date(r.started).getTime())).sort((a,b)=>a.started-b.started||a.id.localeCompare(b.id));
  for(const r of completed){
    const key='ride:'+r.id,day=rideDay(r.started);
    if(!keys.has(key)){
      const count=ridesPerDay.get(day)||0;
      const facts:EventData={type:'ride',day,distanceKm:r.distance,destination:destinationKey(r),...rideTimeFlags(r.started)};
      await awardOnce(db,owner,key,count<XP.maxRidesPerDay?rideXp(r):0,facts);rideEvents.set(key,facts);
      keys.add(key);ridesPerDay.set(day,count+1);days.add(day);
    }
    const destination=rideEvents.get(key)?.destination;
    if(destination&&!destinations.has(destination)){
      await awardOnce(db,owner,'destination:'+destination,XP.discovery,{type:'discovery',destination});destinations.add(destination);
    }
    if(r.rating)await awardOnce(db,owner,'rating:'+r.id,XP.rating,{type:'rating'});
  }
  for(const day of [...days].sort())if(days.has(previousDay(day)))await awardOnce(db,owner,'streak:'+day,XP.streak,{type:'streak',day});
  for(const row of rows.results){
    if(row.kind==='profile'){const p=profile.safeParse(JSON.parse(row.data));if(p.success)preparedVehicle=!!p.data.garage?.vehicles.length;}
    if(row.kind!=='service')continue;
    const parsed=service.safeParse(JSON.parse(row.data));if(!parsed.success)continue;const s=parsed.data;
    const key=`service:${s.id}:${s.date}:${s.last}`,day=s.date;
    if(!keys.has(key)){const count=servicesPerDay.get(day)||0;await awardOnce(db,owner,key,count<XP.maxServicesPerDay?XP.maintenance:0,{type:'service',day});keys.add(key);servicesPerDay.set(day,count+1);}
  }
  ledger=await db.prepare('SELECT event_key,xp,data FROM progression_events WHERE owner=?').bind(owner).all<{event_key:string;xp:number;data:string}>();
  const state=emptyProgression();
  for(const row of ledger.results){const e=JSON.parse(row.data) as EventData;state.totalXp+=row.xp;if(e.type==='ride'){state.stats.rides++;state.stats.distanceKm+=e.distanceKm||0;state.stats.weekend||=!!e.weekend;state.stats.early||=!!e.early;state.stats.night||=!!e.night;}if(e.type==='service')state.stats.maintenance++;}
  state.stats.destinations=destinations.size;state.stats.prepared=preparedVehicle&&state.stats.maintenance>0;
  const unlocked=new Set(ledger.results.map(e=>e.event_key));
  for(const a of ACHIEVEMENTS){const key='achievement:'+a.id;if(unlocked.has(key)||a.value(state.stats)>=a.goal){state.achievements.push(a.id);if(!unlocked.has(key)){const unlock:Unlock={key,type:'achievement',name:a.name,detail:a.detail,xp:a.xp,at:Date.now()};await awardOnce(db,owner,key,a.xp,{type:'achievement',unlock},initialized);state.totalXp+=a.xp;}}}
  state.tiers=[];
  for(const t of TIERS){const key='tier:'+t.name;if(unlocked.has(key)||state.totalXp>=t.xp){state.tiers.push(t.name);if(!unlocked.has(key)){const unlock:Unlock={key,type:'tier',name:t.name,detail:`You reached the ${t.name} rider tier.`,xp:0,at:Date.now()};await awardOnce(db,owner,key,0,{type:'tier',unlock},initialized&&t.name!=='Bronze');}}}
  await db.prepare('INSERT INTO records(owner,id,kind,data,updated) VALUES(?,?,?,?,?) ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(owner,STATE_ID,'progression',JSON.stringify(state),new Date().toISOString()).run();
  return state;
}
