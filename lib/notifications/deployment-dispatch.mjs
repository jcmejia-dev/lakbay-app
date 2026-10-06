import {setTimeout as wait} from 'node:timers/promises';
// Called by trusted CI; never log headers, URLs containing secrets, or provider errors.
export async function dispatchRelease({base,secret,expected,fetcher=fetch,waiter=wait,now=Date.now}){
 if(!base||!secret||secret.length<32||!expected)throw Error('Configure LAKBAY_PRODUCTION_URL and the CRON_SECRET Actions secret before running release delivery.');
 const origin=new URL(base);if(origin.protocol!=='https:'||origin.username||origin.password)throw Error('Use the HTTPS production Lakbay origin.');
 const deadline=now()+12*60000;let deployed=false;
 while(now()<deadline){
  try{const r=await fetcher(new URL('/api/pwa/release',origin),{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});if(r.ok&&(await r.json()).commit===expected){deployed=true;break;}}catch{}
  await waiter(15000);
 }
 if(!deployed)throw Error('The expected commit was not deployed to production in time. No alerts were sent.');
 for(let attempt=0;attempt<3;attempt++){
  try{const r=await fetcher(new URL('/api/push/dispatch',origin),{method:'POST',headers:{Authorization:'Bearer '+secret},redirect:'error',signal:AbortSignal.timeout(60000)});
   if(r.status===401)throw Error('auth');
   if(r.ok){const result=await r.json();if(!result.configured)throw Error('config');if(result.failed)throw Error('provider');return {sent:result.sent,expired:result.expired};}
  }catch(error){if(error.message==='auth')throw Error('CRON_SECRET does not match the production server.');if(error.message==='config')throw Error('Production VAPID configuration is missing or invalid.');if(error.message==='provider')throw Error('Some alerts were rejected by the push service. They remain queued for retry.');}
  if(attempt<2)await waiter(15000);
 }
 throw Error('Release delivery could not complete. Check production dispatch logs without exposing keys.');
}
