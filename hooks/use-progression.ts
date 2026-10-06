'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {toast} from 'sonner';
import type {Progression,Unlock} from '@/lib/progression/types';
export function useProgression(owner:string){
  const [progression,setProgression]=useState<Progression|null>(null),[error,setError]=useState('');
  const inFlight=useRef<Promise<void>|null>(null),refreshAgain=useRef(false);
  const refresh=useCallback(()=>{
    if(!owner)return Promise.resolve();
    if(inFlight.current){refreshAgain.current=true;return inFlight.current;}
    const request=(async()=>{
      try{
        const response=await fetch('/api/progression',{cache:'no-store'});
        if(!response.ok)throw Error('Progression is waiting for a connection.');
        const data=await response.json() as {progression:Progression};setProgression(data.progression);setError('');
        const claimed=await fetch('/api/progression',{method:'POST'});
        if(!claimed.ok)return;
        const {unlocks}=await claimed.json() as {unlocks:Unlock[]};
        for(const unlock of unlocks)toast.success(`${unlock.type==='tier'?'New rider tier':'Achievement unlocked'} · ${unlock.name}`,{id:unlock.key,description:unlock.detail+(unlock.xp?` +${unlock.xp} XP`:''),duration:5000});
      }catch{setError('Progression is waiting for a connection. Your rides are still available.');}
    })().finally(()=>{inFlight.current=null;if(refreshAgain.current){refreshAgain.current=false;window.dispatchEvent(new Event('lakbay:records-synced'));}});
    inFlight.current=request;return request;
  },[owner]);
  useEffect(()=>{void refresh();const update=()=>void refresh();window.addEventListener('online',update);window.addEventListener('lakbay:records-synced',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('lakbay:records-synced',update);};},[refresh]);
  return {progression,error,refresh};
}
