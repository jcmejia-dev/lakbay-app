export type WeatherPoint={lat:number;lng:number;current:{is_day?:number|null;time:number;temperature_2m:number|null;precipitation:number|null;weather_code:number|null;wind_speed_10m:number|null};hourly:{is_day?:Array<number|null>;wind_speed_10m?:Array<number|null>;time:number[];temperature_2m?:Array<number|null>;precipitation_probability:Array<number|null>;precipitation:Array<number|null>;weather_code:Array<number|null>}};
export type Weather={fetchedAt:number;weather:WeatherPoint[]};
export const WEATHER_REFRESH_MS=600000;
const cache=new Map<string,Weather>(),pending=new Map<string,Promise<Weather>>();
export async function fetchWeather(key:string):Promise<Weather> {
  const existing=cache.get(key);if(existing&&Date.now()-existing.fetchedAt<WEATHER_REFRESH_MS)return existing;
  const active=pending.get(key);if(active)return active;
  const request=(async()=>{const r=await fetch('/api/explore?'+new URLSearchParams({action:'weather',points:key}),{signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Weather temporarily unavailable');const data:Weather=await r.json();if(!Array.isArray(data.weather)||!data.weather.length||!Number.isFinite(data.fetchedAt)||data.weather.some(p=>!p.current||!p.hourly||!Array.isArray(p.hourly.time)||!Array.isArray(p.hourly.weather_code)||!Array.isArray(p.hourly.precipitation_probability)))throw Error('Weather unavailable');cache.set(key,data);if(cache.size>20)cache.delete(cache.keys().next().value!);return data;})().finally(()=>pending.delete(key));
  pending.set(key,request);return request;
}
export function weatherName(code:number|null){if(code===null||!Number.isFinite(code))return 'Unavailable';if(code===0)return 'Clear';if(code<=3)return 'Cloudy';if(code<=48)return 'Fog';if(code<=57)return 'Drizzle';if(code<=67)return 'Rain';if(code<=77)return 'Snow';if(code<=82)return 'Showers';if(code<=86)return 'Snow showers';return 'Thunderstorms';}
export function forecastAt(point:WeatherPoint,at:number) {
  let index=-1,diff=Infinity;point.hourly.time.forEach((time,i)=>{const d=Math.abs(time*1000-at);if(d<diff){index=i;diff=d;}});
  if(index<0||diff>3600000)return null;
  return {temperature:point.hourly.temperature_2m?.[index]??point.current.temperature_2m,code:point.hourly.weather_code[index]??null,rain:point.hourly.precipitation_probability[index]??null,night:point.hourly.is_day?.[index]===0,wind:point.hourly.wind_speed_10m?.[index]??null};
}
