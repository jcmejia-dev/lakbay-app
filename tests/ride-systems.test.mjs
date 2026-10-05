import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
const loadModule=createRequire(import.meta.url);
// Test the actual TypeScript modules with the compiler already installed by the app.
loadModule.extensions['.ts']=(module,file)=>module._compile(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,file);
const {fuelEstimate}=loadModule('../lib/fuel.ts');
const {ArrivalGate,arrivalCandidate}=loadModule('../lib/arrival.ts');
const {recommendFuel,visiblePois}=loadModule('../lib/route-pois.ts');
const {ride,profile}=loadModule('../lib/record-schemas.ts');
const {fetchWeather,forecastAt}=loadModule('../lib/weather.ts');
test('fuel examples, reserve margins and invalid input',()=>{
  const result=fuelEstimate(3.5,35,82);
  assert.equal(result.range,122.5);assert.ok(Math.abs(result.needed-2.342857)<.00001);assert.ok(Math.abs(result.remaining-1.157142)<.00001);
  assert.equal(fuelEstimate(1,35,35).status,'Refuel recommended');
  assert.equal(fuelEstimate(1,35,36).status,'Insufficient estimated fuel');
  assert.equal(fuelEstimate(4,35,35).status,'Enough fuel');
  assert.equal(fuelEstimate(1.8,35,35).status,'Fuel may be low');
  for(const args of [[-1,35,2],[1,0,2],[1,-1,2],[NaN,35,2],[1,35,-2],[10,35,2,5]])assert.equal(fuelEstimate(...args),null);
  assert.equal(fuelEstimate(0,35,10).range,0);
});
test('arrival requires fresh accurate samples and confirmation; fires once per ride',()=>{
  const gate=new ArrivalGate(),destination={lat:6,lng:124},ride={id:'a',started:1000,distance:.2};
  const point=t=>({lat:6,lng:124,t,accuracy:10});
  assert.equal(gate.check(ride,point(2000),destination,2000),false);
  assert.equal(gate.check(ride,point(2000),destination,7000),false); // Same GPS fix is not confirmation.
  assert.equal(gate.check(ride,point(7000),destination,7000),true);
  assert.equal(gate.check(ride,point(12000),destination,12000),false);
  assert.equal(gate.check({...ride,id:'b'},point(20000),destination,20000),false);
  assert.equal(gate.check({...ride,id:'b'},point(25000),destination,25000),true);
  gate.retry();assert.equal(gate.check(ride,{...point(30000),accuracy:50},destination,30000),false);
  assert.equal(arrivalCandidate(point(1000),destination,1000,20000),false);
  assert.equal(arrivalCandidate({...point(30000),lat:6.001},destination,1000,30000),false);
  assert.equal(gate.check({...ride,distance:0},point(30000),destination,30000),false);
});
const route={coordinates:[[124,6],[124.1,6]],distance:11000,duration:1000,steps:[],snaps:[],createdAt:1};
const poi=(id,lng,lat=6,type='fuel')=>({id,name:id,type,lng,lat,address:'',hours:null});
test('refuel choices exclude stations behind, far from route and out of range',()=>{
  const pois=[poi('behind',124.01),poi('ahead',124.06),poi('far',124.06,6.03),poi('end',124.1),poi('shop',124.055,6,'shop')];
  assert.deepEqual(recommendFuel(route,pois,{lat:6,lng:124.05},3).map(p=>p.id),['ahead']);
  assert.equal(recommendFuel(route,pois,{lat:6,lng:124.05},0).length,0);
  assert.equal(visiblePois(pois,route,{lat:6,lng:124.05},10,true).length,0);
  assert.ok(!visiblePois(pois,route,{lat:6,lng:124.05},14,true).some(p=>p.id==='behind'));
  assert.ok(visiblePois(pois,route,{lat:6,lng:124.05},10,true,['ahead']).some(p=>p.id==='ahead'));
});
test('old records remain valid; ratings and vehicles survive validation and JSON storage',()=>{
  const old={id:'r',name:'Ride',type:'commute',status:'complete',started:1,seconds:60,distance:1,points:[]};
  assert.deepEqual(ride.parse(old),old);
  const rated={...old,rating:5,feedback:'Great roads',destination:{lat:6,lng:124,name:'Lake'},arrivedAt:5000};
  assert.deepEqual(ride.parse(JSON.parse(JSON.stringify(rated))),rated);
  assert.equal(ride.safeParse({...old,rating:6}).success,false);
  assert.deepEqual(profile.parse({bike:'Old bike',baseOdo:42}),{bike:'Old bike',baseOdo:42});
  const vehicle={id:'v',name:'Bike',type:'motorcycle',kmPerLiter:35};
  const data={bike:'Old bike',baseOdo:42,garage:{vehicles:[vehicle],activeVehicleId:'v'}};
  assert.deepEqual(profile.parse(JSON.parse(JSON.stringify(data))),data);
  assert.equal(profile.safeParse({...data,garage:{vehicles:[{...vehicle,kmPerLiter:0}]}}).success,false);
  assert.equal(profile.safeParse({...data,garage:{vehicles:[vehicle],activeVehicleId:'missing'}}).success,false);
});
test('weather requests deduplicate, cache and recover from failure; forecast uses ETA',async()=>{
  const original=global.fetch;let count=0;
  const point={lat:6,lng:124,current:{time:1000,temperature_2m:28,precipitation:0,weather_code:0,wind_speed_10m:2},hourly:{time:[1000,4600],temperature_2m:[28,25],weather_code:[0,61],precipitation_probability:[0,70],precipitation:[0,1]}};
  const data={fetchedAt:Date.now(),weather:[point]};
  try{
    global.fetch=async()=>{count++;await new Promise(r=>setTimeout(r,5));return {ok:true,json:async()=>data};};
    await Promise.all([fetchWeather('6,124'),fetchWeather('6,124')]);await fetchWeather('6,124');assert.equal(count,1);
    assert.equal(forecastAt(point,4600000).rain,70);assert.equal(forecastAt(point,100000000),null);
    global.fetch=async()=>({ok:false});await assert.rejects(fetchWeather('7,124'));
    global.fetch=async()=>({ok:true,json:async()=>data});assert.deepEqual(await fetchWeather('7,124'),data);
    global.fetch=async()=>({ok:true,json:async()=>({fetchedAt:Date.now(),weather:[{current:{},hourly:{}}]})});await assert.rejects(fetchWeather('8,124'));
  }finally{global.fetch=original;}
});
