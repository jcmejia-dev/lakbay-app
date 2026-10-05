'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {explore,Location,Poi} from '@/lib/navigation';

type Area={places:Poi[];center:Location;updatedAt:number;source:string};
// Match the server's shared cache cells; GPS jitter must not restart searches.
export function areaKey(p:Location){return `${Math.round(p.lat*20)/20},${Math.round(p.lng*20)/20}`;}
export function useNearby(center:Location,position:Location|null,destination:Location|null){
 const keys=[...new Set([center,position,destination].filter((p):p is Location=>!!p).map(areaKey))].join(';');
 const cache=useRef(new Map<string,Area>()),pending=useRef(new Map<string,Promise<Area>>());
 const [areas,setAreas]=useState<Area[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let active=true;
  const wanted=keys.split(';');
  setAreas(wanted.flatMap(key=>cache.current.has(key)?[cache.current.get(key)!]:[]));
  setError('');setBusy(wanted.some(key=>!cache.current.has(key)));
  // Wait until the map settles before requesting a new area.
  const timer=setTimeout(async()=>{
   const errors:string[]=[];
   for(const key of wanted){
    if(!active)return;
    if(!cache.current.has(key)){
     let request=pending.current.get(key);
     if(!request){
      const [lat,lng]=key.split(',').map(Number);
      request=explore('nearby',{lat,lng}).then((data:Area)=>{
       cache.current.set(key,data);
       if(cache.current.size>12)cache.current.delete(cache.current.keys().next().value!);
       return data;
      }).finally(()=>pending.current.delete(key));
      pending.current.set(key,request);
     }
     try{await request;}catch(e){errors.push(e instanceof Error?e.message:'Nearby stops could not load.');}
    }
    if(!active)return;
    setAreas(wanted.flatMap(k=>cache.current.has(k)?[cache.current.get(k)!]:[]));
    // Respect the shared provider's request spacing when loading several areas.
    if(key!==wanted.at(-1))await new Promise(resolve=>setTimeout(resolve,1200));
   }
   if(active){setError(errors.length?'Some nearby stops could not load. '+errors[0]:'');setBusy(false);}
  },1200);
  return()=>{active=false;clearTimeout(timer);};
 },[keys,retry]);
 const places=useMemo(()=>[...new Map(areas.flatMap(a=>a.places).map(p=>[p.id,p])).values()],[areas]);
 return {places,busy,error,updatedAt:areas.length?Math.min(...areas.map(a=>a.updatedAt)):0,source:[...new Set(areas.map(a=>a.source))].join(' · '),refresh:()=>{for(const key of keys.split(';'))cache.current.delete(key);setRetry(n=>n+1);}};
}
