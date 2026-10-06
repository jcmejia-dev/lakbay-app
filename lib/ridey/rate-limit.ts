import {database} from '../storage';
export async function allowRideyRequest(owner:string,now=Date.now()){
  const day=new Date(now).toISOString().slice(0,10),minute='ridey:minute:'+owner;
  const minuteResult=await database().prepare(`INSERT INTO service_gate(name,next_at,day,calls) VALUES(?,?,?,?)
    ON CONFLICT(name) DO UPDATE SET next_at=excluded.next_at,day=excluded.day,calls=CASE WHEN service_gate.day=excluded.day THEN (service_gate.calls::int+1)::text ELSE '1' END
    WHERE service_gate.day<>excluded.day OR service_gate.calls::int<6 RETURNING name`).bind(minute,String(now+60000),String(Math.floor(now/60000)),'1').all();
  if(!minuteResult.results.length)return false;
  const daily=await database().prepare(`INSERT INTO service_gate(name,next_at,day,calls) VALUES(?,?,?,?)
    ON CONFLICT(name) DO UPDATE SET day=excluded.day,calls=CASE WHEN service_gate.day=excluded.day THEN (service_gate.calls::int+1)::text ELSE '1' END
    WHERE service_gate.day<>excluded.day OR service_gate.calls::int<60 RETURNING name`).bind('ridey:day:'+owner,String(now),day,'1').all();
  return daily.results.length>0;
}
