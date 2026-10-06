import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import Module,{createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import ts from 'typescript';
import {PGlite} from '@electric-sql/pglite';
const requireModule=createRequire(import.meta.url),root=fileURLToPath(new URL('../',import.meta.url));
const resolve=Module._resolveFilename;
Module._resolveFilename=function(request,...args){return resolve.call(this,request.startsWith('@/')?path.join(root,request.slice(2)):request,...args);};
requireModule.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {levelThreshold,levelProgress,tierForXp}=requireModule('../lib/progression/levels.ts');
const {rideXp}=requireModule('../lib/progression/xp.ts');
const {TIERS}=requireModule('../lib/progression/config.ts');
const {ACHIEVEMENTS,rideTimeFlags}=requireModule('../lib/progression/achievements.ts');
const fixture=(id,extra={})=>({id,name:'Safe commute',type:'commute',status:'complete',started:Date.parse('2026-10-06T06:00:00+08:00'),seconds:1200,distance:10,points:[{lat:6,lng:124,t:1},{lat:6.01,lng:124.01,t:1000}],...extra});
test('quadratic XP levels and all seven tier transitions',()=>{
  for(let level=1;level<=100;level++){const threshold=levelThreshold(level);assert.equal(levelProgress(threshold).level,level);if(level>1)assert.equal(levelProgress(threshold-1).level,level-1);assert.equal(levelProgress(threshold).percent,0);assert.ok(levelProgress(threshold).xpNeeded>0);}
  for(const tier of TIERS){assert.equal(tierForXp(tier.xp).name,tier.name);if(tier.xp)assert.notEqual(tierForXp(tier.xp-1).name,tier.name);}
  assert.equal(tierForXp(100000).name,'Godlike');assert.equal(levelProgress(-20).totalXp,0);
});
test('XP excludes speed and acceleration, caps distance and requires pauses for long bonuses',()=>{
  assert.equal(rideXp(fixture('r')),60);
  assert.equal(rideXp(fixture('r',{distance:1000})),100);
  assert.equal(rideXp(fixture('r',{distance:50,seconds:7201})),50);
  assert.equal(rideXp(fixture('r',{distance:50,seconds:7201,points:[{break:true},{break:true}]})),100);
  assert.equal(rideXp(fixture('r',{status:'active'})),0);
  assert.equal(rideXp(fixture('r',{distance:0})),0);
  assert.equal(rideXp(fixture('r',{speed:999,acceleration:999})),60);
  assert.deepEqual(rideTimeFlags(Date.parse('2026-10-10T07:00:00+08:00')),{early:true,weekend:true,night:false});
});
test('actual PostgreSQL ledger is additive, isolated, persistent and replay-safe',async()=>{
  const db=new PGlite();const initial=fs.readFileSync(new URL('../db/postgres/001_initial.sql',import.meta.url),'utf8'),additive=fs.readFileSync(new URL('../db/postgres/002_progression.sql',import.meta.url),'utf8');
  await db.exec(initial);await db.exec(additive);
  requireModule.cache[requireModule.resolve('pg')]={exports:{Pool:class{on(){} query(sql,values){return db.query(sql,values);}async connect(){return {query:(sql,values)=>sql.includes('pg_advisory_xact_lock')?Promise.resolve({rows:[]}):db.query(sql,values),release(){}};}}}};
  const previous=process.env.DATABASE_URL;process.env.DATABASE_URL='postgresql://fixture.invalid/test';
  const {transaction}=requireModule('../lib/storage.ts'),{reconcileProgression}=requireModule('../lib/progression/repository.ts'),{claimUnlocks,awardOnce}=requireModule('../lib/progression/ledger.ts');
  const owner='existing-rider';const save=async(kind,data)=>{await db.query('INSERT INTO records(owner,id,kind,data,updated) VALUES($1,$2,$3,$4,$5) ON CONFLICT(owner,id) DO UPDATE SET data=excluded.data',[owner,data.id||kind,kind,JSON.stringify(data),'2026-10-06']);};
  const reconcile=()=>transaction(owner,db=>reconcileProgression(db,owner));
  try{
    await save('ride',fixture('old'));await save('preferences',{id:'preferences',theme:'forest'});
    const original=(await db.query("SELECT data FROM records WHERE id='old'")).rows[0].data;
    const oldState=await reconcile();assert.ok(oldState.achievements.includes('first-ride'));assert.equal(oldState.stats.rides,1);
    assert.equal((await transaction(owner,db=>claimUnlocks(db,owner))).length,0,'historical backfill is silent');
    assert.deepEqual(await reconcile(),oldState,'reloading cannot award XP again');
    await save('ride',fixture('old',{rating:5,feedback:'Great',distance:999,destination:{lat:10,lng:100}}));
    const rated=await reconcile();assert.equal(rated.totalXp,oldState.totalXp+5);assert.equal(rated.stats.distanceKm,10,'a later rating cannot increase old ride XP or distance');
    assert.equal(rated.stats.destinations,0,'editing a completed ride cannot farm new destination XP');assert.deepEqual(await reconcile(),rated);
    for(let i=2;i<=5;i++)await save('ride',fixture('r'+i));
    let state=await reconcile();assert.equal(state.stats.rides,5);assert.ok(state.achievements.includes('five-rides'));
    const unlocks=await transaction(owner,db=>claimUnlocks(db,owner));assert.ok(unlocks.some(u=>u.name==='5 Rides Completed'));
    assert.equal((await transaction(owner,db=>claimUnlocks(db,owner))).length,0,'popup cannot be repeated');
    const xp=state.totalXp;await save('ride',fixture('sixth'));state=await reconcile();assert.equal(state.totalXp,xp,'sixth ride in one day gets no base/distance XP');
    await save('ride',fixture('tomorrow',{started:Date.parse('2026-10-07T10:00:00+08:00'),destination:{lat:6.5,lng:124.8,name:'Lake'}}));
    state=await reconcile();assert.equal(state.totalXp,xp+60+20+15,'ride, discovery and day streak');assert.deepEqual(await reconcile(),state);
    for(const [id,lat] of [['lake-2',7],['lake-3',8]])await save('ride',fixture(id,{started:Date.parse('2026-10-08T10:00:00+08:00'),destination:{lat,lng:124.8}}));
    await save('service',{id:'oil',name:'Oil',last:100,interval:1000,date:'2026-10-06'});
    await save('profile',{bike:'Bike',baseOdo:0,garage:{vehicles:[{id:'v',name:'Bike',type:'motorcycle',kmPerLiter:35}]}});
    state=await reconcile();assert.ok(state.achievements.includes('explorer'));assert.ok(state.achievements.includes('maintenance'));assert.ok(state.achievements.includes('prepared'));assert.deepEqual(await reconcile(),state);
    await save('service',{id:'oil',name:'Oil',last:100,interval:2000,date:'2026-10-06'});assert.deepEqual(await reconcile(),state,'editing intervals does not award service XP again');
    await save('service',{id:'oil',name:'Oil',last:1100,interval:2000,date:'2026-11-06'});const serviced=await reconcile();assert.equal(serviced.totalXp,state.totalXp+25);
    await db.exec(additive);await db.exec(initial);assert.deepEqual(await reconcile(),serviced,'migration replay preserves progression');
    assert.equal((await db.query("SELECT data FROM records WHERE id='preferences'")).rows[0].data,JSON.stringify({id:'preferences',theme:'forest'}));
    assert.ok(original.includes('Safe commute'));
    const other=await transaction('other',db=>reconcileProgression(db,'other'));assert.equal(other.totalXp,0);assert.equal(other.stats.rides,0);
    const dup=await transaction(owner,async db=>Promise.all([awardOnce(db,owner,'fixture:duplicate',10,{type:'test'}),awardOnce(db,owner,'fixture:duplicate',10,{type:'test'})]));assert.equal(dup.filter(Boolean).length,1);
    await assert.rejects(transaction(owner,async db=>{await awardOnce(db,owner,'fixture:rollback',10,{type:'test'});throw Error('fixture rollback');}),/fixture rollback/);
    assert.equal((await db.query("SELECT * FROM progression_events WHERE event_key='fixture:rollback'")).rows.length,0);
    for(const achievement of ACHIEVEMENTS)assert.ok(achievement.xp>=0);
  }finally{if(previous===undefined)delete process.env.DATABASE_URL;else process.env.DATABASE_URL=previous;await db.close();}
});
