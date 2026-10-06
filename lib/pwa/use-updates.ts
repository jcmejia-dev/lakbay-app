'use client';
import {useEffect,useRef,useState} from 'react';
import {registerWorker} from '../notifications/client';
import {workerRequest} from './messages';
import generated from './generated-release.json';
export function useUpdates(ready:boolean,hasRide:()=>boolean,prepare:()=>Promise<void>){
  const [waiting,setWaiting]=useState<ServiceWorker|null>(null),[version,setVersion]=useState(''),[applying,setApplying]=useState(false);
  const current=useRef({hasRide,prepare});useEffect(()=>{current.current={hasRide,prepare};},[hasRide,prepare]);const chosen=useRef(false),safe=useRef(false);
  useEffect(()=>{if(!ready||!('serviceWorker' in navigator))return;let disposed=false,registration:ServiceWorkerRegistration|undefined;const cleanups:(()=>void)[]=[];
    const inspect=async()=>{const worker=registration?.waiting;if(!worker)return;try{const result=await workerRequest(worker,{type:'GET_VERSION'});if(!disposed&&result.version&&navigator.serviceWorker.controller){setWaiting(worker);setVersion(result.version);window.dispatchEvent(new Event('lakbay:refresh-notifications'));}}catch{}};
    const message=(event:MessageEvent)=>{if(event.data?.type==='PREPARE_UPDATE')event.source?.postMessage({type:'UPDATE_READY',requestId:event.data.requestId,safe:(!current.current.hasRide()||safe.current)});};
    const changed=()=>{if(chosen.current&&safe.current)window.location.reload();else if(navigator.serviceWorker.controller){const worker=navigator.serviceWorker.controller;workerRequest(worker,{type:'GET_VERSION'}).then(result=>{if(!disposed&&result.version&&result.version!==generated.id){setWaiting(worker);setVersion(result.version);window.dispatchEvent(new Event('lakbay:refresh-notifications'));}}).catch(()=>{});}};
    navigator.serviceWorker.addEventListener('message',message);navigator.serviceWorker.addEventListener('controllerchange',changed);
    registerWorker().then(r=>{if(disposed)return;registration=r;inspect();const updatefound=()=>{const worker=r.installing;if(!worker)return;const state=()=>{if(worker.state==='installed')inspect();};worker.addEventListener('statechange',state);cleanups.push(()=>worker.removeEventListener('statechange',state));};r.addEventListener('updatefound',updatefound);cleanups.push(()=>r.removeEventListener('updatefound',updatefound));r.update().catch(()=>{});}).catch(()=>{});
    const check=()=>{if(document.visibilityState==='visible')registration?.update().catch(()=>{});};document.addEventListener('visibilitychange',check);const timer=setInterval(check,300000);
    return()=>{disposed=true;clearInterval(timer);cleanups.forEach(fn=>fn());document.removeEventListener('visibilitychange',check);navigator.serviceWorker.removeEventListener('message',message);navigator.serviceWorker.removeEventListener('controllerchange',changed);};
  },[ready]);
  async function apply(){if(!waiting)return;setApplying(true);try{
    await current.current.prepare();safe.current=true;
    // Another tab may already have activated the worker; our page still needs a safe reload.
    if(waiting===navigator.serviceWorker.controller){window.location.reload();return;}
    chosen.current=true;const result=await workerRequest(waiting,{type:'ACTIVATE_UPDATE'},6000);if(!result.ok){chosen.current=false;safe.current=false;throw Error(result.error||'Could not activate the update.');}
    // Reload happens only on controllerchange, after the new worker is active.
  }catch(error){chosen.current=false;safe.current=false;setApplying(false);throw error;}}
  return {available:!!waiting,version,applying,apply};
}
