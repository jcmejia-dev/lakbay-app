export type WeatherState='sunny'|'partly-cloudy'|'cloudy'|'rainy'|'heavy-rain'|'windy'|'thunderstorm'|'snowy'|'unknown';
export function weatherState(code:number|null,wind:number|null=0,precipitation:number|null=0):WeatherState {
  if(code===null||!Number.isFinite(code))return 'unknown';
  if(code>=95)return 'thunderstorm';
  if([65,67,82].includes(code)||(precipitation||0)>=3)return 'heavy-rain';
  if((code>=71&&code<=77)||code===85||code===86)return 'snowy';
  if(code>=51)return 'rainy';
  if((wind||0)>=25)return 'windy';
  if(code===0)return 'sunny';if(code<=2)return 'partly-cloudy';return 'cloudy';
}
export default function WeatherIcon({code,wind=0,precipitation=0,night=false}:{code:number|null;wind?:number|null;precipitation?:number|null;night?:boolean}) {
  const state=weatherState(code,wind,precipitation),cloud=state!=='sunny'&&state!=='unknown'&&state!=='windy';
  return <svg className={`animated-weather weather-${state}${night?' weather-night':''}`} data-weather-state={state} viewBox="0 0 40 40" aria-hidden="true">
    {(state==='sunny'||state==='partly-cloudy')&&(night?<path className="weather-moon" d="M25 4a12 12 0 1 0 8 20A12 12 0 0 1 25 4Z"/>:<g className="weather-sun"><circle cx="17" cy="16" r="7"/><path d="M17 3v3m0 20v3M4 16h3m20 0h3M8 7l2 2m14 14 2 2M8 25l2-2M24 9l2-2"/></g>)}
    {cloud&&<path className="weather-cloud" d="M9 27h22a6 6 0 0 0 0-12 9 9 0 0 0-17-2 7 7 0 0 0-5 14Z"/>}
    {(state==='rainy'||state==='heavy-rain'||state==='thunderstorm')&&<g className="weather-rain"><path d="m12 29-2 5m12-5-2 5m12-5-2 5"/></g>}
    {state==='snowy'&&<g className="weather-rain"><circle cx="12" cy="32" r="1"/><circle cx="22" cy="35" r="1"/><circle cx="31" cy="31" r="1"/></g>}
    {state==='heavy-rain'&&<path className="weather-rain rain-second" d="m16 30-2 6m12-6-2 6"/>}
    {state==='thunderstorm'&&<path className="weather-lightning" d="m23 23-7 9h6l-3 7 10-12h-7Z"/>}
    {state==='windy'&&<g className="weather-wind"><path d="M4 12h23c7 0 7-8 1-8M4 20h31M4 28h21c7 0 7 8 1 8"/></g>}
    {state==='unknown'&&<path className="weather-cloud" d="M9 27h22a6 6 0 0 0 0-12 9 9 0 0 0-17-2 7 7 0 0 0-5 14Z"/>}
  </svg>;
}
