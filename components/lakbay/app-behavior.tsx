'use client';

import {useEffect} from 'react';
import {toast} from 'sonner';

const LOW_FUEL_SOUND='/sounds/low-fuel-warning.mp3';
const EXIT_WINDOW_MS=2200;
const LOW_FUEL_REPEAT_MS=5*60*1000;
const SEARCH_MAX=400;
type SearchPlace={name?:string;photoUrl?:string;rating?:number;ratingCount?:number;placeType?:string;provider?:string};

function visibleDialogs(){return [...document.querySelectorAll<HTMLElement>('[role="dialog"]')].filter(el=>el.offsetParent!==null);}
function activeMainTab(){const active=document.querySelector<HTMLElement>('.nav [role="tab"][data-state="active"]');return active?.textContent?.trim()||null;}
function goToMainTab(label:string|null){if(!label)return;const target=[...document.querySelectorAll<HTMLElement>('.nav [role="tab"]')].find(el=>el.textContent?.trim()===label);target?.click();}
function closeTopDialog(){const dialogs=visibleDialogs();const dialog=dialogs.at(-1);if(!dialog)return false;const close=dialog.querySelector<HTMLButtonElement>('button[aria-label="Close"],button[data-radix-dialog-close]');if(close)close.click();else document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true}));return true;}
function fuelSeverity(text:string){const value=text.toLowerCase();if(value.includes('insufficient estimated fuel'))return 3;if(value.includes('refuel recommended'))return 2;if(value.includes('fuel may be low'))return 1;return 0;}

export default function AppBehavior(){
  useEffect(()=>{
    let replaying=false,leaving=false,lastTab=activeMainTab(),dialogCount=visibleDialogs().length,lastExitBack=0,lastFuelAlert=0,lastFuelSeverity=0,lastRiding=false;
    const placeDetails=new Map<string,SearchPlace>();
    history.replaceState({...history.state,lakbayRoot:true},'');
    history.pushState({lakbayGuard:true,tab:lastTab||'Ride'},'');

    const sound=new Audio(LOW_FUEL_SOUND);sound.preload='auto';sound.volume=.95;
    const originalFetch=window.fetch.bind(window);
    window.fetch=(async(input:RequestInfo|URL,init?:RequestInit)=>{
      let url=typeof input==='string'?input:input instanceof URL?input.toString():input.url;
      try{
        const parsed=new URL(url,location.origin);
        if(parsed.origin===location.origin&&parsed.pathname==='/api/explore'&&parsed.searchParams.get('action')==='search'){
          parsed.pathname='/api/place-search';parsed.searchParams.delete('action');url=parsed.pathname+parsed.search;
          const response=await originalFetch(url,init);
          if(response.ok){
            response.clone().json().then((data:{places?:SearchPlace[]})=>{
              placeDetails.clear();
              for(const place of data.places||[])if(place.name)placeDetails.set(place.name.trim().toLowerCase(),place);
              requestAnimationFrame(enhanceSearch);
            }).catch(()=>{});
          }
          return response;
        }
      }catch{}
      return originalFetch(input,init);
    }) as typeof window.fetch;

    function enhanceSearch(){
      document.querySelectorAll<HTMLInputElement>('.destination-search input').forEach(input=>{if(input.maxLength!==SEARCH_MAX)input.maxLength=SEARCH_MAX;});
      document.querySelectorAll<HTMLButtonElement>('.place-results button').forEach(button=>{
        const strong=button.querySelector('strong');const name=strong?.textContent?.trim().toLowerCase();if(!name)return;
        const place=placeDetails.get(name);if(!place)return;
        if(place.photoUrl&&!button.querySelector('.place-result-photo')){
          const img=document.createElement('img');img.className='place-result-photo';img.src=place.photoUrl;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.onerror=()=>img.remove();button.prepend(img);
        }
        const span=strong?.parentElement;
        if(span&&!span.querySelector('.place-result-meta')&&(place.rating||place.placeType)){
          const meta=document.createElement('small');meta.className='place-result-meta';
          const bits=[] as string[];if(place.placeType)bits.push(place.placeType);if(place.rating)bits.push(`★ ${place.rating.toFixed(1)}${place.ratingCount?` (${place.ratingCount.toLocaleString()})`:''}`);if(place.provider==='google')bits.push('Google Places');meta.textContent=bits.join(' · ');span.append(meta);
        }
      });
    }

    function playLowFuel(text:string,severity:number){const now=Date.now();if(severity<=0)return;if(severity<=lastFuelSeverity&&now-lastFuelAlert<LOW_FUEL_REPEAT_MS)return;lastFuelAlert=now;lastFuelSeverity=severity;try{sound.currentTime=0;void sound.play().catch(()=>{});}catch{}navigator.vibrate?.([80,60,80]);toast.warning(severity>=3?'Fuel may not be enough':'Fuel is getting low',{description:text||'Consider a safe fuel stop soon.'});}
    function checkFuel(){const guidance=document.querySelector<HTMLElement>('.route-guidance');const guidanceText=guidance?.textContent||'';const riding=!!guidance&&!/route preview/i.test(guidanceText);const fuel=document.querySelector<HTMLElement>('.fuel-glance');const text=fuel?.textContent?.trim()||'';const severity=fuelSeverity(text);if(!riding){if(lastRiding)lastFuelSeverity=0;lastRiding=false;return;}lastRiding=true;if(severity===0){lastFuelSeverity=0;return;}playLowFuel(text,severity);}
    function syncHistory(){enhanceSearch();const tab=activeMainTab();if(tab&&tab!==lastTab){lastTab=tab;if(!replaying)history.pushState({lakbayView:true,tab},'');}const nextDialogCount=visibleDialogs().length;if(nextDialogCount>dialogCount&&!replaying)history.pushState({lakbayOverlay:true,tab:activeMainTab()||'Ride'},'');dialogCount=nextDialogCount;checkFuel();}

    enhanceSearch();
    const observer=new MutationObserver(syncHistory);observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['data-state','class','role','maxlength']});
    const fuelTimer=window.setInterval(checkFuel,1500);
    function onPopState(event:PopStateEvent){if(leaving)return;const state=event.state||{};if(closeTopDialog()){dialogCount=Math.max(0,dialogCount-1);return;}if(state.lakbayView||state.lakbayGuard||state.lakbayOverlay){replaying=true;goToMainTab(state.tab||'Ride');lastTab=state.tab||activeMainTab()||lastTab;lastExitBack=0;requestAnimationFrame(()=>{replaying=false;syncHistory();});return;}if(state.lakbayRoot){const now=Date.now();if(now-lastExitBack<=EXIT_WINDOW_MS){leaving=true;history.back();return;}lastExitBack=now;toast('Press Back again to exit Lakbay');history.pushState({lakbayGuard:true,tab:activeMainTab()||'Ride'},'');}}
    window.addEventListener('popstate',onPopState);
    return()=>{window.fetch=originalFetch;observer.disconnect();window.clearInterval(fuelTimer);window.removeEventListener('popstate',onPopState);sound.pause();};
  },[]);
  return null;
}
