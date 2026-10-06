import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
import {importRecords} from '../scripts/migration-records.mjs';

const requireModule=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,...args);};
requireModule.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,file);

test('PostgreSQL adapter, migrations, auth and all data APIs preserve existing behavior',async()=>{
  const db=new PGlite(),schema=fs.readFileSync(new URL('../db/postgres/001_initial.sql',import.meta.url),'utf8');
  await db.exec(schema);await db.exec(fs.readFileSync(new URL('../db/postgres/002_progression.sql',import.meta.url),'utf8'));
  await db.exec(fs.readFileSync(new URL('../db/postgres/003_notifications.sql',import.meta.url),'utf8'));
  // Exercise the real production adapter against PostgreSQL's actual parser/engine.
  requireModule.cache[requireModule.resolve('pg')]={exports:{Pool:class {on(){} async query(sql,values){return db.query(sql,values);} async connect(){return {query:(sql,values)=>sql.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(sql,values),release(){}};}}}};
  requireModule.cache[requireModule.resolve('next/server')]={exports:{after:()=>{}}};
  const previousEnv={...process.env},originalFetch=global.fetch;
  Object.assign(process.env,{DATABASE_URL:'postgresql://fixture.invalid/test',AUTH_SESSION_SECRET:'test-only-session-secret-not-a-production-secret',APP_BASE_URL:'https://lakbay.test',GOOGLE_CLIENT_ID:'fixture-client',GOOGLE_CLIENT_SECRET:'fixture-secret',RESEND_API_KEY:'fixture-mail',EMAIL_FROM:'Lakbay <fixture@example.test>'});
  const {database,avatars}=requireModule('../lib/storage.ts');
  const auth=requireModule('../lib/account-auth.ts');
  const records=requireModule('../app/api/records/route.ts'),rider=requireModule('../app/api/rider/route.ts');
  const password=requireModule('../app/api/auth/email/password/route.ts');
  const requestCode=requireModule('../app/api/auth/email/request/route.ts'),verifyCode=requireModule('../app/api/auth/email/verify/route.ts');
  const google=requireModule('../app/api/auth/google/route.ts'),callback=requireModule('../app/api/auth/google/callback/route.ts');
  const account=requireModule('../app/api/account/route.ts'),signout=requireModule('../app/api/auth/signout/route.ts');
  const avatar=requireModule('../app/api/avatar/route.ts');
  const explore=requireModule('../app/api/explore/route.ts');
  const request=(route,body,cookie='',method='POST')=>new Request('https://lakbay.test'+route,{method,headers:{Origin:'https://lakbay.test',Cookie:cookie,'Content-Type':'application/json'},...(method==='POST'?{body:JSON.stringify(body)}:{})});
  let code;
  global.fetch=async(url,options)=>{
    if(String(url)==='https://api.resend.com/emails'){code=JSON.parse(options.body).html.match(/>(\d{6})<\/p>/)[1];return Response.json({id:'sent'});}
    if(String(url)==='https://oauth2.googleapis.com/token')return Response.json({access_token:'fixture-token'});
    if(String(url)==='https://www.googleapis.com/oauth2/v3/userinfo')return Response.json({sub:'fixture-google',email:'jane@example.test',email_verified:true,name:'Jane'});
    throw Error('Unexpected provider URL');
  };
  try{
    const email='jane@example.test';
    assert.equal((await requestCode.POST(request('/api/auth/email/request',{email,purpose:'signup'}))).status,200);
    const signup=await verifyCode.POST(request('/api/auth/email/verify',{email,purpose:'signup',code,password:'test-password-123',name:'Jane Rider'}));
    assert.equal(signup.status,200);const cookie=signup.headers.get('set-cookie').split(';')[0];
    assert.match(signup.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Lax/);
    const identity=await auth.getAccountIdentityFromRequest(request('/api/account',null,cookie,'GET'));assert.equal(identity.email,email);
    assert.equal((await password.POST(request('/api/auth/email/password',{email,password:'wrong-password'}))).status,401);
    const login=await password.POST(request('/api/auth/email/password',{email,password:'test-password-123'}));assert.equal(login.status,200);
    assert.equal((await rider.POST(request('/api/rider',{displayName:'Jane Rider',homeTown:'Koronadal'},cookie))).status,200);
    const old={owner:identity.id,id:'old',kind:'ride',data:JSON.stringify({id:'old',name:'Migrated ride',type:'commute',status:'complete',started:1,seconds:60,distance:1,points:[]}),updated:'2026-01-01'};
    const client={query:(sql,values)=>db.query(sql,values)};
    assert.deepEqual(await importRecords(client,[old]),{imported:1,unchanged:0});
    await db.exec(schema);assert.deepEqual(await importRecords(client,[old]),{imported:0,unchanged:1});
    await assert.rejects(importRecords(client,[{...old,id:'should-rollback'},{...old,data:'{}'}]),/conflicting/);
    assert.equal((await db.query("SELECT id FROM records WHERE id='should-rollback'")).rows.length,0);
    for(const [kind,data] of [
      ['ride',{id:'draft',name:'Phone ride',type:'commute',status:'active',started:1000,seconds:20,distance:1,points:[]}],
      ['ride',{id:'rated',name:'Rated ride',type:'adventure',status:'complete',started:1000,seconds:20,distance:1,points:[],rating:5,feedback:'Great'}],
      ['profile',{bike:'Bike',baseOdo:20,garage:{vehicles:[{id:'v',name:'Bike',type:'motorcycle',kmPerLiter:35}],activeVehicleId:'v'}}],
      ['preferences',{theme:'forest',mapStyle:'night',routeColor:'blue',fuel:true,shops:true,follow:true,onboarded:true}],
      ['inbox',{read:['update:test'],browser:false}],
    ]){assert.equal((await records.POST(request('/api/records',{kind,data},cookie))).status,200);}
    let loaded=await (await records.GET(request('/api/records',null,cookie,'GET'))).json();
    assert.equal(loaded.records.find(r=>r.id==='old').data.name,'Migrated ride');
    assert.equal(loaded.records.find(r=>r.id==='rated').data.rating,5);
    assert.equal(loaded.records.find(r=>r.kind==='profile').data.garage.vehicles[0].kmPerLiter,35);
    assert.equal((await records.DELETE(request('/api/records?id=draft',null,cookie,'DELETE'))).status,200);
    await records.DELETE(request('/api/records?id=rated',null,cookie,'DELETE'));
    loaded=await (await records.GET(request('/api/records',null,cookie,'GET'))).json();assert.ok(loaded.records.some(r=>r.id==='rated'));assert.ok(!loaded.records.some(r=>r.id==='draft'));
    assert.equal((await records.GET(request('/api/records',null,'','GET'))).status,401);
    await avatars().put('avatars/'+encodeURIComponent(identity.id),new Uint8Array([255,216,255,1]));
    const photo=await avatar.GET(request('/api/avatar',null,cookie,'GET'));assert.equal(photo.status,200);assert.deepEqual([...new Uint8Array(await photo.arrayBuffer())],[255,216,255,1]);
    assert.equal((await avatar.GET(request('/api/avatar',null,'','GET'))).status,401);
    assert.equal((await account.GET(request('/api/account',null,cookie,'GET'))).status,200);
    const oauth=await google.GET(request('/api/auth/google',null,'','GET'));assert.equal(oauth.status,303);
    const state=new URL(oauth.headers.get('location')).searchParams.get('state');assert.equal(new URL(oauth.headers.get('location')).searchParams.get('redirect_uri'),'https://lakbay.test/api/auth/google/callback');
    const result=await callback.GET(request('/api/auth/google/callback?state='+state+'&code=fixture',null,'lakbay_google_state='+state,'GET'));assert.equal(result.status,303);assert.equal(result.headers.get('location'),'https://lakbay.test/');
    const renewed=result.headers.getSetCookie().find(c=>c.startsWith('lakbay_session=')).split(';')[0];assert.equal((await auth.getAccountIdentityFromRequest(request('/api/account',null,renewed,'GET'))).id,identity.id);
    const bad=await callback.GET(request('/api/auth/google/callback?state=bad&code=fixture',null,'lakbay_google_state='+state,'GET'));assert.match(bad.headers.get('location'),/google_verify/);
    const logout=await signout.GET(request('/api/auth/signout',null,cookie,'GET'));assert.match(logout.headers.get('set-cookie'),/Max-Age=0/);
    const road={distance:1000,duration:120,geometry:{coordinates:[[124,6],[124.01,6]]},legs:[{steps:[]}]};
    global.fetch=async(url)=>{
      const host=new URL(url).hostname;
      if(host==='api.open-meteo.com')return Response.json({current:{time:1000,temperature_2m:28,weather_code:0,is_day:1},hourly:{time:[1000],temperature_2m:[28],weather_code:[0],precipitation_probability:[0]}});
      if(host==='routing.openstreetmap.de')return Response.json({code:'Ok',routes:[road],waypoints:[]});
      if(host==='photon.komoot.io')return Response.json({features:[{properties:{osm_id:1,name:'Lake'},geometry:{coordinates:[124.01,6]}}]});
      if(host==='maps.mail.ru')return Response.json({elements:[{id:1,type:'node',lat:6,lon:124,tags:{amenity:'fuel',name:'Pump'}}]});
      throw Error('Unexpected provider URL '+host);
    };
    const weather=await explore.GET(request('/api/explore?action=weather&points=6,124',null,cookie,'GET'));assert.equal(weather.status,200);assert.equal((await weather.json()).weather[0].current.temperature_2m,28);
    const planned=await explore.GET(request('/api/explore?action=route&lat=6&lng=124&toLat=6&toLng=124.01',null,cookie,'GET'));assert.equal(planned.status,200);const routeData=await planned.json();assert.equal(routeData.duration,120);assert.equal(routeData.traffic.available,false);
    assert.equal((await explore.GET(request('/api/explore?action=search&q=Lake&lat=6&lng=124',null,cookie,'GET'))).status,200);
    const nearby=await explore.GET(request('/api/explore?action=nearby&lat=6&lng=124',null,cookie,'GET'));assert.equal(nearby.status,200);assert.equal((await nearby.json()).places[0].type,'fuel');
    for(const [kind,data] of [['place',{id:'lake',name:'Lake',lat:6,lng:124.01,category:'destination',savedAt:1000}],['trip',{id:'trip',name:'Lake route',from:{lat:6,lng:124},to:{lat:6,lng:124.01},route:routeData,savedAt:1000}]])assert.equal((await records.POST(request('/api/records',{kind,data},cookie))).status,200);
    const uploaded=await avatar.POST(new Request('https://lakbay.test/api/avatar',{method:'POST',headers:{Origin:'https://lakbay.test',Cookie:cookie,'Content-Type':'image/jpeg'},body:new Uint8Array([255,216,255,2])}));assert.equal(uploaded.status,200);
    const {cached}=requireModule('../lib/explore.ts');let calls=0;
    assert.deepEqual(await cached('fixture','fixture',600000,10,async()=>{calls++;return {ok:true};}),{ok:true});
    await cached('fixture','fixture',600000,10,async()=>{calls++;return {};});assert.equal(calls,1);
    await db.query("UPDATE service_gate SET next_at='0' WHERE name='fixture'");
    await cached('fixture-2','fixture',600000,10,async()=>({ok:true}));assert.equal((await db.query("SELECT calls FROM service_gate WHERE name='fixture'")).rows[0].calls,'2');
    assert.equal((await explore.GET(request('/api/explore?action=weather&points=6,124',null,'','GET'))).status,401);
    delete process.env.DATABASE_URL;assert.throws(()=>database(),/DATABASE_URL/);
  }finally{global.fetch=originalFetch;process.env=previousEnv;await db.close();}
});
